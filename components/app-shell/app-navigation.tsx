import Link from "next/link";

const navItems = [
  { href: "/app", label: "Inicio", active: true },
  { href: "#", label: "Productos" },
  { href: "#", label: "Combos" },
  { href: "#", label: "Ventas" },
  { href: "#", label: "Inventario" },
  { href: "#", label: "Caja" },
  { href: "#", label: "Configuración" },
];

export function SidebarNavigation() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[#E2E8F0] bg-white px-4 py-6 lg:flex lg:flex-col">
      <Link href="/" className="text-2xl font-black tracking-tight text-[#0F172A]">
        Margenia
      </Link>
      <nav className="mt-8 space-y-1" aria-label="Navegación principal">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition ${
              item.active
                ? "bg-[#0F172A] text-white"
                : "text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
            }`}
          >
            <span>{item.label}</span>
            {!item.active && (
              <span className="rounded-full bg-[#E0F7FA] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#0891B2]">
                Próximamente
              </span>
            )}
          </a>
        ))}
      </nav>
    </aside>
  );
}

export function MobileNavigation() {
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-[1.5rem] border border-[#E2E8F0] bg-white/95 p-2 shadow-xl shadow-[#0F172A]/10 backdrop-blur lg:hidden"
      aria-label="Navegación móvil"
    >
      {navItems.slice(0, 4).map((item) => (
        <a
          key={item.label}
          href={item.href}
          className={`rounded-2xl px-2 py-2 text-center text-[11px] font-black ${
            item.active ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#475569]"
          }`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
