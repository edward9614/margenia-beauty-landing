import { signOut } from "@/app/(dashboard)/app/actions";

function formatToday() {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
    year: "numeric",
  }).format(new Date());
}

export function DashboardHeader({
  businessName,
}: {
  businessName: string;
}) {
  const name = businessName?.trim() || "Tu negocio";

  return (
    <section className="grid gap-5 rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-xl shadow-[#0F172A]/5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
          Centro de control
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
          Hola, {name}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#475569]">
          Así va el control de tu negocio hoy.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-[#475569]">
          {formatToday()}
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full bg-white px-4 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF] focus:outline-none focus:ring-4 focus:ring-[#BFDBFE]/60"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </section>
  );
}
