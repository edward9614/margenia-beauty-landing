import Link from "next/link";

type BusinessInfo = {
  businessType: string | null;
  country: string | null;
  currency: string;
  name: string;
  primaryChannel: string | null;
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-2.5 last:border-0"><span className="text-sm font-semibold text-slate-500">{label}</span><span className="text-right text-sm font-black text-slate-200">{value || "Sin definir"}</span></div>;
}

export function AlertsCard({
  cashOpen,
  lowStockCount,
  outOfStockCount,
  pendingSalesCount,
  productsWithoutCost,
}: {
  cashOpen: boolean;
  lowStockCount: number;
  outOfStockCount: number;
  pendingSalesCount: number;
  productsWithoutCost: number;
}) {
  const alerts = [
    outOfStockCount > 0 ? { detail: `${outOfStockCount} ${outOfStockCount === 1 ? "variante agotada" : "variantes agotadas"}`, href: "/app/inventario", tone: "danger", title: "Productos agotados" } : null,
    lowStockCount > 0 ? { detail: `${lowStockCount} ${lowStockCount === 1 ? "variante necesita" : "variantes necesitan"} reposición`, href: "/app/inventario", tone: "warning", title: "Stock bajo" } : null,
    pendingSalesCount > 0 ? { detail: `${pendingSalesCount} ${pendingSalesCount === 1 ? "venta con saldo" : "ventas con saldo"} pendiente`, href: "/app/clientes?view=debts&status=debt", tone: "warning", title: "Pagos por cobrar" } : null,
    productsWithoutCost > 0 ? { detail: `${productsWithoutCost} ${productsWithoutCost === 1 ? "variante sin costo" : "variantes sin costo"} de compra`, href: "/app/productos", tone: "danger", title: "Costos incompletos" } : null,
    cashOpen ? { detail: "Hay una sesión abierta que requerirá cierre", href: "/app/caja", tone: "info", title: "Caja en operación" } : null,
  ].filter((alert): alert is NonNullable<typeof alert> => Boolean(alert));
  const toneStyles = {
    danger: "border-rose-300/15 bg-rose-300/[0.07] text-rose-200",
    info: "border-blue-300/15 bg-blue-300/[0.07] text-blue-200",
    warning: "border-amber-300/15 bg-amber-300/[0.07] text-amber-200",
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">Atención</p><h2 className="mt-2 text-xl font-black text-white">Alertas operativas</h2></div>{alerts.length > 0 && <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-200">{alerts.length}</span>}</div>
      {alerts.length ? <div className="mt-5 space-y-2">{alerts.map((alert) => <Link key={alert.title} href={alert.href} className={`block rounded-xl border p-3.5 transition hover:brightness-110 ${toneStyles[alert.tone as keyof typeof toneStyles]}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">{alert.title}</p><p className="mt-1 text-xs font-semibold leading-5 opacity-70">{alert.detail}</p></div><span aria-hidden="true" className="text-sm">→</span></div></Link>)}</div> : <div className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.07] p-4"><p className="font-black text-emerald-200">Todo bajo control</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-400">No detectamos alertas operativas en este momento.</p></div>}
    </section>
  );
}

export function MargeniaInsightCard({
  hasCombos,
  hasProducts,
  hasSales,
  hasSettingsComplete,
}: {
  hasCombos: boolean;
  hasProducts: boolean;
  hasSales: boolean;
  hasSettingsComplete: boolean;
}) {
  const insight = !hasSettingsComplete
    ? { cta: "Ir a configuración", href: "/app/configuracion", text: "Completa los datos base para adaptar moneda, país y operación.", title: "Completa la configuración" }
    : !hasProducts
      ? { cta: "Crear producto", href: "/app/productos/nuevo", text: "Registrar costos, precios y existencias activará las métricas operativas.", title: "Organiza tus productos" }
      : !hasCombos
        ? { cta: "Crear combo", href: "/app/combos/nuevo", text: "Agrupa productos para crear ofertas claras sin perder margen.", title: "Crea tu primer combo" }
        : !hasSales
          ? { cta: "Registrar venta", href: "/app/ventas/nueva", text: "Registra tu primera venta para ver utilidad, caja y evolución.", title: "Empieza a medir resultados" }
          : { cta: "Registrar venta", href: "/app/ventas/nueva", text: "Mantén ventas, inventario y caja actualizados para tomar mejores decisiones.", title: "Sigue moviendo tu negocio" };

  return (
    <section className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.07] p-5 backdrop-blur-sm sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-300">Consejo de Margenia</p>
      <h2 className="mt-3 text-xl font-black text-white">{insight.title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{insight.text}</p>
      <Link href={insight.href} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2.5 text-sm font-black text-violet-100 transition hover:bg-violet-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">{insight.cta}</Link>
    </section>
  );
}

export function BusinessStatusCard({ business }: { business: BusinessInfo }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Configuración</p>
      <h2 className="mt-2 text-xl font-black text-white">Datos pendientes</h2>
      <div className="mt-4"><InfoRow label="Nombre" value={business.name} /><InfoRow label="Tipo" value={business.businessType} /><InfoRow label="País" value={business.country} /><InfoRow label="Moneda" value={business.currency} /><InfoRow label="Canal" value={business.primaryChannel} /></div>
      <Link href="/app/configuracion" className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-black text-slate-200 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Editar configuración</Link>
    </section>
  );
}
