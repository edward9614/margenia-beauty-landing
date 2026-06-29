import Link from "next/link";
import { redirect } from "next/navigation";
import { SaleForm } from "@/components/sales/sale-form";
import type { SaleCatalogCombo, SaleCatalogProduct } from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";

export default async function NewSalePage() {
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

  const [{ data: productRows }, { data: comboRows }] = await Promise.all([
    supabase
      .from("product_variants")
      .select(
        "id,product_id,name,sku,purchase_cost,sale_price,current_stock,minimum_stock,inventory_mode,inventory_unit,default_sale_unit,status,products!inner(id,name,status,track_inventory,unit)",
      )
      .eq("business_id", business.id)
      .eq("status", "active")
      .eq("products.status", "active"),
    supabase
      .from("combos")
      .select(
        "id,name,sale_price,packaging_cost,status,combo_items(id,product_id,variant_id,quantity,quantity_unit,quantity_in_inventory_unit,status,product_variants(id,product_id,name,sku,purchase_cost,sale_price,current_stock,inventory_mode,inventory_unit,default_sale_unit,status,products(id,name,status,track_inventory)))",
      )
      .eq("business_id", business.id)
      .eq("status", "active"),
  ]);

  const products = ((productRows || []) as unknown[]).map((row) => {
    const variant = row as SaleCatalogProduct & {
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
    } as SaleCatalogProduct;
  });
  const combos = (comboRows || []) as unknown as SaleCatalogCombo[];

  if (!products.length && !combos.length) {
    return (
      <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
            Ventas
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A]">
            Primero crea productos
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[#475569]">
            Para registrar ventas necesitas productos o combos activos.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/app/productos"
              className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20"
            >
              Ir a Productos
            </Link>
            <Link
              href="/app/combos"
              className="rounded-full border border-[#BFDBFE] bg-white px-6 py-3 text-sm font-black text-[#2563EB]"
            >
              Ir a Combos
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <div className="w-full max-w-none space-y-6">
        <SaleForm
          combos={combos}
          currency={business.currency || "COP"}
          products={products}
        />
      </div>
    </main>
  );
}
