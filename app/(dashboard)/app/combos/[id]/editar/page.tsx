import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ComboForm } from "@/components/combos/combo-form";
import {
  AppPageHeader,
  DashboardShell,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import type {
  ComboCatalogVariant,
  ComboFormInput,
  ComboItemRow,
  ComboRow,
} from "@/lib/combos";
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

export default async function EditComboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { business, supabase } = await getActiveBusiness();
  const { data: combo } = await supabase
    .from("combos")
    .select(
      "id,name,description,category,sale_price,packaging_cost,commission_percent,desired_margin_percent,tax_percent,status,combo_items(id,product_id,variant_id,quantity,quantity_unit,quantity_in_inventory_unit,position,status)",
    )
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!combo) {
    notFound();
  }

  const { data: variantRows } = await supabase
    .from("product_variants")
    .select(
      "id,product_id,name,sku,purchase_cost,sale_price,current_stock,inventory_mode,measurement_family,inventory_unit,default_sale_unit,status,products!inner(id,name,status,track_inventory,unit)",
    )
    .eq("business_id", business.id)
    .eq("status", "active")
    .eq("products.status", "active");
  const variants = ((variantRows || []) as unknown[]).map((row) => {
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
  const typedCombo = combo as ComboRow;
  const initialCombo: ComboFormInput & { id: string } = {
    category: typedCombo.category || "",
    commissionPercent: String(typedCombo.commission_percent ?? 0),
    description: typedCombo.description || "",
    desiredMarginPercent: String(typedCombo.desired_margin_percent ?? 35),
    id: typedCombo.id,
    items: ((typedCombo.combo_items || []) as ComboItemRow[])
      .filter((item) => item.status === "active")
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((item, index) => ({
        id: item.id,
        position: item.position ?? index,
        productId: item.product_id,
        quantity: String(item.quantity ?? 1),
        quantityInInventoryUnit: String(
          item.quantity_in_inventory_unit ?? item.quantity ?? 1,
        ),
        quantityUnit: (item.quantity_unit || "unit") as ComboFormInput["items"][number]["quantityUnit"],
        status: "active",
        variantId: item.variant_id,
      })),
    name: typedCombo.name,
    packagingCost: String(typedCombo.packaging_cost ?? 0),
    salePrice: String(typedCombo.sale_price ?? 0),
    status: typedCombo.status === "archived" ? "archived" : "active",
    taxPercent: String(typedCombo.tax_percent ?? 0),
  };

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <DashboardShell>
        <AppPageHeader
          eyebrow="Editar combo"
          title={typedCombo.name}
          description="Ajusta productos, cantidades, precio y margen. Los items retirados se archivan, no se borran."
          actions={<Link href="/app/combos" className={dashboardSecondaryActionClass}>Volver a combos</Link>}
        />
        <div className="p-4 sm:p-6 lg:p-8">
        <ComboForm
          appearance="premium"
          currency={business.currency || "COP"}
          initialCombo={initialCombo}
          mode="edit"
          variants={variants}
        />
        </div>
      </DashboardShell>
    </main>
  );
}
