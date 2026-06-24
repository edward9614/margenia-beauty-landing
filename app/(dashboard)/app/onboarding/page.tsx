import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/app-shell/onboarding-form";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingBusiness) {
    redirect("/app");
  }

  return (
    <main className="px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-6 shadow-xl shadow-[#0F172A]/5 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Primer negocio
          </p>
          <h1 className="mt-3 text-3xl font-black">Crea tu negocio en Margenia</h1>
          <p className="mt-3 text-base leading-7 text-[#475569]">
            Este será el espacio base para conectar tus precios, ventas, inventario y
            utilidad real cuando activemos los módulos.
          </p>
          <div className="mt-7">
            <OnboardingForm />
          </div>
        </section>
      </div>
    </main>
  );
}
