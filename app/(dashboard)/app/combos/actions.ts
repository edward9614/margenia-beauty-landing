"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ComboCatalogVariant,
  type ComboFieldErrors,
  type ComboFormInput,
  type NormalizedComboFormInput,
  validateComboInput,
} from "@/lib/combos";
import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: ComboFieldErrors;
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

function logComboError(scope: string, error: SupabaseActionError) {
  console.error(`${scope} failed`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });
}

function mapComboError(error: SupabaseActionError) {
  const normalized = `${error.code || ""} ${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();

  if (normalized.includes("usuario no autenticado")) {
    return "Tu sesión expiró. Inicia sesión nuevamente.";
  }

  if (normalized.includes("no tienes permiso")) {
    return "No tienes permiso para modificar este combo.";
  }

  if (normalized.includes("nombre del combo")) {
    return "Escribe el nombre del combo.";
  }

  if (normalized.includes("al menos un producto")) {
    return "Agrega al menos un producto al combo.";
  }

  if (normalized.includes("cantidad")) {
    return "La cantidad debe ser mayor que cero.";
  }

  if (normalized.includes("medidas") || normalized.includes("compatibles")) {
    return "La unidad seleccionada no es compatible con este producto.";
  }

  if (error.code === "42501" || normalized.includes("row-level security")) {
    return "No tienes permiso para modificar este combo.";
  }

  if (error.code === "23514" || normalized.includes("check constraint")) {
    if (normalized.includes("rate") || normalized.includes("margin")) {
      return "La comisión, impuesto y margen no pueden sumar 100% o más.";
    }

    return "Hay valores del combo que no cumplen las restricciones permitidas.";
  }

  return "No pudimos guardar el combo. Intenta nuevamente.";
}

async function loadActiveVariants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
) {
  const { data } = await supabase
    .from("product_variants")
    .select(
      "id,product_id,name,sku,purchase_cost,sale_price,current_stock,minimum_stock,inventory_mode,inventory_unit,default_sale_unit,status,products!inner(id,name,status,track_inventory,unit)",
    )
    .eq("business_id", businessId)
    .eq("status", "active")
    .eq("products.status", "active");

  return ((data || []) as unknown[]).map((row) => {
    const variant = row as ComboCatalogVariant & {
      products?: {
        id: string;
        name: string;
        status: string | null;
        track_inventory: boolean | null;
        unit: string | null;
      };
    };

    return {
      ...variant,
      product_name: variant.products?.name || "Producto",
      product_status: variant.products?.status || "active",
      track_inventory: variant.products?.track_inventory ?? true,
      unit: variant.products?.unit || "Unidad",
    } as ComboCatalogVariant;
  });
}

function validationError(validation: Exclude<ReturnType<typeof validateComboInput>, { ok: true }>) {
  return {
    error: validation.error,
    fieldErrors: validation.fieldErrors,
    ok: false,
  };
}

function comboPayload(input: NormalizedComboFormInput, businessId: string) {
  return {
    p_business_id: businessId,
    p_category: input.category || null,
    p_commission_percent: input.commissionPercent,
    p_description: input.description || null,
    p_desired_margin_percent: input.desiredMarginPercent,
    p_items: input.items.map((item) => ({
      id: item.id || null,
      position: item.position,
      product_id: item.productId,
      quantity: item.quantity,
      quantity_unit: item.quantityUnit,
      variant_id: item.variantId,
    })),
    p_name: input.name,
    p_packaging_cost: input.packagingCost,
    p_sale_price: input.salePrice,
    p_status: input.status,
    p_tax_percent: input.taxPercent,
  };
}

export async function createCombo(input: ComboFormInput): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const variants = await loadActiveVariants(supabase, business.id);
  const validation = validateComboInput(input, variants);

  if (!validation.ok) {
    return validationError(validation);
  }

  const { error } = await supabase.rpc("create_combo_with_items", {
    ...comboPayload(validation.value, business.id),
  });

  if (error) {
    logComboError("createCombo", error);

    return {
      error: mapComboError(error),
      ok: false,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/combos");
  redirect("/app/combos");
}

export async function updateCombo(
  comboId: string,
  input: ComboFormInput,
): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const variants = await loadActiveVariants(supabase, business.id);
  const validation = validateComboInput(input, variants);

  if (!validation.ok) {
    return validationError(validation);
  }

  const { error } = await supabase.rpc("update_combo_with_items", {
    ...comboPayload(validation.value, business.id),
    p_combo_id: comboId,
  });

  if (error) {
    logComboError("updateCombo", error);

    return {
      error: mapComboError(error),
      ok: false,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/combos");
  revalidatePath(`/app/combos/${comboId}/editar`);
  redirect("/app/combos");
}

export async function archiveCombo(comboId: string): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const { data: combo, error: lookupError } = await supabase
    .from("combos")
    .select("id")
    .eq("id", comboId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (lookupError) {
    logComboError("archiveComboLookup", lookupError);
    return { error: "No pudimos archivar el combo. Intenta nuevamente.", ok: false };
  }

  if (!combo) {
    return { error: "No encontramos este combo.", ok: false };
  }

  const { error } = await supabase
    .from("combos")
    .update({ status: "archived" })
    .eq("id", comboId)
    .eq("business_id", business.id);

  if (error) {
    logComboError("archiveCombo", error);
    return { error: "No pudimos archivar el combo. Intenta nuevamente.", ok: false };
  }

  const { error: itemsError } = await supabase
    .from("combo_items")
    .update({ status: "archived" })
    .eq("combo_id", comboId)
    .eq("business_id", business.id);

  if (itemsError) {
    logComboError("archiveComboItems", itemsError);
    return { error: "No pudimos archivar el combo. Intenta nuevamente.", ok: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/combos");
  redirect("/app/combos");
}

export async function restoreCombo(comboId: string): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const { data: combo, error: lookupError } = await supabase
    .from("combos")
    .select("id")
    .eq("id", comboId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (lookupError) {
    logComboError("restoreComboLookup", lookupError);
    return { error: "No pudimos restaurar el combo. Intenta nuevamente.", ok: false };
  }

  if (!combo) {
    return { error: "No encontramos este combo.", ok: false };
  }

  const { error } = await supabase
    .from("combos")
    .update({ status: "active" })
    .eq("id", comboId)
    .eq("business_id", business.id);

  if (error) {
    logComboError("restoreCombo", error);
    return { error: "No pudimos restaurar el combo. Intenta nuevamente.", ok: false };
  }

  const { error: itemsError } = await supabase
    .from("combo_items")
    .update({ status: "active" })
    .eq("combo_id", comboId)
    .eq("business_id", business.id);

  if (itemsError) {
    logComboError("restoreComboItems", itemsError);
    return { error: "No pudimos restaurar el combo. Intenta nuevamente.", ok: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/combos");
  redirect("/app/combos");
}
