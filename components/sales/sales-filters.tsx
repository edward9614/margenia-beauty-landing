"use client";

import Link from "next/link";
import { useState } from "react";
import { dashboardFieldClass, dashboardPrimaryActionClass, dashboardSecondaryActionClass } from "@/components/ui/dashboard-primitives";

export function SalesFilters({ channel, method, payment, query, range, status }: { channel: string; method: string; payment: string; query: string; range: string; status: string }) {
  const [open, setOpen] = useState(false);
  const activeFilters = [query, status !== "completed", payment !== "all", range !== "month", channel !== "all", method !== "all"].filter(Boolean).length;
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 backdrop-blur-sm sm:p-4">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div><p className="text-sm font-black text-white">Control de ventas</p><p className="mt-0.5 text-xs font-semibold text-slate-500">{activeFilters ? `${activeFilters} filtros activos` : "Busca y segmenta movimientos"}</p></div>
        <button type="button" onClick={() => setOpen((current) => !current)} className={`${dashboardSecondaryActionClass} min-h-10 px-4 py-2 text-xs`} aria-expanded={open} aria-controls="sales-filter-controls">{open ? "Ocultar" : "Filtros"}</button>
      </div>
      <form id="sales-filter-controls" className={`${open ? "grid" : "hidden"} mt-4 gap-2.5 lg:mt-0 lg:grid lg:grid-cols-12`}>
        <div className="relative lg:col-span-4">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input name="q" defaultValue={query} placeholder="Código de venta o cliente" className={`${dashboardFieldClass} pl-10`} />
        </div>
        <select name="status" defaultValue={status} className={`${dashboardFieldClass} lg:col-span-2`}><option value="completed">Completadas</option><option value="voided">Anuladas</option><option value="all">Todos los estados</option></select>
        <select name="payment" defaultValue={payment} className={`${dashboardFieldClass} lg:col-span-2`}><option value="all">Todos los pagos</option><option value="paid">Pagadas</option><option value="partial">Parciales</option><option value="pending">Pendientes</option></select>
        <select name="range" defaultValue={range} className={`${dashboardFieldClass} lg:col-span-2`}><option value="today">Hoy</option><option value="7d">Últimos 7 días</option><option value="month">Mes actual</option><option value="all">Todo el historial</option></select>
        <button className={`${dashboardPrimaryActionClass} lg:col-span-2`}>Filtrar</button>
        <select name="channel" defaultValue={channel} className={`${dashboardFieldClass} lg:col-span-3`}><option value="all">Todos los canales</option><option value="local">Local</option><option value="instagram">Instagram</option><option value="whatsapp">WhatsApp</option><option value="online_store">Tienda online</option><option value="feria">Feria</option><option value="otro">Otro</option></select>
        <select name="method" defaultValue={method} className={`${dashboardFieldClass} lg:col-span-3`}><option value="all">Todos los métodos</option><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option><option value="nequi">Nequi</option><option value="daviplata">Daviplata</option><option value="other">Otro</option></select>
        <div className="lg:col-span-4" />
        <Link href="/app/ventas" className={`${dashboardSecondaryActionClass} lg:col-span-2`}>Limpiar</Link>
      </form>
    </section>
  );
}
