"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  validateCashMovement,
  validateCloseCashSession,
  validateOpenCashSession,
  type CashFieldErrors,
  type CashMovementInput,
  type CloseCashSessionInput,
  type OpenCashSessionInput,
} from "@/lib/cash-register";
import { toSafeNumber } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  error?: string;
  fieldErrors?: CashFieldErrors;
  ok: boolean;
};

type SupabaseActionError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

async function getActiveBusiness() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Tu sesión expiró. Inicia sesión nuevamente.", supabase };
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (businessError || !business) {
    return { error: "No encontramos el negocio activo.", supabase };
  }

  return { business, supabase };
}

function logCashError(scope: string, error: SupabaseActionError) {
  console.error(`${scope} failed`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });
}

function mapCashError(error: SupabaseActionError) {
  const normalized = `${error.code || ""} ${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();

  if (normalized.includes("usuario no autenticado")) return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (normalized.includes("no tienes permiso")) return "No tienes permiso para modificar la caja de este negocio.";
  if (normalized.includes("ya existe una caja abierta")) return "Ya existe una caja abierta.";
  if (normalized.includes("no hay caja abierta")) return "No hay caja abierta.";
  if (normalized.includes("ya fue cerrada")) return "Esta caja ya fue cerrada.";
  if (normalized.includes("negativo")) return "El valor no puede ser negativo.";
  if (normalized.includes("valor")) return "Ingresa el valor.";
  if (normalized.includes("tipo de movimiento")) return "Selecciona un tipo de movimiento.";
  if (normalized.includes("motivo")) return "Selecciona un motivo.";
  if (normalized.includes("método de pago")) return "Selecciona un método de pago.";
  if (error.code === "42501" || normalized.includes("row-level security")) {
    return "Supabase bloqueó la operación por permisos. Revisa que el negocio pertenezca a tu cuenta.";
  }

  return "No pudimos guardar la caja. Intenta nuevamente.";
}

export async function openCashSession(input: OpenCashSessionInput): Promise<ActionResult> {
  const validation = validateOpenCashSession(input);

  if (!validation.ok) {
    return validation;
  }

  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const { error } = await supabase.rpc("open_cash_session", {
    p_business_id: business.id,
    p_opening_cash_amount: toSafeNumber(input.openingCashAmount),
    p_opening_notes: input.openingNotes,
  });

  if (error) {
    logCashError("openCashSession", error);
    return { error: mapCashError(error), ok: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/caja");
  redirect("/app/caja");
}

export async function createCashMovement(input: CashMovementInput): Promise<ActionResult> {
  const validation = validateCashMovement(input);

  if (!validation.ok) {
    return validation;
  }

  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const { data: session } = await supabase
    .from("cash_sessions")
    .select("id")
    .eq("business_id", business.id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (!session) {
    return { error: "No hay caja abierta.", ok: false };
  }

  const { error } = await supabase.rpc("create_cash_movement", {
    p_amount: toSafeNumber(input.amount),
    p_business_id: business.id,
    p_category: input.category,
    p_description: input.description,
    p_direction: input.direction,
    p_movement_type: input.movementType,
    p_occurred_at: input.occurredAt ? new Date(input.occurredAt).toISOString() : null,
    p_payment_method: input.paymentMethod,
    p_session_id: session.id,
  });

  if (error) {
    logCashError("createCashMovement", error);
    return { error: mapCashError(error), ok: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/caja");
  redirect("/app/caja");
}

export async function closeCashSession(input: CloseCashSessionInput): Promise<ActionResult> {
  const validation = validateCloseCashSession(input);

  if (!validation.ok) {
    return validation;
  }

  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const { data, error } = await supabase.rpc("close_cash_session", {
    p_business_id: business.id,
    p_closing_notes: input.closingNotes,
    p_counts: input.counts.map((count) => ({
      counted_amount: toSafeNumber(count.countedAmount),
      payment_method: count.paymentMethod,
    })),
    p_session_id: input.sessionId,
  });

  if (error) {
    logCashError("closeCashSession", error);
    return { error: mapCashError(error), ok: false };
  }

  const sessionId = typeof data === "string" ? data : input.sessionId;

  revalidatePath("/app");
  revalidatePath("/app/caja");
  revalidatePath(`/app/caja/sesiones/${sessionId}`);
  redirect(`/app/caja/sesiones/${sessionId}`);
}
