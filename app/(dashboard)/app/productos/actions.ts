"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getSkuErrorMessage,
  NormalizedProductFormInput,
  NormalizedProductVariantInput,
  nullableText,
  ProductFieldErrors,
  ProductFormInput,
  validateProductInput,
} from "@/lib/products/product-utils";

type ActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: ProductFieldErrors;
};

async function getActiveBusiness() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", supabase };
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

function variantPayload(
  variant: NormalizedProductVariantInput,
) {
  return {
    allow_fractional_sales: variant.allowFractionalSales,
    commission_percent: variant.commissionPercent,
    current_stock: variant.currentStock,
    default_sale_unit: variant.defaultSaleUnit,
    desired_margin_percent: variant.desiredMarginPercent,
    id: variant.id || "",
    inventory_mode: variant.inventoryMode,
    inventory_unit: variant.inventoryUnit,
    measurement_family: variant.measurementFamily,
    minimum_stock: variant.minimumStock,
    minimum_sale_quantity: variant.minimumSaleQuantity,
    name: variant.name,
    packaging_cost: variant.packagingCost,
    purchase_package_cost: variant.purchasePackageCost,
    purchase_package_label: nullableText(variant.purchasePackageLabel),
    purchase_package_quantity: variant.purchasePackageQuantity,
    purchase_package_unit: variant.purchasePackageUnit,
    purchase_cost: variant.purchaseCost,
    sale_quantity_step: variant.saleQuantityStep,
    sale_price: variant.salePrice,
    sku: nullableText(variant.sku),
    tax_percent: variant.taxPercent,
    lot_number: nullableText(variant.lotNumber),
    expiration_date: nullableText(variant.expirationDate),
    status: variant.status,
  };
}

async function variantSkuExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  variants: NormalizedProductVariantInput[],
  ignoredIds: string[] = [],
) {
  const skus = variants
    .map((variant) => variant.sku.trim().toLowerCase())
    .filter(Boolean);

  if (new Set(skus).size !== skus.length) {
    return true;
  }

  if (!skus.length) {
    return false;
  }

  const query = supabase
    .from("product_variants")
    .select("id,sku")
    .eq("business_id", businessId)
    .not("sku", "is", null);

  const { data, error } = await query;

  if (error) {
    return false;
  }

  const ignored = new Set(ignoredIds);

  return Boolean(
    data?.some((variant) => {
      if (ignored.has(variant.id)) {
        return false;
      }

      return skus.includes(String(variant.sku || "").trim().toLowerCase());
    }),
  );
}

type SupabaseActionError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

function logProductError(scope: string, error: SupabaseActionError) {
  console.error(`${scope} failed`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });
}

function mapProductSaveError(error: SupabaseActionError) {
  const message = error.message || "";
  const normalized = `${error.code || ""} ${message} ${error.details || ""} ${error.hint || ""}`.toLowerCase();
  const skuError = getSkuErrorMessage(normalized);

  if (skuError || error.code === "23505") {
    return "Ya existe un producto o variante con ese SKU en tu negocio.";
  }

  if (
    error.code === "PGRST202" ||
    normalized.includes("could not find the function") ||
    normalized.includes("function public.create_product_with_variants") ||
    normalized.includes("function public.update_product_with_variants")
  ) {
    return "La función RPC de productos no está instalada o no coincide con sus parámetros. Revisa las migraciones 003_products_rpcs.sql y 004_measured_products.sql en Supabase.";
  }

  if (
    normalized.includes("relation") &&
    (normalized.includes("products") || normalized.includes("product_variants")) &&
    normalized.includes("does not exist")
  ) {
    return "Las tablas de productos no existen todavía. Ejecuta la migración 002_products_catalog.sql en Supabase.";
  }

  if (error.code === "42501" || normalized.includes("row-level security")) {
    return "Supabase bloqueó el guardado por permisos o RLS. Revisa que el negocio pertenezca a tu cuenta y que las políticas estén activas para authenticated.";
  }

  if (error.code === "23514" || normalized.includes("check constraint")) {
    if (normalized.includes("rate") || normalized.includes("margin")) {
      return "La comisión y el margen deseado deben sumar menos de 100%.";
    }

    return "Hay valores del producto que no cumplen las restricciones permitidas.";
  }

  if (normalized.includes("usuario no autenticado")) {
    return "Tu sesión expiró. Inicia sesión nuevamente.";
  }

  if (normalized.includes("no tienes acceso") || normalized.includes("negocio")) {
    return "No encontramos un negocio activo para esta cuenta.";
  }

  return "No pudimos guardar el producto. Intenta nuevamente.";
}

function validationError(validation: Exclude<ReturnType<typeof validateProductInput>, { ok: true }>) {
  return {
    error: validation.error,
    fieldErrors: validation.fieldErrors,
    ok: false,
  };
}

function buildProductPayload(
  input: NormalizedProductFormInput,
  businessId: string,
) {
  return {
    p_brand: nullableText(input.brand),
    p_business_id: businessId,
    p_category: nullableText(input.category),
    p_description: nullableText(input.description),
    p_name: input.name,
    p_product_type: input.productType,
    p_status: input.status,
    p_track_inventory: input.trackInventory,
    p_unit: input.unit,
    p_variants: input.variants.map((variant) => variantPayload(variant)),
  };
}

export async function createProduct(input: ProductFormInput): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const validation = validateProductInput(input);

  if (!validation.ok) {
    return validationError(validation);
  }

  const { business, supabase } = context;

  if (await variantSkuExists(supabase, business.id, validation.value.variants)) {
    return {
      error: "Ya existe un producto o variante con ese SKU en tu negocio.",
      ok: false,
    };
  }

  const { error } = await supabase.rpc("create_product_with_variants", {
    ...buildProductPayload(validation.value, business.id),
  });

  if (error) {
    logProductError("createProduct", error);

    return {
      error: mapProductSaveError(error),
      ok: false,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/productos");
  redirect("/app/productos");
}

export async function updateProduct(
  productId: string,
  input: ProductFormInput,
): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const validation = validateProductInput(input);

  if (!validation.ok) {
    return validationError(validation);
  }

  const { business, supabase } = context;

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!product) {
    return { error: "No encontramos este producto.", ok: false };
  }

  const existingVariantIds = validation.value.variants
    .map((variant) => variant.id)
    .filter(Boolean) as string[];

  if (
    await variantSkuExists(
      supabase,
      business.id,
      validation.value.variants,
      existingVariantIds,
    )
  ) {
    return {
      error: "Ya existe un producto o variante con ese SKU en tu negocio.",
      ok: false,
    };
  }

  const { error } = await supabase.rpc("update_product_with_variants", {
    ...buildProductPayload(validation.value, business.id),
    p_product_id: productId,
  });

  if (error) {
    logProductError("updateProduct", error);

    return {
      error: mapProductSaveError(error),
      ok: false,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/productos");
  revalidatePath(`/app/productos/${productId}/editar`);
  redirect("/app/productos");
}

export async function archiveProduct(productId: string): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;

  const { error: variantsError } = await supabase
    .from("product_variants")
    .update({ status: "archived" })
    .eq("product_id", productId)
    .eq("business_id", business.id);

  if (variantsError) {
    logProductError("archiveProductVariants", variantsError);

    return {
      error: "No pudimos archivar el producto. Intenta nuevamente.",
      ok: false,
    };
  }

  const { error } = await supabase
    .from("products")
    .update({ status: "archived" })
    .eq("id", productId)
    .eq("business_id", business.id);

  if (error) {
    logProductError("archiveProduct", error);

    return {
      error: "No pudimos archivar el producto. Intenta nuevamente.",
      ok: false,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/productos");
  redirect("/app/productos");
}

export async function restoreProduct(productId: string): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const { business, supabase } = context;

  const { error } = await supabase
    .from("products")
    .update({ status: "active" })
    .eq("id", productId)
    .eq("business_id", business.id);

  if (error) {
    logProductError("restoreProduct", error);

    return {
      error: "No pudimos restaurar el producto. Intenta nuevamente.",
      ok: false,
    };
  }

  const { error: variantsError } = await supabase
    .from("product_variants")
    .update({ status: "active" })
    .eq("product_id", productId)
    .eq("business_id", business.id);

  if (variantsError) {
    logProductError("restoreProductVariants", variantsError);

    return {
      error: "No pudimos restaurar el producto. Intenta nuevamente.",
      ok: false,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/productos");
  redirect("/app/productos");
}
