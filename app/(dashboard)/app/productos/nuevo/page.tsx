import { redirect } from "next/navigation";
import Link from "next/link";
import { ProductForm } from "@/components/products/product-form";
import {
  AppPageHeader,
  DashboardShell,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import { createClient } from "@/lib/supabase/server";

export default async function NewProductPage() {
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

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <DashboardShell>
        <AppPageHeader
          eyebrow="Nuevo producto"
          title="Agrega un producto al catálogo"
          description="Registra costos, precios, variantes y existencias para alimentar los próximos módulos de Margenia."
          actions={<Link href="/app/productos" className={dashboardSecondaryActionClass}>Volver al catálogo</Link>}
        />
        <div className="p-4 sm:p-6 lg:p-8">
          <ProductForm appearance="premium" currency={business.currency || "COP"} mode="create" />
        </div>
      </DashboardShell>
    </main>
  );
}
