import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const cards = [
  { title: "Ventas", value: "$0", detail: "Sin movimientos todavía" },
  { title: "Utilidad", value: "$0", detail: "Aún no hay ventas registradas" },
  { title: "Inventario", value: "0", detail: "Módulo próximamente" },
  { title: "Caja", value: "$0", detail: "Módulo próximamente" },
];

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) {
    redirect("/app/onboarding");
  }

  return (
    <main className="px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-6 shadow-xl shadow-[#0F172A]/5 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            {business.name}
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Bienvenido a Margenia
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#475569]">
            Este será el centro de control de tu negocio.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.title}
              className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-black text-[#475569]">{card.title}</p>
              <p className="mt-4 text-3xl font-black text-[#0F172A]">{card.value}</p>
              <p className="mt-2 text-sm text-[#475569]">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-dashed border-[#BFDBFE] bg-[#EFF6FF] p-5">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#2563EB]">
            Base inicial
          </p>
          <p className="mt-2 text-base leading-7 text-[#475569]">
            Tu negocio todavía no tiene movimientos. Los módulos de productos, combos,
            ventas, inventario, caja y pagos pendientes se activarán en próximos hitos.
          </p>
        </section>
      </div>
    </main>
  );
}
