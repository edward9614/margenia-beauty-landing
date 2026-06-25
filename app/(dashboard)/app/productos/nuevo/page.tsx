import { redirect } from "next/navigation";
import { ProductForm } from "@/components/products/product-form";
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
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Nuevo producto
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
            Agrega un producto al catálogo
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#475569]">
            Registra costos, precios, variantes y existencias para alimentar los
            próximos módulos de Margenia.
          </p>
        </section>

        <ProductForm currency={business.currency || "COP"} mode="create" />
      </div>
    </main>
  );
}
