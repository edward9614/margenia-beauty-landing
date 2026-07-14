import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerExportButton } from "@/components/customers/customer-export-button";
import { CustomerFilters } from "@/components/customers/customer-filters";
import { CustomerRowActions } from "@/components/customers/customer-row-actions";
import {
  AppPageHeader,
  BentoCard,
  BentoGrid,
  DashboardEmptyState,
  DashboardShell,
  HeroSummaryCard,
  MetricChip,
  SegmentTabs,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import { SemanticBadge, type SemanticTone } from "@/components/ui/semantic";
import {
  customerFrequencyLabel,
  customerInitials,
  customerPermissions,
  customerStatusLabel,
  filterCustomers,
  mergeCustomersWithSales,
  safeNumber,
  type CustomerRow,
  type CustomerSaleRow,
  type CustomerSearchFilters,
  type CustomerWithMetrics,
} from "@/lib/customers";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;
const pageSize = 20;

function param(params: SearchParams | undefined, key: string, fallback = "") {
  const value = params?.[key];
  return typeof value === "string" ? value : fallback;
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function dateLabel(value: string | null) {
  if (!value) return "Sin compras";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(value));
}

function frequencyTone(frequency: string): SemanticTone {
  if (frequency === "vip") return "brand";
  if (frequency === "recurring") return "positive";
  return "info";
}

function statusTone(status: string): SemanticTone {
  return status === "active" ? "positive" : "neutral";
}

export default async function CustomersPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const view = param(params, "view", "customers");
  const currentPage = Math.max(Number(param(params, "page", "1")) || 1, 1);
  const filters: CustomerSearchFilters = {
    city: param(params, "city"),
    frequency: param(params, "frequency", "all"),
    lastPurchase: param(params, "lastPurchase", "all"),
    maxSpent: optionalNumber(param(params, "maxSpent")),
    minSpent: optionalNumber(param(params, "minSpent")),
    query: param(params, "q"),
    sort: param(params, "sort", "recent"),
    status: param(params, "status", "active"),
  };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!business) redirect("/app/onboarding");

  const [{ data: customerRows, error: customersError }, { data: saleRows }] = await Promise.all([
    supabase.from("customers").select("id,business_id,full_name,document_type,document_number,phone,email,birth_date,gender,address,city,preferred_contact_channel,marketing_opt_in,tags,notes_summary,status,archived_at,created_at,updated_at").eq("business_id", business.id),
    supabase.from("sales").select("id,customer_id,sale_code,sale_date,channel,payment_status,status,total_amount,paid_amount,balance_due,gross_profit").eq("business_id", business.id).not("customer_id", "is", null),
  ]);
  const currency = business.currency || "COP";
  const formatter = new Intl.NumberFormat("es-CO", { currency, style: "currency", maximumFractionDigits: 0 });

  if (customersError) {
    return (
      <main className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-7 text-rose-900">
          <h1 className="text-2xl font-black">Clientes aún no está instalado</h1>
          <p className="mt-2 text-sm font-bold leading-6">Revisa y ejecuta manualmente la migración <code>011_customers.sql</code> en Supabase.</p>
        </section>
      </main>
    );
  }

  const allCustomers = mergeCustomersWithSales((customerRows || []) as CustomerRow[], (saleRows || []) as CustomerSaleRow[]);
  const visibleCustomers = filterCustomers(allCustomers, filters);
  const pagedCustomers = visibleCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.max(Math.ceil(visibleCustomers.length / pageSize), 1);
  const activeCustomers = allCustomers.filter((customer) => customer.status === "active");
  const currentTimestamp = new Date().getTime();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const newThisMonth = allCustomers.filter((customer) => new Date(customer.created_at).getTime() >= monthStart).length;
  const customersWithDebt = activeCustomers.filter((customer) => customer.pendingBalance > 0);
  const totalOrders = activeCustomers.reduce((total, customer) => total + customer.totalOrders, 0);
  const totalSpent = activeCustomers.reduce((total, customer) => total + customer.totalSpent, 0);
  const totalDue = customersWithDebt.reduce((total, customer) => total + customer.pendingBalance, 0);
  const mostFrequent = [...activeCustomers].sort((a, b) => b.totalOrders - a.totalOrders)[0];
  const highestRevenue = [...activeCustomers].sort((a, b) => b.totalSpent - a.totalSpent)[0];
  const permissions = customerPermissions("owner");
  const cities = Array.from(new Set(allCustomers.map((customer) => customer.city).filter((city): city is string => Boolean(city)))).sort();
  const debtSales = ((saleRows || []) as CustomerSaleRow[])
    .filter((sale) => sale.status !== "voided" && safeNumber(sale.balance_due) > 0)
    .sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());
  const customerById = new Map(allCustomers.map((customer) => [customer.id, customer]));
  const criticalDebts = debtSales.filter((sale) => currentTimestamp - new Date(sale.sale_date).getTime() > 30 * 86_400_000);

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <DashboardShell>
        <AppPageHeader
          eyebrow="Relaciones comerciales"
          title="Clientes"
          description="Conoce quién compra, cuánto vuelve y qué saldos necesitan seguimiento."
          actions={<>{permissions.canExport && <CustomerExportButton appearance="dark" scope={view === "debts" ? "debts" : "list"} />}<Link href="/app/clientes/nuevo" className={dashboardPrimaryActionClass}>Nuevo cliente</Link></>}
        />

        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <BentoGrid className="lg:grid-cols-12">
            <div className="lg:col-span-7">
              <HeroSummaryCard label="Base de clientes" value={String(allCustomers.length)} description="Una vista consolidada de la relación comercial de tu negocio.">
                <MetricChip label="Activos" value={String(activeCustomers.length)} tone="success" />
                <MetricChip label="Nuevos este mes" value={String(newThisMonth)} tone="brand" />
                <MetricChip label="Con deuda" value={String(customersWithDebt.length)} tone={customersWithDebt.length ? "warning" : "success"} />
              </HeroSummaryCard>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
              <BentoCard className="sm:col-span-2" tone={totalDue ? "warning" : "success"}>
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">Salud comercial</p><p className="mt-3 text-3xl font-black text-white">{formatter.format(totalDue)}</p><p className="mt-1 text-sm font-semibold text-slate-400">Total pendiente por cobrar</p></div>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-right"><p className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-500">Ticket</p><p className="mt-1 font-black text-cyan-200">{formatter.format(totalOrders ? totalSpent / totalOrders : 0)}</p></div>
                </div>
              </BentoCard>
              <BentoCard tone="violet"><p className="text-xs font-black uppercase tracking-[0.12em] text-violet-200/70">Más frecuente</p><p className="mt-4 truncate text-lg font-black text-white">{mostFrequent?.totalOrders ? mostFrequent.full_name : "Sin datos"}</p><p className="mt-1 text-xs font-semibold text-slate-500">{mostFrequent?.totalOrders || 0} compras</p></BentoCard>
              <BentoCard tone="success"><p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-200/70">Mayor facturación</p><p className="mt-4 truncate text-lg font-black text-white">{highestRevenue?.totalSpent ? highestRevenue.full_name : "Sin datos"}</p><p className="mt-1 text-xs font-semibold text-slate-500">{formatter.format(highestRevenue?.totalSpent || 0)}</p></BentoCard>
            </div>
          </BentoGrid>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentTabs ariaLabel="Vistas de clientes" items={[
              { active: view !== "debts", href: "/app/clientes", label: "Directorio" },
              { active: view === "debts", href: "/app/clientes?view=debts&status=debt", label: "Cuentas por cobrar" },
            ]} />
            <p className="text-xs font-bold text-slate-500">{view === "debts" ? `${debtSales.length} ventas requieren seguimiento` : `${visibleCustomers.length} clientes en esta vista`}</p>
          </div>

          {view === "debts" ? (
            <DebtsView criticalDebts={criticalDebts.length} customerById={customerById} debtSales={debtSales} formatter={formatter} now={currentTimestamp} totalDue={totalDue} />
          ) : (
            <>
              <CustomerFilters cities={cities} filters={filters} />
              {pagedCustomers.length ? (
                <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                  <div className="hidden overflow-x-auto xl:block">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-white/[0.08] bg-black/15 text-left text-[0.68rem] font-black uppercase tracking-[0.1em] text-slate-500"><tr>{["Cliente","Contacto","Compras","Total comprado","Pendiente","Última compra","Segmento","Acciones"].map((header) => <th key={header} className="px-5 py-4">{header}</th>)}</tr></thead>
                      <tbody className="divide-y divide-white/[0.06]">{pagedCustomers.map((customer) => <CustomerTableRow key={customer.id} customer={customer} formatter={formatter} />)}</tbody>
                    </table>
                  </div>
                  <div className="grid gap-3 p-3 xl:hidden">{pagedCustomers.map((customer) => <CustomerMobileCard key={customer.id} customer={customer} formatter={formatter} />)}</div>
                </section>
              ) : (
                <DashboardEmptyState
                  actionHref={filters.query || filters.status !== "active" || filters.frequency !== "all" || filters.city ? "/app/clientes" : "/app/clientes/nuevo"}
                  actionLabel={filters.query || filters.status !== "active" || filters.frequency !== "all" || filters.city ? "Quitar filtros" : "Nuevo cliente"}
                  title={filters.query || filters.status !== "active" || filters.frequency !== "all" || filters.city ? "No encontramos coincidencias" : "Tu relación con clientes empieza aquí"}
                  description={filters.query || filters.status !== "active" || filters.frequency !== "all" || filters.city ? "Prueba otros filtros o limpia la búsqueda para ampliar los resultados." : "Crea tu primer cliente para conectar ventas, compras y saldos en una sola ficha."}
                />
              )}

              {totalPages > 1 && <Pagination currentPage={currentPage} params={params} totalPages={totalPages} />}
            </>
          )}
        </div>
      </DashboardShell>
    </main>
  );
}

function DebtsView({
  criticalDebts,
  customerById,
  debtSales,
  formatter,
  now,
  totalDue,
}: {
  criticalDebts: number;
  customerById: Map<string, CustomerWithMetrics>;
  debtSales: CustomerSaleRow[];
  formatter: Intl.NumberFormat;
  now: number;
  totalDue: number;
}) {
  const customerCount = new Set(debtSales.map((sale) => sale.customer_id).filter(Boolean)).size;
  return (
    <div className="space-y-4">
      <BentoGrid className="sm:grid-cols-2 lg:grid-cols-4">
        <BentoCard className="sm:col-span-2" tone="warning"><p className="text-xs font-black uppercase tracking-[0.13em] text-amber-200/70">Cartera pendiente</p><p className="mt-3 text-4xl font-black text-white">{formatter.format(totalDue)}</p><p className="mt-2 text-sm font-semibold text-slate-400">Saldo total que requiere seguimiento</p></BentoCard>
        <BentoCard><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Clientes</p><p className="mt-3 text-3xl font-black text-white">{customerCount}</p><p className="mt-1 text-sm font-semibold text-slate-400">con saldo abierto</p></BentoCard>
        <BentoCard tone={criticalDebts ? "danger" : "success"}><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Más de 30 días</p><p className="mt-3 text-3xl font-black text-white">{criticalDebts}</p><p className="mt-1 text-sm font-semibold text-slate-400">ventas críticas</p></BentoCard>
      </BentoGrid>
      {debtSales.length ? (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4"><div><h2 className="text-lg font-black text-white">Seguimiento priorizado</h2><p className="mt-1 text-xs font-semibold text-slate-500">Ordenado desde la deuda más antigua</p></div><SemanticBadge tone="warning">{debtSales.length} pendientes</SemanticBadge></div>
          <div className="divide-y divide-white/[0.06]">
            {debtSales.map((sale) => {
              const customer = sale.customer_id ? customerById.get(sale.customer_id) : null;
              const days = Math.max(Math.floor((now - new Date(sale.sale_date).getTime()) / 86_400_000), 0);
              return (
                <article key={sale.id} className="grid gap-4 px-5 py-4 transition hover:bg-white/[0.045] md:grid-cols-[minmax(220px,1.2fr)_repeat(2,minmax(110px,0.55fr))_auto_auto] md:items-center">
                  <div><p className="font-black text-white">{customer?.full_name || "Cliente sin ficha"}</p><p className="mt-1 text-xs font-semibold text-slate-500">{sale.sale_code} · {dateLabel(sale.sale_date)}</p></div>
                  <div><p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-slate-600">Pendiente</p><p className="mt-1 font-black text-amber-200">{formatter.format(safeNumber(sale.balance_due))}</p></div>
                  <div><p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-slate-600">Antigüedad</p><p className="mt-1 font-black text-white">{days} días</p></div>
                  <SemanticBadge tone={days > 30 ? "negative" : "warning"}>{days > 30 ? "Crítica" : "Pendiente"}</SemanticBadge>
                  <div className="flex gap-2"><Link href={`/app/ventas/${sale.id}`} className={`${dashboardSecondaryActionClass} min-h-9 px-3 py-1.5 text-xs`}>Ver</Link>{customer && <Link href={`/app/clientes/${customer.id}#registrar-abono`} className={`${dashboardPrimaryActionClass} min-h-9 px-3 py-1.5 text-xs`}>Abonar</Link>}</div>
                </article>
              );
            })}
          </div>
        </section>
      ) : <DashboardEmptyState title="La cartera está al día" description="No hay ventas pendientes asociadas a clientes en este momento." />}
    </div>
  );
}

function Pagination({ currentPage, params, totalPages }: { currentPage: number; params: SearchParams | undefined; totalPages: number }) {
  const query = Object.fromEntries(Object.entries(params || {}).filter(([, value]) => typeof value === "string"));
  return (
    <nav className="flex items-center justify-center gap-3" aria-label="Paginación">
      {currentPage > 1 && <Link href={{ pathname: "/app/clientes", query: { ...query, page: currentPage - 1 } }} className={dashboardSecondaryActionClass}>Anterior</Link>}
      <span className="text-sm font-black text-slate-500">Página {currentPage} de {totalPages}</span>
      {currentPage < totalPages && <Link href={{ pathname: "/app/clientes", query: { ...query, page: currentPage + 1 } }} className={dashboardSecondaryActionClass}>Siguiente</Link>}
    </nav>
  );
}

function CustomerTableRow({ customer, formatter }: { customer: CustomerWithMetrics; formatter: Intl.NumberFormat }) {
  return (
    <tr className="transition hover:bg-white/[0.045]">
      <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-black text-white">{customerInitials(customer.full_name)}</span><div className="min-w-0"><Link href={`/app/clientes/${customer.id}`} className="font-black text-white transition hover:text-cyan-200">{customer.full_name}</Link><div className="mt-1"><SemanticBadge tone={statusTone(customer.status)}>{customerStatusLabel(customer.status)}</SemanticBadge></div></div></div></td>
      <td className="px-5 py-4"><p className="font-bold text-slate-200">{customer.phone || "Sin teléfono"}</p><p className="mt-1 text-xs font-semibold text-slate-500">{customer.email || customer.document_number || "Sin dato adicional"}</p></td>
      <td className="px-5 py-4 font-black text-white">{customer.totalOrders}</td>
      <td className="px-5 py-4 font-black text-emerald-300">{formatter.format(customer.totalSpent)}</td>
      <td className={`px-5 py-4 font-black ${customer.pendingBalance ? "text-amber-200" : "text-slate-500"}`}>{formatter.format(customer.pendingBalance)}</td>
      <td className="px-5 py-4 font-semibold text-slate-400">{dateLabel(customer.lastPurchaseAt)}</td>
      <td className="px-5 py-4"><SemanticBadge tone={customer.pendingBalance ? "warning" : frequencyTone(customer.frequency)}>{customer.pendingBalance ? "Con deuda" : customerFrequencyLabel(customer.frequency)}</SemanticBadge></td>
      <td className="px-5 py-4"><CustomerRowActions appearance="dark" customerId={customer.id} status={customer.status} /></td>
    </tr>
  );
}

function CustomerMobileCard({ customer, formatter }: { customer: CustomerWithMetrics; formatter: Intl.NumberFormat }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.055]">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-black text-white">{customerInitials(customer.full_name)}</span><div className="min-w-0 flex-1"><Link href={`/app/clientes/${customer.id}`} className="block truncate text-base font-black text-white">{customer.full_name}</Link><p className="mt-1 truncate text-sm font-semibold text-slate-500">{customer.phone || customer.email || "Sin contacto"}</p></div><SemanticBadge tone={customer.pendingBalance ? "warning" : frequencyTone(customer.frequency)}>{customer.pendingBalance ? "Deuda" : customerFrequencyLabel(customer.frequency)}</SemanticBadge></div>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07]"><MobileMetric label="Compras" value={String(customer.totalOrders)} /><MobileMetric label="Total" value={formatter.format(customer.totalSpent)} valueClass="text-emerald-300" /><MobileMetric label="Pendiente" value={formatter.format(customer.pendingBalance)} valueClass={customer.pendingBalance ? "text-amber-200" : "text-slate-300"} /><MobileMetric label="Última compra" value={dateLabel(customer.lastPurchaseAt)} /></div>
      <div className="mt-3"><CustomerRowActions appearance="dark" customerId={customer.id} status={customer.status} variant="block" /></div>
    </article>
  );
}

function MobileMetric({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return <div className="bg-[#091827] p-3"><p className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-slate-600">{label}</p><p className={`mt-1 truncate text-sm font-black ${valueClass}`}>{value}</p></div>;
}
