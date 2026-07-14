import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerExportButton } from "@/components/customers/customer-export-button";
import { CustomerRowActions } from "@/components/customers/customer-row-actions";
import { InfoTooltip } from "@/components/ui/info-tooltip";
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
  if (status === "active") return "positive";
  return "neutral";
}

function MetricCard({
  help,
  label,
  tone = "info",
  value,
}: {
  help: string;
  label: string;
  tone?: SemanticTone;
  value: string;
}) {
  const tones: Record<SemanticTone, string> = {
    brand: "from-[#ECFEFF] to-white text-[#0E7490]",
    info: "from-[#EFF6FF] to-white text-[#1D4ED8]",
    negative: "from-[#FEF2F2] to-white text-[#B91C1C]",
    neutral: "from-[#F8FAFC] to-white text-[#475569]",
    positive: "from-[#F0FDF4] to-white text-[#166534]",
    warning: "from-[#FFFBEB] to-white text-[#B45309]",
  };

  return (
    <article className={`group min-h-36 rounded-[1.75rem] border border-[#E2E8F0] bg-gradient-to-br p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.13em] text-[#64748B] dark:text-slate-400">{label}</p>
        <InfoTooltip content={help} title={label} />
      </div>
      <p className="mt-5 text-2xl font-black tracking-tight text-[#0F172A] dark:text-white sm:text-3xl">{value}</p>
    </article>
  );
}

function CustomerEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#BFDBFE] bg-white px-5 py-14 text-center dark:border-slate-700 dark:bg-slate-950">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-[#EFF6FF] to-[#E0F7FA] text-[#2563EB]">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-10 w-10"><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1v6m-3-3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </div>
      <h2 className="mt-5 text-2xl font-black text-[#0F172A] dark:text-white">{filtered ? "No encontramos coincidencias" : "Tu relación con clientes empieza aquí"}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-[#64748B] dark:text-slate-400">
        {filtered ? "Prueba con otros filtros o limpia la búsqueda." : "Crea tu primer cliente para conectar ventas, compras y saldos en una sola ficha."}
      </p>
      <Link href={filtered ? "/app/clientes" : "/app/clientes/nuevo"} className="mt-6 inline-flex rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20">
        {filtered ? "Quitar filtros" : "Crear cliente"}
      </Link>
    </section>
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
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
        <section className="rounded-[2rem] border border-[#FECACA] bg-[#FEF2F2] p-7 text-[#991B1B]">
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

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <div className="w-full max-w-none space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">Relaciones comerciales</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0F172A] dark:text-white sm:text-4xl">Clientes</h1>
              <p className="mt-3 text-sm font-bold leading-6 text-[#475569] dark:text-slate-400">Conoce quién compra, cuánto vuelve y qué saldos necesitan seguimiento.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {permissions.canExport && <CustomerExportButton scope={view === "debts" ? "debts" : "list"} />}
              <Link href="/app/clientes/nuevo" className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-3 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:brightness-110">Nuevo cliente</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total de clientes" value={String(allCustomers.length)} help="Incluye activos, inactivos y archivados." />
          <MetricCard label="Clientes activos" value={String(activeCustomers.length)} tone="positive" help="Clientes disponibles para nuevas ventas y seguimiento." />
          <MetricCard label="Nuevos este mes" value={String(allCustomers.filter((customer) => new Date(customer.created_at).getTime() >= monthStart).length)} tone="brand" help="Clientes creados desde el primer día del mes." />
          <MetricCard label="Clientes con deuda" value={String(customersWithDebt.length)} tone={customersWithDebt.length ? "warning" : "positive"} help="Clientes con al menos una venta pendiente o parcial." />
          <MetricCard label="Ticket promedio" value={formatter.format(totalOrders ? totalSpent / totalOrders : 0)} tone="info" help="Promedio comprado por venta entre todos los clientes activos." />
          <MetricCard label="Total por cobrar" value={formatter.format(totalDue)} tone={totalDue ? "warning" : "positive"} help="Suma de saldos pendientes en ventas asociadas a clientes." />
          <MetricCard label="Más frecuente" value={mostFrequent?.totalOrders ? mostFrequent.full_name : "Sin datos"} tone="brand" help="Cliente con mayor número de compras completadas." />
          <MetricCard label="Mayor facturación" value={highestRevenue?.totalSpent ? highestRevenue.full_name : "Sin datos"} tone="positive" help="Cliente con mayor valor acumulado comprado." />
        </section>

        <nav className="flex w-fit gap-1 rounded-full border border-[#E2E8F0] bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-950" aria-label="Vistas de clientes">
          <Link href="/app/clientes" className={`rounded-full px-5 py-2.5 text-sm font-black transition ${view !== "debts" ? "bg-[#0F172A] text-white" : "text-[#475569] hover:bg-[#F8FAFC]"}`}>Directorio</Link>
          <Link href="/app/clientes?view=debts&status=debt" className={`rounded-full px-5 py-2.5 text-sm font-black transition ${view === "debts" ? "bg-[#0F172A] text-white" : "text-[#475569] hover:bg-[#F8FAFC]"}`}>Cuentas por cobrar</Link>
        </nav>

        {view === "debts" ? (
          <section className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-[#E2E8F0] p-5 sm:p-6">
              <h2 className="text-2xl font-black text-[#0F172A] dark:text-white">Ventas pendientes</h2>
              <p className="mt-2 text-sm font-bold text-[#64748B]">{debtSales.length} ventas · {formatter.format(totalDue)} por cobrar</p>
            </div>
            {debtSales.length ? (
              <div className="divide-y divide-[#E2E8F0]">
                {debtSales.map((sale) => {
                  const customer = sale.customer_id ? customerById.get(sale.customer_id) : null;
                  const days = Math.max(Math.floor((currentTimestamp - new Date(sale.sale_date).getTime()) / 86_400_000), 0);
                  return (
                    <article key={sale.id} className="grid gap-4 p-5 transition hover:bg-[#F8FAFC] dark:hover:bg-slate-900 md:grid-cols-[minmax(220px,1.2fr)_repeat(3,minmax(120px,0.6fr))_auto] md:items-center">
                      <div><p className="font-black text-[#0F172A] dark:text-white">{customer?.full_name || "Cliente sin ficha"}</p><p className="text-xs font-bold text-[#64748B]">{sale.sale_code} · {dateLabel(sale.sale_date)}</p></div>
                      <div><p className="text-xs font-black uppercase text-[#94A3B8]">Pendiente</p><p className="mt-1 font-black text-[#B45309]">{formatter.format(safeNumber(sale.balance_due))}</p></div>
                      <div><p className="text-xs font-black uppercase text-[#94A3B8]">Antigüedad</p><p className="mt-1 font-black text-[#0F172A] dark:text-white">{days} días</p></div>
                      <SemanticBadge tone={days > 30 ? "negative" : "warning"}>{days > 30 ? "Vencida" : "Pendiente"}</SemanticBadge>
                      <div className="flex gap-2"><Link href={`/app/ventas/${sale.id}`} className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#2563EB] ring-1 ring-[#BFDBFE]">Ver venta</Link>{customer && <Link href={`/app/clientes/${customer.id}#registrar-abono`} className="rounded-full bg-[#EFF6FF] px-4 py-2 text-xs font-black text-[#2563EB]">Abonar</Link>}</div>
                    </article>
                  );
                })}
              </div>
            ) : <CustomerEmptyState filtered={false} />}
          </section>
        ) : (
          <>
            <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <form className="grid gap-3 lg:grid-cols-4 xl:grid-cols-8">
                <input name="q" defaultValue={filters.query} placeholder="Nombre, teléfono, email o documento" className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#2563EB] lg:col-span-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                <select name="status" defaultValue={filters.status} className="rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="archived">Archivados</option><option value="debt">Con deuda</option></select>
                <select name="frequency" defaultValue={filters.frequency} className="rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="all">Frecuencia</option><option value="new">Nuevos</option><option value="recurring">Recurrentes</option><option value="vip">VIP</option></select>
                <select name="lastPurchase" defaultValue={filters.lastPurchase} className="rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="all">Última compra</option><option value="30d">Últimos 30 días</option><option value="90d">Últimos 90 días</option><option value="inactive">Hace más de 90 días</option></select>
                <select name="city" defaultValue={filters.city} className="rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">Todas las ciudades</option>{cities.map((city) => <option key={city}>{city}</option>)}</select>
                <select name="sort" defaultValue={filters.sort} className="rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="recent">Más recientes</option><option value="spent">Mayor compra acumulada</option><option value="orders">Más compras</option><option value="last_purchase">Última compra</option><option value="name">Nombre A-Z</option></select>
                <button className="rounded-2xl bg-[#0F172A] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1E293B]">Filtrar</button>
                <div className="grid grid-cols-2 gap-3 lg:col-span-4 xl:col-span-2"><input type="number" min="0" name="minSpent" defaultValue={filters.minSpent ?? ""} placeholder="Compra mín." className="rounded-2xl border border-[#E2E8F0] px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" /><input type="number" min="0" name="maxSpent" defaultValue={filters.maxSpent ?? ""} placeholder="Compra máx." className="rounded-2xl border border-[#E2E8F0] px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></div>
              </form>
            </section>

            {pagedCustomers.length ? (
              <section className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="hidden overflow-x-auto xl:block">
                  <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
                    <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.1em] text-[#64748B] dark:bg-slate-900"><tr>{["Cliente","Contacto","Compras","Total comprado","Pendiente","Última compra","Segmento","Acciones"].map((header) => <th key={header} className="px-5 py-4">{header}</th>)}</tr></thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {pagedCustomers.map((customer) => <CustomerTableRow key={customer.id} customer={customer} formatter={formatter} />)}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-4 p-4 xl:hidden">
                  {pagedCustomers.map((customer) => <CustomerMobileCard key={customer.id} customer={customer} formatter={formatter} />)}
                </div>
              </section>
            ) : <CustomerEmptyState filtered={Boolean(filters.query || filters.status !== "active" || filters.frequency !== "all" || filters.city)} />}

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-3" aria-label="Paginación">
                {currentPage > 1 && <Link href={{ pathname: "/app/clientes", query: { ...Object.fromEntries(Object.entries(params || {}).filter(([, value]) => typeof value === "string")), page: currentPage - 1 } }} className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE]">Anterior</Link>}
                <span className="text-sm font-black text-[#64748B]">Página {currentPage} de {totalPages}</span>
                {currentPage < totalPages && <Link href={{ pathname: "/app/clientes", query: { ...Object.fromEntries(Object.entries(params || {}).filter(([, value]) => typeof value === "string")), page: currentPage + 1 } }} className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE]">Siguiente</Link>}
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function CustomerTableRow({ customer, formatter }: { customer: CustomerWithMetrics; formatter: Intl.NumberFormat }) {
  return (
    <tr className="transition hover:bg-[#F8FAFC] dark:hover:bg-slate-900">
      <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] text-sm font-black text-white">{customerInitials(customer.full_name)}</span><div><Link href={`/app/clientes/${customer.id}`} className="font-black text-[#0F172A] hover:text-[#2563EB] dark:text-white">{customer.full_name}</Link><div className="mt-1 flex gap-1"><SemanticBadge tone={statusTone(customer.status)}>{customerStatusLabel(customer.status)}</SemanticBadge></div></div></div></td>
      <td className="px-5 py-4"><p className="font-bold text-[#334155] dark:text-slate-200">{customer.phone || "Sin teléfono"}</p><p className="mt-1 text-xs font-bold text-[#64748B]">{customer.email || customer.document_number || "Sin dato adicional"}</p></td>
      <td className="px-5 py-4 font-black text-[#0F172A] dark:text-white">{customer.totalOrders}</td>
      <td className="px-5 py-4 font-black text-[#166534]">{formatter.format(customer.totalSpent)}</td>
      <td className={`px-5 py-4 font-black ${customer.pendingBalance ? "text-[#B45309]" : "text-[#64748B]"}`}>{formatter.format(customer.pendingBalance)}</td>
      <td className="px-5 py-4 font-bold text-[#475569]">{dateLabel(customer.lastPurchaseAt)}</td>
      <td className="px-5 py-4"><SemanticBadge tone={customer.pendingBalance ? "warning" : frequencyTone(customer.frequency)}>{customer.pendingBalance ? "Con deuda" : customerFrequencyLabel(customer.frequency)}</SemanticBadge></td>
      <td className="px-5 py-4"><CustomerRowActions customerId={customer.id} status={customer.status} /></td>
    </tr>
  );
}

function CustomerMobileCard({ customer, formatter }: { customer: CustomerWithMetrics; formatter: Intl.NumberFormat }) {
  return (
    <article className="rounded-[1.75rem] border border-[#E2E8F0] bg-white p-5 transition hover:border-[#BFDBFE] dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] text-sm font-black text-white">{customerInitials(customer.full_name)}</span><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-black text-[#0F172A] dark:text-white">{customer.full_name}</h2><p className="truncate text-sm font-bold text-[#64748B]">{customer.phone || customer.email || "Sin contacto"}</p></div><SemanticBadge tone={customer.pendingBalance ? "warning" : frequencyTone(customer.frequency)}>{customer.pendingBalance ? "Deuda" : customerFrequencyLabel(customer.frequency)}</SemanticBadge></div>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#F8FAFC] p-4 dark:bg-slate-950"><div><p className="text-xs font-black uppercase text-[#94A3B8]">Compras</p><p className="mt-1 font-black text-[#0F172A] dark:text-white">{customer.totalOrders}</p></div><div><p className="text-xs font-black uppercase text-[#94A3B8]">Total</p><p className="mt-1 font-black text-[#166534]">{formatter.format(customer.totalSpent)}</p></div><div><p className="text-xs font-black uppercase text-[#94A3B8]">Pendiente</p><p className="mt-1 font-black text-[#B45309]">{formatter.format(customer.pendingBalance)}</p></div><div><p className="text-xs font-black uppercase text-[#94A3B8]">Última compra</p><p className="mt-1 text-sm font-black text-[#0F172A] dark:text-white">{dateLabel(customer.lastPurchaseAt)}</p></div></div>
      <div className="mt-4"><CustomerRowActions customerId={customer.id} status={customer.status} variant="block" /></div>
    </article>
  );
}
