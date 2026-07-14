"use client";

import { useState } from "react";
import Link from "next/link";
import { dashboardFieldClass, dashboardPrimaryActionClass, dashboardSecondaryActionClass } from "@/components/ui/dashboard-primitives";
import type { CustomerSearchFilters } from "@/lib/customers";

export function CustomerFilters({ cities, filters }: { cities: string[]; filters: CustomerSearchFilters }) {
  const [open, setOpen] = useState(false);
  const activeFilters = [filters.query, filters.city, filters.status !== "active", filters.frequency !== "all", filters.lastPurchase !== "all", filters.minSpent !== null, filters.maxSpent !== null].filter(Boolean).length;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 backdrop-blur-sm sm:p-4">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div>
          <p className="text-sm font-black text-white">Filtros del directorio</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{activeFilters ? `${activeFilters} filtros activos` : "Busca y segmenta clientes"}</p>
        </div>
        <button type="button" onClick={() => setOpen((current) => !current)} className={`${dashboardSecondaryActionClass} min-h-10 px-4 py-2 text-xs`} aria-expanded={open}>
          {open ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <form className={`${open ? "grid" : "hidden"} mt-4 gap-2.5 lg:mt-0 lg:grid lg:grid-cols-12`}>
        <input name="q" defaultValue={filters.query} placeholder="Buscar nombre, teléfono, email o documento" className={`${dashboardFieldClass} lg:col-span-4`} />
        <select name="status" defaultValue={filters.status} className={`${dashboardFieldClass} lg:col-span-2`}><option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="archived">Archivados</option><option value="debt">Con deuda</option></select>
        <select name="frequency" defaultValue={filters.frequency} className={`${dashboardFieldClass} lg:col-span-2`}><option value="all">Frecuencia</option><option value="new">Nuevos</option><option value="recurring">Recurrentes</option><option value="vip">VIP</option></select>
        <select name="lastPurchase" defaultValue={filters.lastPurchase} className={`${dashboardFieldClass} lg:col-span-2`}><option value="all">Última compra</option><option value="30d">Últimos 30 días</option><option value="90d">Últimos 90 días</option><option value="inactive">Más de 90 días</option></select>
        <button className={`${dashboardPrimaryActionClass} lg:col-span-2`}>Aplicar filtros</button>
        <select name="city" defaultValue={filters.city} className={`${dashboardFieldClass} lg:col-span-3`}><option value="">Todas las ciudades</option>{cities.map((city) => <option key={city}>{city}</option>)}</select>
        <select name="sort" defaultValue={filters.sort} className={`${dashboardFieldClass} lg:col-span-3`}><option value="recent">Más recientes</option><option value="spent">Mayor compra acumulada</option><option value="orders">Más compras</option><option value="last_purchase">Última compra</option><option value="name">Nombre A-Z</option></select>
        <input type="number" min="0" name="minSpent" defaultValue={filters.minSpent ?? ""} placeholder="Compra mínima" className={`${dashboardFieldClass} lg:col-span-2`} />
        <input type="number" min="0" name="maxSpent" defaultValue={filters.maxSpent ?? ""} placeholder="Compra máxima" className={`${dashboardFieldClass} lg:col-span-2`} />
        <Link href="/app/clientes" className={`${dashboardSecondaryActionClass} lg:col-span-2`}>Limpiar</Link>
      </form>
    </section>
  );
}
