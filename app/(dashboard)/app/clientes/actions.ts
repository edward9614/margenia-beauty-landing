"use server";

import { revalidatePath } from "next/cache";
import {
  normalizeTags,
  nullableText,
  validateCustomerInput,
  type CustomerFormInput,
} from "@/lib/customers";
import { createClient } from "@/lib/supabase/server";

export type CustomerActionResult = {
  customerId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  ok: boolean;
};

type SupabaseError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

async function getContext() {
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
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (businessError || !business) {
    return { error: "No encontramos el negocio activo.", supabase };
  }

  return { business, supabase, user };
}

function logCustomerError(scope: string, error: SupabaseError) {
  console.error(`${scope} failed`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });
}

function customerErrorMessage(error: SupabaseError) {
  const normalized = `${error.code || ""} ${error.message || ""} ${error.details || ""}`.toLowerCase();

  if (normalized.includes("customers_business_document_unique")) {
    return "Ya existe un cliente con ese documento en tu negocio.";
  }
  if (normalized.includes("contact_required")) {
    return "Agrega al menos un teléfono o correo.";
  }
  if (normalized.includes("row-level security") || error.code === "42501") {
    return "No tienes permiso para modificar este cliente.";
  }
  if (normalized.includes("does not exist") || normalized.includes("schema cache")) {
    return "El módulo Clientes aún no está instalado. Ejecuta la migración 011_customers.sql.";
  }
  return "No pudimos guardar el cliente. Intenta nuevamente.";
}

function customerPayload(input: CustomerFormInput, businessId: string, userId: string) {
  return {
    address: nullableText(input.address),
    birth_date: nullableText(input.birthDate),
    business_id: businessId,
    city: nullableText(input.city),
    created_by: userId,
    document_number: nullableText(input.documentNumber),
    document_type: nullableText(input.documentType),
    email: nullableText(input.email)?.toLowerCase() || null,
    full_name: input.fullName.trim(),
    gender: nullableText(input.gender),
    marketing_opt_in: input.marketingOptIn,
    notes_summary: nullableText(input.notesSummary),
    phone: nullableText(input.phone),
    preferred_contact_channel: nullableText(input.preferredContactChannel),
    status: input.status,
    tags: normalizeTags(input.tags),
  };
}

export async function createCustomer(input: CustomerFormInput): Promise<CustomerActionResult> {
  const validation = validateCustomerInput(input);

  if (!validation.ok) {
    return {
      error: Object.values(validation.fieldErrors)[0] || "Revisa los datos del cliente.",
      fieldErrors: validation.fieldErrors,
      ok: false,
    };
  }

  const context = await getContext();
  if ("error" in context) return { error: context.error, ok: false };

  const { data, error } = await context.supabase
    .from("customers")
    .insert(customerPayload(input, context.business.id, context.user.id))
    .select("id")
    .single();

  if (error) {
    logCustomerError("createCustomer", error);
    return { error: customerErrorMessage(error), ok: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/clientes");
  return {
    customerId: data.id,
    message: "Cliente creado correctamente.",
    ok: true,
  };
}

export async function updateCustomer(
  customerId: string,
  input: CustomerFormInput,
): Promise<CustomerActionResult> {
  const validation = validateCustomerInput(input);

  if (!validation.ok) {
    return {
      error: Object.values(validation.fieldErrors)[0] || "Revisa los datos del cliente.",
      fieldErrors: validation.fieldErrors,
      ok: false,
    };
  }

  const context = await getContext();
  if ("error" in context) return { error: context.error, ok: false };

  const payload = customerPayload(input, context.business.id, context.user.id);
  const { created_by: _createdBy, ...updatePayload } = payload;
  void _createdBy;
  const { data, error } = await context.supabase
    .from("customers")
    .update({
      ...updatePayload,
      archived_at: null,
    })
    .eq("id", customerId)
    .eq("business_id", context.business.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error) logCustomerError("updateCustomer", error);
    return {
      error: error ? customerErrorMessage(error) : "No encontramos el cliente.",
      ok: false,
    };
  }

  revalidatePath("/app/clientes");
  revalidatePath(`/app/clientes/${customerId}`);
  return {
    customerId,
    message: "Cliente actualizado correctamente.",
    ok: true,
  };
}

export async function archiveCustomer(customerId: string): Promise<CustomerActionResult> {
  const context = await getContext();
  if ("error" in context) return { error: context.error, ok: false };

  const { error } = await context.supabase
    .from("customers")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", customerId)
    .eq("business_id", context.business.id);

  if (error) {
    logCustomerError("archiveCustomer", error);
    return { error: "No pudimos archivar el cliente. Intenta nuevamente.", ok: false };
  }

  revalidatePath("/app/clientes");
  revalidatePath(`/app/clientes/${customerId}`);
  return { message: "Cliente archivado correctamente.", ok: true };
}

export async function restoreCustomer(customerId: string): Promise<CustomerActionResult> {
  const context = await getContext();
  if ("error" in context) return { error: context.error, ok: false };

  const { error } = await context.supabase
    .from("customers")
    .update({ archived_at: null, status: "active" })
    .eq("id", customerId)
    .eq("business_id", context.business.id);

  if (error) {
    logCustomerError("restoreCustomer", error);
    return { error: "No pudimos restaurar el cliente. Intenta nuevamente.", ok: false };
  }

  revalidatePath("/app/clientes");
  revalidatePath(`/app/clientes/${customerId}`);
  return { message: "Cliente restaurado correctamente.", ok: true };
}

export async function addCustomerNote(
  customerId: string,
  note: string,
): Promise<CustomerActionResult> {
  const normalized = note.trim();
  if (!normalized) return { error: "Escribe una nota antes de guardarla.", ok: false };
  if (normalized.length > 2000) return { error: "La nota es demasiado larga.", ok: false };

  const context = await getContext();
  if ("error" in context) return { error: context.error, ok: false };

  const { error } = await context.supabase.from("customer_notes").insert({
    business_id: context.business.id,
    created_by: context.user.id,
    customer_id: customerId,
    note: normalized,
  });

  if (error) {
    logCustomerError("addCustomerNote", error);
    return { error: "No pudimos guardar la nota. Intenta nuevamente.", ok: false };
  }

  revalidatePath(`/app/clientes/${customerId}`);
  return { message: "Nota agregada correctamente.", ok: true };
}

export async function registerCustomerPayment(input: {
  amount: string;
  customerId: string;
  notes: string;
  paidAt: string;
  paymentMethod: string;
  reference: string;
  saleId: string;
}): Promise<CustomerActionResult> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "El abono debe ser mayor que cero.", ok: false };
  }

  const context = await getContext();
  if ("error" in context) return { error: context.error, ok: false };

  const { error } = await context.supabase.rpc("register_customer_payment", {
    p_amount: amount,
    p_business_id: context.business.id,
    p_customer_id: input.customerId,
    p_notes: nullableText(input.notes),
    p_paid_at: input.paidAt ? new Date(`${input.paidAt}T12:00:00`).toISOString() : new Date().toISOString(),
    p_payment_method: input.paymentMethod,
    p_reference: nullableText(input.reference),
    p_sale_id: input.saleId,
  });

  if (error) {
    logCustomerError("registerCustomerPayment", error);
    const normalized = error.message.toLowerCase();
    const message = normalized.includes("superar")
      ? "El abono no puede superar el saldo pendiente."
      : normalized.includes("migración") || normalized.includes("function")
        ? "La función de abonos no está instalada. Ejecuta la migración 011_customers.sql."
        : "No pudimos registrar el abono. Intenta nuevamente.";
    return { error: message, ok: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/clientes");
  revalidatePath(`/app/clientes/${input.customerId}`);
  revalidatePath(`/app/ventas/${input.saleId}`);
  revalidatePath("/app/caja");
  return { message: "Abono registrado correctamente.", ok: true };
}
