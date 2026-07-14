"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type SaleCartItem,
  type SaleFieldErrors,
  type SaleFormInput,
  type SalePaymentStatus,
  validateSaleCart,
} from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: SaleFieldErrors;
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

function logSaleError(scope: string, error: SupabaseActionError) {
  console.error(`${scope} failed`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });
}

function mapSaleError(error: SupabaseActionError) {
  const normalized = `${error.code || ""} ${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();

  if (normalized.includes("usuario no autenticado")) {
    return "Tu sesión expiró. Inicia sesión nuevamente.";
  }

  if (normalized.includes("no tienes permiso")) {
    return "No tienes permiso para registrar ventas en este negocio.";
  }

  if (normalized.includes("al menos un producto")) {
    return "Agrega al menos un producto o combo.";
  }

  if (normalized.includes("cantidad")) {
    return "La cantidad debe ser mayor que cero.";
  }

  if (normalized.includes("inventario")) {
    return "No hay suficiente inventario para completar esta venta.";
  }

  if (normalized.includes("producto ya no")) {
    return "Este producto ya no está activo.";
  }

  if (normalized.includes("combo ya no")) {
    return "Este combo ya no está activo.";
  }

  if (normalized.includes("método de pago")) {
    return "Selecciona un método de pago.";
  }

  if (normalized.includes("nombre del cliente")) {
    return "Agrega el nombre del cliente para ventas pendientes.";
  }

  if (normalized.includes("monto pagado")) {
    return "El monto pagado no puede ser mayor al total.";
  }

  if (normalized.includes("precio")) {
    return "El precio debe ser mayor que cero.";
  }

  if (error.code === "42501" || normalized.includes("row-level security")) {
    return "Supabase bloqueó la operación por permisos. Revisa que el negocio pertenezca a tu cuenta.";
  }

  return "No pudimos registrar la venta. Intenta nuevamente.";
}

async function loadSaleProducts(
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
    const variant = row as {
      id: string;
      product_id: string;
      name: string | null;
      sku: string | null;
      purchase_cost: number | string | null;
      sale_price: number | string | null;
      current_stock: number | string | null;
      minimum_stock: number | string | null;
      inventory_mode?: string | null;
      inventory_unit?: string | null;
      default_sale_unit?: string | null;
      status: string | null;
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
    };
  });
}

async function loadSaleCombos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
) {
  const { data } = await supabase
    .from("combos")
    .select(
      "id,name,sale_price,packaging_cost,status,combo_items(id,product_id,variant_id,quantity,quantity_unit,quantity_in_inventory_unit,status,product_variants(id,product_id,name,sku,purchase_cost,sale_price,current_stock,inventory_mode,inventory_unit,default_sale_unit,status,products(id,name,status,track_inventory)))",
    )
    .eq("business_id", businessId)
    .eq("status", "active");

  return (data || []) as unknown[];
}

function itemPayload(item: SaleCartItem) {
  if (item.itemType === "combo") {
    return {
      combo_id: item.comboId,
      discount_amount: item.discountAmount,
      item_type: "combo",
      position: item.position,
      quantity: item.quantity,
      tax_percent: item.taxPercent,
      unit_price: item.unitPrice,
    };
  }

  return {
    discount_amount: item.discountAmount,
    item_type: "product",
    position: item.position,
    quantity: item.quantity,
    quantity_unit: item.quantityUnit,
    tax_percent: item.taxPercent,
    unit_price: item.unitPrice,
    variant_id: item.variantId,
  };
}

export async function createSale(input: SaleFormInput): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const [products, combos] = await Promise.all([
    loadSaleProducts(supabase, business.id),
    loadSaleCombos(supabase, business.id),
  ]);
  const validation = validateSaleCart({
    combos: combos as Parameters<typeof validateSaleCart>[0]["combos"],
    form: input,
    products: products as Parameters<typeof validateSaleCart>[0]["products"],
  });

  if (!validation.ok) {
    return {
      error: validation.error,
      fieldErrors: validation.fieldErrors,
      ok: false,
    };
  }

  const paymentStatus = input.paymentStatus as SalePaymentStatus;
  const paidAmount =
    paymentStatus === "paid"
      ? validation.totals.totalAmount
      : paymentStatus === "pending"
        ? 0
        : validation.totals.paidAmount;

  const { error } = await supabase.rpc("create_sale_with_customer", {
    p_business_id: business.id,
    p_channel: input.channel,
    p_customer_id: input.customerId || null,
    p_customer_name: input.customerName,
    p_customer_note: input.customerNote,
    p_customer_phone: input.customerPhone,
    p_discount_amount: input.discountAmount,
    p_items: input.items.map(itemPayload),
    p_notes: input.notes,
    p_paid_amount: paidAmount,
    p_payment_method: input.paymentMethod || null,
    p_payment_reference: input.paymentReference,
    p_payment_status: paymentStatus,
    p_sale_date: new Date().toISOString(),
    p_shipping_amount: input.shippingAmount,
  });

  if (error) {
    logSaleError("createSale", error);

    return {
      error: mapSaleError(error),
      ok: false,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/ventas");
  revalidatePath("/app/productos");
  if (input.customerId) {
    revalidatePath("/app/clientes");
    revalidatePath(`/app/clientes/${input.customerId}`);
  }
  redirect("/app/ventas");
}

export async function voidSale(saleId: string, reason: string): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;
  const { error } = await supabase.rpc("void_sale", {
    p_business_id: business.id,
    p_reason: reason,
    p_sale_id: saleId,
  });

  if (error) {
    logSaleError("voidSale", error);

    return {
      error: mapSaleError(error),
      ok: false,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/ventas");
  revalidatePath(`/app/ventas/${saleId}`);
  redirect(`/app/ventas/${saleId}`);
}
