import { redirect } from "next/navigation";
import { loadInventoryVariants } from "@/app/(dashboard)/app/inventario/actions";
import { ProductAnalyticsEvent } from "@/components/products/product-analytics";
import { InventoryMovementForm } from "@/components/inventory/inventory-movement-form";
import { createClient } from "@/lib/supabase/server";

export default async function InventoryAdjustmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) redirect("/app/onboarding");

  const variants = await loadInventoryVariants(supabase, business.id);

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <ProductAnalyticsEvent eventName="inventory_movement_start" />
      <InventoryMovementForm currency={business.currency || "COP"} variants={variants} />
    </main>
  );
}
