import Link from "next/link";
import { redirect } from "next/navigation";
import { ComboForm } from "@/components/combos/combo-form";
import { ProductAnalyticsEvent } from "@/components/products/product-analytics";
import {
  AppPageHeader,
  DashboardEmptyState,
  DashboardShell,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
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
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <ProductAnalyticsEvent eventName="combo_create_start" />
      <DashboardShell>
        <AppPageHeader
          eyebrow="Nuevo combo"
          title="Crea un combo rentable"
          description="Combina productos reales de tu catálogo y revisa costo, precio, margen y stock posible antes de vender."
          actions={<Link href="/app/combos" className={dashboardSecondaryActionClass}>Volver a combos</Link>}
        />
        <div className="p-4 sm:p-6 lg:p-8">
        {variants.length ? (
          <ComboForm
            appearance="premium"
            currency={business.currency || "COP"}
            mode="create"
            variants={variants}
          />
        ) : (
          <div>
            <DashboardEmptyState title="Primero agrega productos" description="Para crear un combo necesitas tener productos activos en tu catálogo." />
            <div className="mt-4 text-center"><Link href="/app/productos/nuevo" className={dashboardPrimaryActionClass}>Ir a productos</Link></div>
          </div>
        )}
        </div>
      </DashboardShell>
    </main>
  );
}
