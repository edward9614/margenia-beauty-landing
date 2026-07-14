"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

const navItems = [
  { href: "/app", label: "Inicio", soon: false },
  {
    href: "/app/productos",
    label: "Productos",
    soon: false,
    children: [
      { href: "/app/productos", label: "Mis productos" },
      { href: "/app/combos", label: "Combos" },
    ],
  },
  { href: "/app/ventas", label: "Ventas", soon: false },
  { href: "/app/clientes", label: "Clientes", soon: false },
  { href: "/app/inventario", label: "Inventario", soon: false },
  { href: "/app/caja", label: "Caja", soon: false },
  { href: "/app/reportes", label: "Reportes", soon: false },
  { href: "/app/configuracion", label: "Configuración", soon: false },
];

function isActivePath(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function SidebarNavigation({
  businessName,
  userEmail,
}: {
  businessName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const [hoveredMenu, setHoveredMenu] = useState("");
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-r border-[#E2E8F0] bg-white lg:flex">
      <div className="border-b border-[#E2E8F0] px-5 py-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="block max-w-[170px] shrink overflow-hidden [&_img]:max-w-full"
            aria-label="Ir a la landing de Margenia"
          >
            <BrandLogo showImage />
          </Link>
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
          const hasChildren = "children" in item && Boolean(item.children?.length);
          const isActive = hasChildren
            ? item.children!.some((child) => isActivePath(pathname, child.href))
            : isActivePath(pathname, item.href);
          const isOpen = hasChildren && (isActive || openMenus[item.label] || hoveredMenu === item.label);

          if (hasChildren) {
            return (
              <div
                key={item.label}
                className="space-y-1"
                onMouseEnter={() => setHoveredMenu(item.label)}
                onMouseLeave={() => setHoveredMenu("")}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenus((current) => ({
                      ...current,
                      [item.label]: !current[item.label],
                    }))
                  }
                  aria-expanded={Boolean(isOpen)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                    isActive
                      ? "bg-[#0F172A] text-white"
                      : "text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                  }`}
                >
                  <span>{item.label}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {isOpen && (
                  <div className="ml-4 space-y-1 border-l border-[#E2E8F0] pl-3">
                    {item.children!.map((child) => {
                      const childActive = isActivePath(pathname, child.href);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center rounded-2xl px-4 py-2.5 text-sm font-black transition ${
                            childActive
                              ? "bg-[#EFF6FF] text-[#2563EB] ring-1 ring-[#BFDBFE]"
                              : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#2563EB]"
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
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
            </Link>
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
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden" aria-label="Navegación móvil">
      {productsOpen && (
        <div className="mb-2 grid grid-cols-2 gap-2 rounded-[1.5rem] border border-[#E2E8F0] bg-white/95 p-2 shadow-xl shadow-[#0F172A]/10 backdrop-blur">
          <Link
            href="/app/productos"
            onClick={() => setProductsOpen(false)}
            className={`rounded-2xl px-3 py-3 text-center text-[10px] font-black ${
              isActivePath(pathname, "/app/productos")
                ? "bg-[#EFF6FF] text-[#2563EB]"
                : "text-[#475569]"
            }`}
          >
            Mis productos
          </Link>
          <Link
            href="/app/combos"
            onClick={() => setProductsOpen(false)}
            className={`rounded-2xl px-3 py-3 text-center text-[10px] font-black ${
              isActivePath(pathname, "/app/combos")
                ? "bg-[#EFF6FF] text-[#2563EB]"
                : "text-[#475569]"
            }`}
          >
            Combos
          </Link>
        </div>
      )}

      <div className="grid grid-cols-4 rounded-[1.5rem] border border-[#E2E8F0] bg-white/95 p-2 shadow-xl shadow-[#0F172A]/10 backdrop-blur sm:grid-cols-8">
        {navItems.map((item) => {
          const hasChildren = "children" in item && Boolean(item.children?.length);
          const isActive = hasChildren
            ? item.children!.some((child) => isActivePath(pathname, child.href))
            : isActivePath(pathname, item.href);

          if (hasChildren) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setProductsOpen((current) => !current)}
                aria-expanded={productsOpen}
                className={`rounded-2xl px-1 py-2 text-center text-[9px] font-black sm:text-[10px] ${
                  isActive || productsOpen ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#475569]"
                }`}
              >
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-2xl px-1 py-2 text-center text-[9px] font-black sm:text-[10px] ${
                isActive ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#475569]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
