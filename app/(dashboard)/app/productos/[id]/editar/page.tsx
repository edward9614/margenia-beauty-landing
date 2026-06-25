import { notFound, redirect } from "next/navigation";
import { ProductForm } from "@/components/products/product-form";
import {
  ProductFormInput,
  type ProductRow,
  type ProductVariantRow,
} from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) {
    redirect("/app/onboarding");
  }

  const { data: product } = await supabase
    .from("products")
    .select(
      "id,name,description,brand,category,unit,product_type,track_inventory,status,product_variants(id,name,sku,purchase_cost,packaging_cost,commission_percent,desired_margin_percent,sale_price,current_stock,minimum_stock,status)",
    )
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!product) {
    notFound();
  }

  const typedProduct = product as ProductRow;
  const initialProduct: ProductFormInput & { id: string } = {
    brand: typedProduct.brand || "",
    category: typedProduct.category || "",
    description: typedProduct.description || "",
    id: typedProduct.id,
    name: typedProduct.name,
    productType: typedProduct.product_type === "variants" ? "variants" : "simple",
    status: typedProduct.status === "archived" ? "archived" : "active",
    trackInventory: Boolean(typedProduct.track_inventory),
    unit: typedProduct.unit || "Unidad",
    variants: (typedProduct.product_variants || []).map((variant: ProductVariantRow) => ({
      commissionPercent: Number(variant.commission_percent || 0),
      currentStock: Number(variant.current_stock || 0),
      desiredMarginPercent: Number(variant.desired_margin_percent || 35),
      id: variant.id,
      minimumStock: Number(variant.minimum_stock || 0),
      name: variant.name || "Presentación estándar",
      packagingCost: Number(variant.packaging_cost || 0),
      purchaseCost: Number(variant.purchase_cost || 0),
      salePrice: Number(variant.sale_price || 0),
      sku: variant.sku || "",
      status: variant.status === "archived" ? "archived" : "active",
    })),
  };

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Editar producto
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
            {typedProduct.name}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#475569]">
            Actualiza información, variantes, precios y existencias. Archivar no
            elimina el producto ni sus variantes.
          </p>
        </section>

        <ProductForm
          currency={business.currency || "COP"}
          initialProduct={initialProduct}
          mode="edit"
        />
      </div>
    </main>
  );
}
