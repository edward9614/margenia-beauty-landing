"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/(dashboard)/app/actions";
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

function userInitial(email?: string) {
  return email?.trim().charAt(0).toUpperCase() || "M";
}

const desktopItemBase =
  "relative flex min-h-11 w-full items-center rounded-xl border px-3.5 py-2.5 text-left text-sm font-black transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

const desktopItemActive =
  "border-cyan-300/20 bg-[linear-gradient(110deg,rgba(37,99,235,0.24),rgba(6,182,212,0.12))] text-white shadow-[0_8px_24px_rgba(6,182,212,0.08)]";

const desktopItemIdle =
  "border-transparent text-slate-400 hover:border-white/[0.07] hover:bg-white/[0.055] hover:text-white";

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
    <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.07] bg-[linear-gradient(180deg,#020617_0%,#06111F_52%,#071827_100%)] text-slate-100 shadow-[14px_0_40px_rgba(2,6,23,0.08)] lg:flex">
      <div className="border-b border-white/[0.07] px-5 py-5">
        <Link
          href="/"
          className="flex min-h-14 items-center rounded-xl bg-white px-3.5 py-2.5 shadow-[0_12px_30px_rgba(2,6,23,0.18)] ring-1 ring-white/80 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 [&_img]:max-w-full"
          aria-label="Ir a la landing de Margenia"
        >
          <BrandLogo compact showImage />
        </Link>
        <p className="mt-3 px-1 text-[0.64rem] font-black uppercase tracking-[0.18em] text-slate-600">Centro de control</p>
      </div>

      <div className="mx-4 mt-5 overflow-hidden rounded-2xl border border-cyan-300/15 bg-white/[0.045] p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
          <p className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-cyan-300">Negocio activo</p>
        </div>
        <p className="mt-3 truncate text-base font-black text-white">{businessName || "Tu negocio"}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">Base privada de trabajo</p>
      </div>

      <nav className="mt-6 space-y-1 px-4" aria-label="Navegación principal">
        <p className="mb-2 px-3 text-[0.64rem] font-black uppercase tracking-[0.18em] text-slate-600">Operación</p>
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
                  onClick={() => setOpenMenus((current) => ({ ...current, [item.label]: !current[item.label] }))}
                  aria-controls={`desktop-submenu-${item.label}`}
                  aria-expanded={Boolean(isOpen)}
                  className={`${desktopItemBase} justify-between ${isActive ? desktopItemActive : desktopItemIdle}`}
                >
                  {isActive && <span aria-hidden="true" className="absolute -left-px top-2.5 h-6 w-0.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.75)]" />}
                  <span>{item.label}</span>
                  <svg className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180 text-cyan-300" : ""}`} aria-hidden="true" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" /></svg>
                </button>

                <div
                  id={`desktop-submenu-${item.label}`}
                  aria-hidden={!isOpen}
                  className={`grid transition-[grid-template-rows,opacity] duration-200 ${isOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <div className="relative ml-4 space-y-1 border-l border-white/10 py-1 pl-3">
                      {item.children!.map((child) => {
                        const childActive = isActivePath(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            tabIndex={isOpen ? 0 : -1}
                            aria-current={childActive ? "page" : undefined}
                            className={`relative flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${childActive ? "bg-cyan-300/10 text-cyan-200" : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"}`}
                          >
                            {childActive && <span aria-hidden="true" className="absolute -left-[0.84rem] h-4 w-px bg-cyan-300" />}
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`${desktopItemBase} justify-between ${isActive ? desktopItemActive : desktopItemIdle}`}
            >
              {isActive && <span aria-hidden="true" className="absolute -left-px top-2.5 h-6 w-0.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.75)]" />}
              <span>{item.label}</span>
              {item.soon && <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-cyan-300">Próximamente</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 mb-4 mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-black text-cyan-200">{userInitial(userEmail)}</span>
          <div className="min-w-0 flex-1"><p className="text-[0.64rem] font-black uppercase tracking-[0.13em] text-slate-600">Sesión activa</p><p className="mt-1 truncate text-xs font-bold text-slate-300">{userEmail || "Usuario de Margenia"}</p></div>
        </div>
        <form action={signOut} className="mt-3">
          <button type="submit" className="min-h-9 w-full rounded-lg border border-white/[0.08] bg-black/15 px-3 py-2 text-xs font-black text-slate-400 transition hover:border-rose-300/20 hover:bg-rose-300/10 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Cerrar sesión</button>
        </form>
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
        <div id="mobile-products-menu" className="mb-2 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#07111F]/95 p-2 shadow-[0_18px_45px_rgba(2,6,23,0.35)] backdrop-blur-xl">
          <MobileSubitem href="/app/productos" label="Mis productos" pathname={pathname} onNavigate={() => setProductsOpen(false)} />
          <MobileSubitem href="/app/combos" label="Combos" pathname={pathname} onNavigate={() => setProductsOpen(false)} />
        </div>
      )}

      <div className="grid grid-cols-4 rounded-2xl border border-white/10 bg-[#050E1A]/95 p-1.5 shadow-[0_18px_45px_rgba(2,6,23,0.38)] backdrop-blur-xl sm:grid-cols-8">
        {navItems.map((item) => {
          const hasChildren = "children" in item && Boolean(item.children?.length);
          const isActive = hasChildren ? item.children!.some((child) => isActivePath(pathname, child.href)) : isActivePath(pathname, item.href);
          const mobileClass = `relative min-h-10 rounded-xl px-1 py-2 text-center text-[0.58rem] font-black transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:text-[0.64rem] ${isActive || (hasChildren && productsOpen) ? "bg-cyan-300/10 text-cyan-200" : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"}`;

          if (hasChildren) {
            return <button key={item.label} type="button" onClick={() => setProductsOpen((current) => !current)} aria-controls="mobile-products-menu" aria-expanded={productsOpen} className={mobileClass}>{(isActive || productsOpen) && <span aria-hidden="true" className="absolute inset-x-3 top-0 h-px bg-cyan-300" />}{item.label}</button>;
          }

          return <Link key={item.label} href={item.href} aria-current={isActive ? "page" : undefined} className={mobileClass}>{isActive && <span aria-hidden="true" className="absolute inset-x-3 top-0 h-px bg-cyan-300" />}{item.label}</Link>;
        })}
      </div>
    </nav>
  );
}

function MobileSubitem({ href, label, onNavigate, pathname }: { href: string; label: string; onNavigate: () => void; pathname: string }) {
  const active = isActivePath(pathname, href);
  return <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`rounded-xl border px-3 py-3 text-center text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${active ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" : "border-white/[0.06] bg-white/[0.035] text-slate-400 hover:bg-white/[0.07] hover:text-white"}`}>{label}</Link>;
}
