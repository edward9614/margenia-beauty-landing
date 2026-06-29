"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

const navItems = [
  { href: "/app", label: "Inicio", soon: false },
  { href: "/app/productos", label: "Productos", soon: false },
  { href: "/app/combos", label: "Combos", soon: false },
  { href: "/app/ventas", label: "Ventas", soon: false },
  { href: "#", label: "Inventario", soon: true },
  { href: "#", label: "Caja", soon: true },
  { href: "#", label: "Configuración", soon: true },
];

export function SidebarNavigation({
  businessName,
  userEmail,
}: {
  businessName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-r border-[#E2E8F0] bg-white lg:flex">
      <div className="border-b border-[#E2E8F0] px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="block max-w-[170px] shrink overflow-hidden [&_img]:max-w-full"
            aria-label="Ir a la landing de Margenia"
          >
            <BrandLogo showImage />
          </Link>
          <span className="shrink-0 rounded-full bg-[#E0F7FA] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#0891B2] ring-1 ring-[#A5F3FC]">
            Beta
          </span>
        </div>
      </div>

      <div className="mx-5 mt-6 rounded-[1.5rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2563EB]">
          Negocio activo
        </p>
        <p className="mt-2 truncate text-base font-black text-[#0F172A]">
          {businessName || "Tu negocio"}
        </p>
        <p className="mt-1 text-xs font-bold text-[#475569]">Base privada de trabajo</p>
      </div>

      <nav className="mt-7 space-y-1 px-5" aria-label="Navegación principal">
        {navItems.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : item.href !== "#" && pathname.startsWith(item.href);

          return (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition ${
                isActive
                  ? "bg-[#0F172A] text-white"
                  : "text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              }`}
            >
              <span>{item.label}</span>
              {item.soon && (
                <span className="rounded-full bg-[#E0F7FA] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#0891B2]">
                  Próximamente
                </span>
              )}
            </a>
          );
        })}
      </nav>

      <div className="mx-5 mb-5 mt-auto rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
          Sesión
        </p>
        <p className="mt-2 truncate text-sm font-bold text-[#0F172A]">
          {userEmail || "Sesión activa"}
        </p>
      </div>
    </aside>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-[1.5rem] border border-[#E2E8F0] bg-white/95 p-2 shadow-xl shadow-[#0F172A]/10 backdrop-blur lg:hidden"
      aria-label="Navegación móvil"
    >
      {navItems.slice(0, 4).map((item) => {
        const isActive =
          item.href === "/app"
            ? pathname === "/app"
            : item.href !== "#" && pathname.startsWith(item.href);

        return (
          <a
            key={item.label}
            href={item.href}
            className={`rounded-2xl px-2 py-2 text-center text-[11px] font-black ${
              isActive ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#475569]"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
