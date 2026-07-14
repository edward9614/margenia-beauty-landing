import Link from "next/link";
import { redirect } from "next/navigation";
import { SaleForm } from "@/components/sales/sale-form";
import {
  AppPageHeader,
  DashboardEmptyState,
  DashboardShell,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import type { SaleCatalogCombo, SaleCatalogProduct } from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewSalePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const initialCustomerId = typeof params?.customerId === "string" ? params.customerId : "";
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

  const [{ data: productRows }, { data: comboRows }, { data: customerRows }] = await Promise.all([
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
    supabase
      .from("customers")
      .select("id,full_name,phone")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("full_name", { ascending: true }),
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
      <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
        <DashboardShell>
          <AppPageHeader
            eyebrow="Ventas"
            title="Nueva venta"
            description="Registra productos, pagos y datos del cliente en un flujo claro y seguro."
            actions={<Link href="/app/ventas" className={dashboardSecondaryActionClass}>Volver a ventas</Link>}
          />
          <div className="p-4 sm:p-6 lg:p-8">
            <DashboardEmptyState
              title="Primero crea productos"
              description="Para registrar ventas necesitas productos o combos activos."
            />
            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <Link href="/app/productos" className={dashboardPrimaryActionClass}>Ir a Productos</Link>
              <Link href="/app/combos" className={dashboardSecondaryActionClass}>Ir a Combos</Link>
            </div>
          </div>
        </DashboardShell>
      </main>
    );
  }

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <DashboardShell>
        <AppPageHeader
          eyebrow="Ventas"
          title="Nueva venta"
          description="Selecciona lo que vendiste, registra el pago y revisa el impacto antes de confirmar."
        />
        <div className="p-4 sm:p-6 lg:p-8">
        <SaleForm
          appearance="premium"
          combos={combos}
          currency={business.currency || "COP"}
          customers={(customerRows || []).map((customer) => ({
            fullName: customer.full_name,
            id: customer.id,
            phone: customer.phone || "",
          }))}
          initialCustomerId={initialCustomerId}
          products={products}
        />
        </div>
      </DashboardShell>
    </main>
  );
}
