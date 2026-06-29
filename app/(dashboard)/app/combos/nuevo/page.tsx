import Link from "next/link";
import { redirect } from "next/navigation";
import { ComboForm } from "@/components/combos/combo-form";
import { ProductAnalyticsEvent } from "@/components/products/product-analytics";
import type { ComboCatalogVariant } from "@/lib/combos";
import { createClient } from "@/lib/supabase/server";

async function getActiveBusiness() {
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

  return { business, supabase };
}

export default async function NewComboPage() {
  const { business, supabase } = await getActiveBusiness();
  const { data } = await supabase
    .from("product_variants")
    .select(
      "id,product_id,name,sku,purchase_cost,sale_price,current_stock,inventory_mode,measurement_family,inventory_unit,default_sale_unit,status,products!inner(id,name,status,track_inventory,unit)",
    )
    .eq("business_id", business.id)
    .eq("status", "active")
    .eq("products.status", "active");
  const variants = ((data || []) as unknown[]).map((row) => {
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

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">
      <ProductAnalyticsEvent eventName="combo_create_start" />
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Nuevo combo
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
            Crea un combo rentable
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#475569]">
            Combina productos reales de tu catálogo y revisa costo, precio, margen y
            stock posible antes de vender.
          </p>
        </section>

        {variants.length ? (
          <ComboForm
            currency={business.currency || "COP"}
            mode="create"
            variants={variants}
          />
        ) : (
          <section className="rounded-[2rem] border border-dashed border-[#BFDBFE] bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-[#0F172A]">Primero agrega productos</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#475569]">
              Para crear un combo necesitas tener productos activos en tu catálogo.
            </p>
            <Link
              href="/app/productos/nuevo"
              className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-center text-sm font-black text-white"
            >
              Ir a productos
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
