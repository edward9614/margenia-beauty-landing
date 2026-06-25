"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getSkuErrorMessage,
  nullableText,
  ProductFormInput,
  ProductVariantInput,
  validateProductInput,
} from "@/lib/products/product-utils";

type ActionResult = {
  ok: boolean;
  error?: string;
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
  variant: ProductVariantInput,
  businessId: string,
  productId: string,
) {
  return {
    business_id: businessId,
    commission_percent: variant.commissionPercent,
    current_stock: variant.currentStock,
    desired_margin_percent: variant.desiredMarginPercent,
    minimum_stock: variant.minimumStock,
    name: variant.name,
    packaging_cost: variant.packagingCost,
    product_id: productId,
    purchase_cost: variant.purchaseCost,
    sale_price: variant.salePrice,
    sku: nullableText(variant.sku),
    status: variant.status,
  };
}

async function variantSkuExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  variants: ProductVariantInput[],
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

  let query = supabase
    .from("product_variants")
    .select("id,sku")
    .eq("business_id", businessId)
    .in("sku", skus);

  if (ignoredIds.length) {
    query = query.not("id", "in", `(${ignoredIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    return false;
  }

  return Boolean(data?.length);
}

export async function createProduct(input: ProductFormInput): Promise<ActionResult> {
  const context = await getActiveBusiness();

  if ("error" in context) {
    return { error: context.error, ok: false };
  }

  const validation = validateProductInput(input);

  if (!validation.ok) {
    return { error: validation.error, ok: false };
  }

  const { business, supabase } = context;

  if (await variantSkuExists(supabase, business.id, validation.value.variants)) {
    return {
      error: "Ya existe un producto o variante con ese SKU en tu negocio.",
      ok: false,
    };
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      brand: nullableText(validation.value.brand),
      business_id: business.id,
      category: nullableText(validation.value.category),
      description: nullableText(validation.value.description),
      name: validation.value.name,
      product_type: validation.value.productType,
      status: validation.value.status,
      track_inventory: validation.value.trackInventory,
      unit: validation.value.unit,
    })
    .select("id")
    .single();

  if (productError || !product) {
    return {
      error:
        getSkuErrorMessage(productError?.message || "") ||
        "No pudimos crear el producto.",
      ok: false,
    };
  }

  const { error: variantsError } = await supabase.from("product_variants").insert(
    validation.value.variants.map((variant) =>
      variantPayload(variant, business.id, product.id),
    ),
  );

  if (variantsError) {
    await supabase
      .from("products")
      .update({ status: "archived" })
      .eq("id", product.id)
      .eq("business_id", business.id);

    return {
      error:
        getSkuErrorMessage(variantsError.message) ||
        "No pudimos crear las variantes del producto. Intenta nuevamente.",
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
    return { error: validation.error, ok: false };
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

  const { error: productError } = await supabase
    .from("products")
    .update({
      brand: nullableText(validation.value.brand),
      category: nullableText(validation.value.category),
      description: nullableText(validation.value.description),
      name: validation.value.name,
      product_type: validation.value.productType,
      status: validation.value.status,
      track_inventory: validation.value.trackInventory,
      unit: validation.value.unit,
    })
    .eq("id", productId)
    .eq("business_id", business.id);

  if (productError) {
    return { error: "No pudimos guardar los cambios del producto.", ok: false };
  }

  const { data: currentVariants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("business_id", business.id);

  const submittedIds = new Set(existingVariantIds);
  const variantsToArchive =
    currentVariants
      ?.map((variant) => variant.id as string)
      .filter((id) => !submittedIds.has(id)) || [];

  if (variantsToArchive.length) {
    await supabase
      .from("product_variants")
      .update({ status: "archived" })
      .eq("business_id", business.id)
      .in("id", variantsToArchive);
  }

  for (const variant of validation.value.variants) {
    if (variant.id) {
      const { error } = await supabase
        .from("product_variants")
        .update(variantPayload(variant, business.id, productId))
        .eq("id", variant.id)
        .eq("business_id", business.id)
        .eq("product_id", productId);

      if (error) {
        return {
          error:
            getSkuErrorMessage(error.message) ||
            "No pudimos actualizar una variante.",
          ok: false,
        };
      }
    } else {
      const { error } = await supabase
        .from("product_variants")
        .insert(variantPayload(variant, business.id, productId));

      if (error) {
        return {
          error:
            getSkuErrorMessage(error.message) ||
            "No pudimos crear una variante nueva.",
          ok: false,
        };
      }
    }
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

  await supabase
    .from("product_variants")
    .update({ status: "archived" })
    .eq("product_id", productId)
    .eq("business_id", business.id);

  const { error } = await supabase
    .from("products")
    .update({ status: "archived" })
    .eq("id", productId)
    .eq("business_id", business.id);

  if (error) {
    return { error: "No pudimos archivar el producto.", ok: false };
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
    return { error: "No pudimos reactivar el producto.", ok: false };
  }

  await supabase
    .from("product_variants")
    .update({ status: "active" })
    .eq("product_id", productId)
    .eq("business_id", business.id);

  revalidatePath("/app");
  revalidatePath("/app/productos");
  redirect("/app/productos");
}
