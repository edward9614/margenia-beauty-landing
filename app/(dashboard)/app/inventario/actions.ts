"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  manualMovementKinds,
  validateCountInput,
  validateMovementInput,
  type InventoryCountInput,
  type InventoryFieldErrors,
  type InventoryMovementInput,
  type InventoryVariant,
} from "@/lib/inventory";
import { toSafeNumber } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: InventoryFieldErrors;
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

function logInventoryError(scope: string, error: SupabaseActionError) {
  console.error(`${scope} failed`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });
}

function mapInventoryError(error: SupabaseActionError) {
  const normalized = `${error.code || ""} ${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();

  if (normalized.includes("usuario no autenticado")) return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (normalized.includes("no tienes permiso")) return "No tienes permiso para modificar este inventario.";
  if (normalized.includes("selecciona un producto")) return "Selecciona un producto.";
  if (normalized.includes("cantidad")) return "La cantidad debe ser mayor que cero.";
  if (normalized.includes("inventario")) return "No hay suficiente inventario para completar este movimiento.";
  if (normalized.includes("unidad")) return "La unidad no es compatible con este producto.";
  if (normalized.includes("stock contado")) return "El stock contado no puede ser negativo.";
  if (normalized.includes("producto ya no")) return "Este producto ya no está activo.";
  if (error.code === "42501" || normalized.includes("row-level security")) {
    return "Supabase bloqueó la operación por permisos. Revisa que el negocio pertenezca a tu cuenta.";
  }

  return "No pudimos guardar el movimiento. Intenta nuevamente.";
}

export async function loadInventoryVariants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
) {
  const { data } = await supabase
    .from("product_variants")
    .select(
      "id,product_id,name,sku,purchase_cost,sale_price,current_stock,minimum_stock,low_stock_threshold,inventory_location,last_counted_at,inventory_mode,inventory_unit,default_sale_unit,status,products!inner(id,name,status,track_inventory,unit)",
    )
    .eq("business_id", businessId)
    .eq("status", "active")
    .eq("products.status", "active");

  return ((data || []) as unknown[]).map((row) => {
    const variant = row as InventoryVariant & {
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
    } as InventoryVariant;
  });
}

export async function createInventoryMovement(
  input: InventoryMovementInput,
): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const variants = await loadInventoryVariants(supabase, business.id);
  const variant = variants.find((current) => current.id === input.variantId);
  const validation = validateMovementInput(input, variant);

  if (!validation.ok) {
    return { error: validation.error, fieldErrors: validation.fieldErrors, ok: false };
  }

  const kind = manualMovementKinds.find((item) => item.value === input.kind) || manualMovementKinds[0];
  const signedQuantity =
    kind.movementType === "adjustment"
      ? toSafeNumber(input.quantity) * kind.sign
      : toSafeNumber(input.quantity);
  const { error } = await supabase.rpc("create_inventory_manual_movement", {
    p_business_id: business.id,
    p_movement_type: kind.movementType,
    p_notes: input.notes,
    p_quantity: signedQuantity,
    p_quantity_unit: input.quantityUnit,
    p_reason: input.reason,
    p_unit_cost: input.unitCost ? toSafeNumber(input.unitCost) : null,
    p_variant_id: input.variantId,
  });

  if (error) {
    logInventoryError("createInventoryMovement", error);
    return { error: mapInventoryError(error), ok: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/inventario");
  revalidatePath("/app/inventario/movimientos");
  redirect("/app/inventario/movimientos");
}

export async function createInventoryCount(input: InventoryCountInput): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const variants = await loadInventoryVariants(supabase, business.id);
  const validation = validateCountInput(input, variants);

  if (!validation.ok) {
    return { error: validation.error, fieldErrors: validation.fieldErrors, ok: false };
  }

  const { error } = await supabase.rpc("create_inventory_count", {
    p_business_id: business.id,
    p_items: input.items.map((item) => ({
      counted_stock: item.countedStock,
      stock_unit: item.stockUnit,
      variant_id: item.variantId,
    })),
    p_notes: input.notes,
  });

  if (error) {
    logInventoryError("createInventoryCount", error);
    return { error: mapInventoryError(error), ok: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/inventario");
  revalidatePath("/app/inventario/movimientos");
  redirect("/app/inventario");
}

export async function updateInventorySettings({
  inventoryLocation,
  lowStockThreshold,
  variantId,
}: {
  inventoryLocation: string;
  lowStockThreshold: string;
  variantId: string;
}): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const { error } = await supabase.rpc("update_inventory_settings", {
    p_business_id: business.id,
    p_inventory_location: inventoryLocation,
    p_low_stock_threshold: toSafeNumber(lowStockThreshold),
    p_variant_id: variantId,
  });

  if (error) {
    logInventoryError("updateInventorySettings", error);
    return { error: mapInventoryError(error), ok: false };
  }

  revalidatePath("/app/inventario");
  revalidatePath(`/app/inventario/${variantId}`);
  return { ok: true };
}
