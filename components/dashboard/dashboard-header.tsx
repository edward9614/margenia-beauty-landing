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
    <header className="grid gap-5 border-b border-white/[0.07] px-5 py-7 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-9">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
          Centro de control
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-4xl">
          Hola, {name}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-400 sm:text-base">
          Así va el control de tu negocio hoy.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-slate-300 backdrop-blur">
          {formatToday()}
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="min-h-11 rounded-full border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-black text-slate-200 transition duration-200 hover:border-rose-300/20 hover:bg-rose-300/10 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
}
