"use client";

import Link from "next/link";
import { useState } from "react";
import {
  dashboardFieldClass,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";

export function ComboFilters({
  categories,
  category,
  query,
  sort,
  status,
}: {
  categories: string[];
  category: string;
  query: string;
  sort: string;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const activeFilters = [query, status !== "active", category !== "all", sort !== "recent"].filter(Boolean).length;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 backdrop-blur-sm sm:p-4">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div>
          <p className="text-sm font-black text-white">Control de combos</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{activeFilters ? `${activeFilters} filtros activos` : "Busca y organiza tus kits"}</p>
        </div>
        <button type="button" onClick={() => setOpen((current) => !current)} className={`${dashboardSecondaryActionClass} min-h-10 px-4 py-2 text-xs`} aria-expanded={open} aria-controls="combo-filter-controls">
          {open ? "Ocultar" : "Filtros"}
        </button>
      </div>

      <form id="combo-filter-controls" className={`${open ? "grid" : "hidden"} mt-4 gap-2.5 lg:mt-0 lg:grid lg:grid-cols-12`}>
        <div className="relative lg:col-span-4">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input name="q" defaultValue={query} placeholder="Combo o categoría" className={`${dashboardFieldClass} pl-10`} />
        </div>
        <select name="status" defaultValue={status} className={`${dashboardFieldClass} lg:col-span-2`}><option value="active">Activos</option><option value="archived">Archivados</option><option value="all">Todos</option></select>
        <select name="category" defaultValue={category} className={`${dashboardFieldClass} lg:col-span-2`}><option value="all">Todas las categorías</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select name="sort" defaultValue={sort} className={`${dashboardFieldClass} lg:col-span-2`}><option value="recent">Más recientes</option><option value="name">Nombre A-Z</option><option value="margin">Mayor margen</option><option value="stock">Menor disponibilidad</option></select>
        <input type="hidden" name="page" value="1" />
        <button className={`${dashboardPrimaryActionClass} lg:col-span-2`}>Aplicar</button>
        <div className="hidden lg:col-span-10 lg:block" />
        <Link href="/app/combos" className={`${dashboardSecondaryActionClass} lg:col-span-2`}>Limpiar</Link>
      </form>
    </section>
  );
}
