import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductAnalyticsEvent } from "@/components/products/product-analytics";
import { SaleMobileMetric, SalesMetricCard, SalesStatusBadge, salesDarkTone } from "@/components/sales/sales-dashboard-ui";
import { SalesFilters } from "@/components/sales/sales-filters";
import { AppPageHeader, DashboardShell, dashboardPrimaryActionClass, dashboardSecondaryActionClass } from "@/components/ui/dashboard-primitives";
import type { SemanticTone } from "@/components/ui/semantic";
import {
  salePaymentStatusLabel,
  saleStatusLabel,
  type SaleRow,
} from "@/lib/sales";
import { moneyFormatter, toSafeNumber } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

const pageSize = 20;

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams | undefined, key: string, fallback = "") {
  const value = params?.[key];
  return typeof value === "string" ? value : fallback;
}

function dateRange(range: string) {
  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  if (range === "7d") {
    start.setDate(now.getDate() - 7);
    return start.toISOString();
  }

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function paymentTone(status: string | null | undefined): SemanticTone {
  if (status === "paid") return "positive";
  if (status === "partial") return "warning";
  if (status === "pending") return "negative";
  return "neutral";
}

function saleStatusTone(status: string | null | undefined): SemanticTone {
  if (status === "voided") return "neutral";
  return "info";
}

function amountTone(value: number): SemanticTone {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function pendingTone(value: number): SemanticTone {
  return value > 0 ? "warning" : "neutral";
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = getParam(params, "q").trim();
  const status = getParam(params, "status", "completed");
  const payment = getParam(params, "payment", "all");
  const range = getParam(params, "range", "month");
  const channel = getParam(params, "channel", "all");
  const method = getParam(params, "method", "all");
  const page = Math.max(Number(getParam(params, "page", "1")) || 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) {
    redirect("/app/onboarding");
  }

  const formatter = moneyFormatter(business.currency || "COP");
  const [{ data: productRows }, { data: comboRows }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id,products!inner(status)")
      .eq("business_id", business.id)
      .eq("status", "active")
      .eq("products.status", "active")
      .limit(1),
    supabase
      .from("combos")
      .select("id")
      .eq("business_id", business.id)
      .eq("status", "active")
      .limit(1),
  ]);
  const hasCatalog = Boolean(productRows?.length || comboRows?.length);

  let query = supabase
    .from("sales")
    .select(
      "id,sale_code,sale_date,customer_name,customer_phone,channel,payment_status,status,total_amount,paid_amount,balance_due,total_cost,gross_profit,gross_margin_percent,sale_items(item_name),sale_payments(payment_method)",
      { count: "exact" },
    )
    .eq("business_id", business.id);

  if (status !== "all") query = query.eq("status", status);
  if (payment !== "all") query = query.eq("payment_status", payment);
  if (channel !== "all") query = query.eq("channel", channel);
  if (range !== "all") query = query.gte("sale_date", dateRange(range));
  if (q) {
    const escaped = q.replaceAll(",", " ");
    query = query.or(`sale_code.ilike.%${escaped}%,customer_name.ilike.%${escaped}%`);
  }

  query = query.order("sale_date", { ascending: false });
  const { count, data: sales, error } = await query.range(from, to);
  let saleList = (sales || []) as unknown as (SaleRow & {
    sale_payments?: { payment_method: string }[] | null;
  })[];

  if (method !== "all") {
    saleList = saleList.filter((sale) =>
      (sale.sale_payments || []).some((paymentRow) => paymentRow.payment_method === method),
    );
  }

  const monthStart = dateRange("month");
  const { data: metricSales } = await supabase
    .from("sales")
    .select("sale_date,status,total_amount,gross_profit,balance_due,payment_status")
    .eq("business_id", business.id)
    .eq("status", "completed")
    .gte("sale_date", monthStart);
  const metrics = ((metricSales || []) as SaleRow[]).reduce(
    (acc, sale) => {
      const saleDate = new Date(sale.sale_date);
      const today = new Date();
      const isToday = saleDate.toDateString() === today.toDateString();

      if (isToday) acc.today += toSafeNumber(sale.total_amount);
      acc.month += toSafeNumber(sale.total_amount);
      acc.profit += toSafeNumber(sale.gross_profit);
      acc.pending += toSafeNumber(sale.balance_due);

      return acc;
    },
    { month: 0, pending: 0, profit: 0, today: 0 },
  );
  const totalPages = Math.max(Math.ceil((count || 0) / pageSize), 1);
  const hasFilters = Boolean(q || status !== "completed" || payment !== "all" || range !== "month" || channel !== "all" || method !== "all");

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <ProductAnalyticsEvent eventName="sales_module_view" />
      <DashboardShell>
        <AppPageHeader eyebrow="Ventas" title="Ventas" description="Registra ingresos, controla pagos pendientes y entiende la utilidad de cada venta." actions={hasCatalog ? <Link href="/app/ventas/nueva" className={dashboardPrimaryActionClass}>Nueva venta</Link> : <Link href="/app/productos" className={dashboardSecondaryActionClass}>Primero crea productos</Link>} />
        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SalesMetricCard label="Ventas de hoy" value={formatter.format(metrics.today)} description="Ingresos registrados durante el día" icon="sales" tone={metrics.today > 0 ? "info" : "neutral"} />
            <SalesMetricCard label="Ingresos del mes" value={formatter.format(metrics.month)} description="Facturación acumulada del periodo" icon="income" tone={metrics.month > 0 ? "positive" : "neutral"} />
            <SalesMetricCard label="Utilidad bruta" value={formatter.format(metrics.profit)} description="Ganancia estimada antes de otros gastos" icon="profit" tone={amountTone(metrics.profit)} />
            <SalesMetricCard label="Pendiente por cobrar" value={formatter.format(metrics.pending)} description="Saldo abierto de ventas completadas" icon="pending" tone={pendingTone(metrics.pending)} />
          </section>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Control comercial</p><h2 className="mt-1 text-xl font-black text-white">Historial de ventas</h2></div><p className="text-xs font-bold text-slate-500">{saleList.length} ventas en esta página</p></div>
          <SalesFilters channel={channel} method={method} payment={payment} query={q} range={range} status={status} />

          {error ? (
            <section className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-6 text-rose-100"><h2 className="text-xl font-black">No pudimos cargar ventas</h2><p className="mt-2 text-sm font-semibold text-rose-100/70">Revisa que la migración 006_sales.sql exista en Supabase.</p></section>
          ) : saleList.length ? (
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-[1180px] w-full text-sm">
                  <thead className="border-b border-white/[0.08] bg-black/15 text-left text-[0.68rem] font-black uppercase tracking-[0.1em] text-slate-500"><tr>{["Venta", "Fecha", "Cliente", "Total", "Pagado", "Pendiente", "Utilidad", "Pago", "Estado", "Acciones"].map((header) => <th key={header} className="px-4 py-4">{header}</th>)}</tr></thead>
                  <tbody className="divide-y divide-white/[0.06]">{saleList.map((sale) => {
                    const balanceDue = toSafeNumber(sale.balance_due);
                    const grossProfit = toSafeNumber(sale.gross_profit);
                    const paidTone = amountTone(toSafeNumber(sale.paid_amount));
                    const balanceTone = pendingTone(balanceDue);
                    const profitTone = amountTone(grossProfit);
                    return <tr key={sale.id} className="transition duration-200 hover:bg-white/[0.045]">
                      <td className="px-4 py-4"><Link href={`/app/ventas/${sale.id}`} className="font-black text-white transition hover:text-cyan-200">{sale.sale_code}</Link></td>
                      <td className="px-4 py-4 font-semibold text-slate-500">{new Date(sale.sale_date).toLocaleDateString("es-CO")}</td>
                      <td className="px-4 py-4 font-bold text-slate-300">{sale.customer_name || "Sin cliente"}</td>
                      <td className="px-4 py-4 font-black text-cyan-100">{formatter.format(toSafeNumber(sale.total_amount))}</td>
                      <td className={`px-4 py-4 font-black ${salesDarkTone[paidTone].text}`}>{formatter.format(toSafeNumber(sale.paid_amount))}</td>
                      <td className={`px-4 py-4 font-black ${salesDarkTone[balanceTone].text}`}>{formatter.format(balanceDue)}</td>
                      <td className={`px-4 py-4 font-black ${salesDarkTone[profitTone].text}`}>{formatter.format(grossProfit)}</td>
                      <td className="px-4 py-4"><SalesStatusBadge tone={paymentTone(sale.payment_status)}>{salePaymentStatusLabel(sale.payment_status)}</SalesStatusBadge></td>
                      <td className="px-4 py-4"><SalesStatusBadge tone={saleStatusTone(sale.status)}>{saleStatusLabel(sale.status)}</SalesStatusBadge></td>
                      <td className="px-4 py-4"><Link href={`/app/ventas/${sale.id}`} className={`${dashboardSecondaryActionClass} min-h-9 px-3 py-1.5 text-xs`}>Ver</Link></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              <div className="grid gap-3 p-3 xl:hidden">{saleList.map((sale) => {
                const balanceDue = toSafeNumber(sale.balance_due);
                const profit = toSafeNumber(sale.gross_profit);
                return <article key={sale.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.055]">
                  <div className="flex items-start justify-between gap-3"><div><Link href={`/app/ventas/${sale.id}`} className="font-black text-white">{sale.sale_code}</Link><p className="mt-1 text-sm font-semibold text-slate-500">{sale.customer_name || "Sin cliente"} · {new Date(sale.sale_date).toLocaleDateString("es-CO")}</p></div><SalesStatusBadge tone={paymentTone(sale.payment_status)}>{salePaymentStatusLabel(sale.payment_status)}</SalesStatusBadge></div>
                  <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07]"><SaleMobileMetric label="Total" value={formatter.format(toSafeNumber(sale.total_amount))} tone="brand" /><SaleMobileMetric label="Utilidad" value={formatter.format(profit)} tone={amountTone(profit)} /><SaleMobileMetric label="Pendiente" value={formatter.format(balanceDue)} tone={pendingTone(balanceDue)} /><SaleMobileMetric label="Estado" value={saleStatusLabel(sale.status)} tone={saleStatusTone(sale.status)} /></div>
                  <Link href={`/app/ventas/${sale.id}`} className={`${dashboardSecondaryActionClass} mt-3 w-full`}>Ver venta</Link>
                </article>;
              })}</div>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <h2 className="mt-4 text-xl font-black text-white">{hasFilters ? "No encontramos ventas" : hasCatalog ? "Aún no tienes ventas registradas" : "Primero crea productos"}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-400">{hasFilters ? "Prueba otros filtros o limpia la búsqueda para ampliar los resultados." : hasCatalog ? "Cuando registres ventas, Margenia actualizará ingresos, utilidad, pagos e inventario." : "Para registrar ventas necesitas productos o combos activos."}</p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">{hasFilters ? <Link href="/app/ventas" className={dashboardPrimaryActionClass}>Quitar filtros</Link> : hasCatalog ? <Link href="/app/ventas/nueva" className={dashboardPrimaryActionClass}>Nueva venta</Link> : <><Link href="/app/productos" className={dashboardPrimaryActionClass}>Ir a Productos</Link><Link href="/app/combos" className={dashboardSecondaryActionClass}>Ir a Combos</Link></>}</div>
            </section>
          )}

          {saleList.length > 0 && <nav className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row" aria-label="Paginación de ventas"><Link href={{ pathname: "/app/ventas", query: { ...params, page: Math.max(page - 1, 1) } }} className={`${dashboardSecondaryActionClass} w-full sm:w-auto ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>Anterior</Link><span className="text-sm font-black text-slate-500">Página {page} de {totalPages}</span><Link href={{ pathname: "/app/ventas", query: { ...params, page: Math.min(page + 1, totalPages) } }} className={`${dashboardSecondaryActionClass} w-full sm:w-auto ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}>Siguiente</Link></nav>}
        </div>
      </DashboardShell>
    </main>
  );
}
