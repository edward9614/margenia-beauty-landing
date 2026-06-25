import { signOut } from "@/app/(dashboard)/app/actions";

function formatToday() {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function DashboardHeader({
  businessName,
  displayName,
}: {
  businessName: string;
  displayName: string;
}) {
  const initials = getInitials(displayName) || "M";

  return (
    <section className="grid gap-5 rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-xl shadow-[#0F172A]/5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
          Centro de control
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
          Hola, {displayName}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#475569]">
          Así comienza el control de {businessName}.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-[#475569]">
          {formatToday()}
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] text-sm font-black text-white shadow-lg shadow-cyan-500/20">
          {initials}
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
