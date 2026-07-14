import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerExportButton } from "@/components/customers/customer-export-button";
import { CustomerNoteForm } from "@/components/customers/customer-note-form";
import { CustomerPaymentForm } from "@/components/customers/customer-payment-form";
import { CustomerRowActions } from "@/components/customers/customer-row-actions";
import {
  BentoCard,
  BentoGrid,
  DashboardEmptyState,
  DashboardShell,
  HeroSummaryCard,
  MetricChip,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import { SemanticBadge, type SemanticTone } from "@/components/ui/semantic";
import {
  buildCustomerMetrics,
  customerFrequencyLabel,
  customerInitials,
  customerStatusLabel,
  safeNumber,
  type CustomerRow,
  type CustomerSaleRow,
} from "@/lib/customers";
import { createClient } from "@/lib/supabase/server";
import { saleChannelLabel, salePaymentStatusLabel } from "@/lib/sales";

type DetailSale = CustomerSaleRow & {
  sale_items?: { id: string; item_name: string; item_type: string; quantity: number | string | null; total_amount: number | string | null }[] | null;
  sale_payments?: { id: string; amount: number | string | null; paid_at: string; payment_method: string }[] | null;
};

type CustomerNote = { created_at: string; created_by: string | null; id: string; note: string };
type SearchParams = Record<string, string | string[] | undefined>;

function dateLabel(value: string | null, withTime = false) {
  if (!value) return "Sin registro";
  return new Intl.DateTimeFormat("es-CO", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value));
}

function paymentTone(status: string | null): SemanticTone {
  if (status === "paid") return "positive";
  if (status === "partial") return "warning";
  return "negative";
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const saved = typeof query?.saved === "string" ? query.saved : "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase.from("businesses").select("id,name,currency").eq("owner_id", user.id).limit(1).maybeSingle();
  if (!business) redirect("/app/onboarding");

  const [{ data: customer }, { data: saleRows }, { data: noteRows }] = await Promise.all([
    supabase.from("customers").select("id,business_id,full_name,document_type,document_number,phone,email,birth_date,gender,address,city,preferred_contact_channel,marketing_opt_in,tags,notes_summary,status,archived_at,created_at,updated_at").eq("id", id).eq("business_id", business.id).maybeSingle(),
    supabase.from("sales").select("id,customer_id,sale_code,sale_date,channel,payment_status,status,total_amount,paid_amount,balance_due,gross_profit,sale_items(id,item_name,item_type,quantity,total_amount),sale_payments(id,amount,paid_at,payment_method)").eq("business_id", business.id).eq("customer_id", id).order("sale_date", { ascending: false }),
    supabase.from("customer_notes").select("id,note,created_by,created_at").eq("business_id", business.id).eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  if (!customer) notFound();

  const customerRow = customer as CustomerRow;
  const sales = (saleRows || []) as DetailSale[];
  const notes = (noteRows || []) as CustomerNote[];
  const metrics = buildCustomerMetrics(sales);
  const currency = business.currency || "COP";
  const formatter = new Intl.NumberFormat("es-CO", { currency, style: "currency", maximumFractionDigits: 0 });
  const pendingSales = sales.filter((sale) => sale.status !== "voided" && safeNumber(sale.balance_due) > 0);
  const validItems = sales.filter((sale) => sale.status !== "voided").flatMap((sale) => sale.sale_items || []);
  const itemCounts = validItems.reduce((map, item) => map.set(item.item_name, (map.get(item.item_name) || 0) + safeNumber(item.quantity)), new Map<string, number>());
  const favoriteItem = [...itemCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const latestPayment = sales.flatMap((sale) => sale.sale_payments || []).sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())[0];
  const activity = [
    { date: customerRow.created_at, label: "Cliente creado", tone: "info" as SemanticTone },
    ...sales.map((sale) => ({ date: sale.sale_date, label: `Compra ${sale.sale_code} registrada`, tone: sale.status === "voided" ? "neutral" as SemanticTone : "positive" as SemanticTone })),
    ...sales.flatMap((sale) => (sale.sale_payments || []).map((payment) => ({ date: payment.paid_at, label: `Abono en ${sale.sale_code}`, tone: "brand" as SemanticTone }))),
    ...notes.map((note) => ({ date: note.created_at, label: "Nota agregada", tone: "info" as SemanticTone })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 12);

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <DashboardShell>
        {saved && <div className="mx-4 mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-200 sm:mx-6">{saved === "created" ? "Cliente creado correctamente." : "Cliente actualizado correctamente."}</div>}

        <header className="border-b border-white/[0.07] px-5 py-7 sm:px-7 lg:px-8 lg:py-9">
          <Link href="/app/clientes" className="inline-flex items-center gap-2 text-sm font-black text-cyan-300 transition hover:text-cyan-100"><span aria-hidden="true">←</span> Volver a clientes</Link>
          <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-xl font-black text-white shadow-lg shadow-cyan-950/30">{customerInitials(customerRow.full_name)}</span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Ficha comercial</p>
                <div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black tracking-normal text-white sm:text-4xl">{customerRow.full_name}</h1><SemanticBadge tone={customerRow.status === "active" ? "positive" : "neutral"}>{customerStatusLabel(customerRow.status)}</SemanticBadge>{customerRow.tags?.map((tag) => <SemanticBadge key={tag} tone="brand">{tag}</SemanticBadge>)}</div>
                <p className="mt-2 text-sm font-semibold text-slate-400">{customerRow.phone || customerRow.email || "Sin contacto adicional"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2"><Link href={`/app/clientes/${id}/editar`} className={dashboardSecondaryActionClass}>Editar cliente</Link><Link href={`/app/ventas/nueva?customerId=${id}`} className={dashboardPrimaryActionClass}>Registrar venta</Link>{metrics.pendingBalance > 0 && <Link href="#registrar-abono" className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 px-5 py-2.5 text-sm font-black text-amber-200 transition hover:bg-amber-300/20">Registrar abono</Link>}<CustomerExportButton appearance="dark" customerId={id} label="Descargar historial" scope="history" /></div>
          </div>
        </header>

        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <BentoGrid className="lg:grid-cols-12">
            <div className="lg:col-span-7">
              <HeroSummaryCard label="Valor del cliente" value={formatter.format(metrics.totalSpent)} description="Total comprado en ventas registradas y no anuladas.">
                <MetricChip label="Compras" value={String(metrics.totalOrders)} tone="brand" />
                <MetricChip label="Ticket promedio" value={formatter.format(metrics.averageTicket)} tone="violet" />
                <MetricChip label="Última compra" value={dateLabel(metrics.lastPurchaseAt)} />
              </HeroSummaryCard>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
              <BentoCard className="sm:col-span-2" tone={metrics.pendingBalance ? "warning" : "success"}><p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">Saldo pendiente</p><div className="mt-3 flex items-end justify-between gap-4"><p className={`text-4xl font-black ${metrics.pendingBalance ? "text-amber-100" : "text-emerald-200"}`}>{formatter.format(metrics.pendingBalance)}</p><SemanticBadge tone={metrics.pendingBalance ? "warning" : "positive"}>{metrics.pendingBalance ? `${pendingSales.length} ventas` : "Al día"}</SemanticBadge></div></BentoCard>
              <BentoCard><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Días sin comprar</p><p className="mt-3 text-2xl font-black text-white">{metrics.daysSinceLastPurchase === null ? "Sin datos" : metrics.daysSinceLastPurchase}</p></BentoCard>
              <BentoCard tone="violet"><p className="text-xs font-black uppercase tracking-[0.12em] text-violet-200/70">Segmento</p><p className="mt-3 text-2xl font-black text-white">{customerFrequencyLabel(metrics.frequency)}</p></BentoCard>
            </div>
          </BentoGrid>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="space-y-5">
              <BentoCard>
                <SectionHeading title="Historial de compras" description="Ventas enlazadas a esta ficha." />
                {sales.length ? <div className="mt-5 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.08]">{sales.map((sale) => <Link key={sale.id} href={`/app/ventas/${sale.id}`} className="grid gap-3 bg-black/10 px-4 py-4 transition hover:bg-white/[0.055] sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-black text-white">{sale.sale_code}</p><p className="mt-1 text-xs font-semibold text-slate-500">{dateLabel(sale.sale_date)} · {saleChannelLabel(sale.channel)}</p><p className="mt-1 truncate text-xs font-semibold text-slate-400">{(sale.sale_items || []).map((item) => item.item_name).slice(0, 3).join(", ") || "Sin detalle"}</p></div><p className="font-black text-white">{formatter.format(safeNumber(sale.total_amount))}</p><SemanticBadge tone={paymentTone(sale.payment_status)}>{salePaymentStatusLabel(sale.payment_status)}</SemanticBadge></Link>)}</div> : <div className="mt-5"><DashboardEmptyState actionHref={`/app/ventas/nueva?customerId=${id}`} actionLabel="Registrar primera venta" title="Aún no hay compras" description="Registra la primera venta para empezar a construir el historial." /></div>}
              </BentoCard>

              <BentoCard tone={metrics.pendingBalance ? "warning" : "success"}>
                <div className="flex flex-wrap items-start justify-between gap-3"><SectionHeading title="Cuentas por cobrar" description={`${pendingSales.length} ventas pendientes · ${formatter.format(metrics.pendingBalance)}`} />{metrics.pendingBalance > 0 && <SemanticBadge tone="warning">Requiere seguimiento</SemanticBadge>}</div>
                {pendingSales.length ? <><div className="mt-5 space-y-2">{pendingSales.map((sale) => <div key={sale.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.07] p-4"><div><p className="font-black text-white">{sale.sale_code}</p><p className="mt-1 text-xs font-semibold text-amber-200/65">Desde {dateLabel(sale.sale_date)}</p></div><p className="text-lg font-black text-amber-100">{formatter.format(safeNumber(sale.balance_due))}</p></div>)}</div><CustomerPaymentForm currency={currency} customerId={id} pendingSales={pendingSales.map((sale) => ({ balanceDue: safeNumber(sale.balance_due), label: sale.sale_code, saleId: sale.id }))} /></> : <div className="mt-5"><DashboardEmptyState title="Sin deudas pendientes" description="Todas las ventas asociadas a este cliente están al día." /></div>}
                {latestPayment && <p className="mt-4 text-xs font-semibold text-slate-500">Último abono: {dateLabel(latestPayment.paid_at)} · {formatter.format(safeNumber(latestPayment.amount))}</p>}
              </BentoCard>

              <BentoCard>
                <SectionHeading title="Notas del cliente" description="Contexto útil para brindar una atención consistente." />
                {notes.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{notes.map((note) => <div key={note.id} className="rounded-xl border border-white/[0.07] bg-black/15 p-4"><p className="text-sm font-semibold leading-6 text-slate-200">{note.note}</p><p className="mt-3 text-xs font-semibold text-slate-600">{dateLabel(note.created_at, true)} · Usuario del negocio</p></div>)}</div> : <div className="mt-5"><DashboardEmptyState title="Sin notas internas" description="Registra preferencias, acuerdos o detalles útiles para futuras conversaciones." /></div>}
                <CustomerNoteForm customerId={id} />
              </BentoCard>
            </div>

            <aside className="space-y-5">
              <BentoCard>
                <SectionHeading title="Datos del cliente" description="Información de contacto y preferencias." />
                <dl className="mt-5 space-y-3">{[
                  ["Teléfono", customerRow.phone || "Sin registrar"], ["Email", customerRow.email || "Sin registrar"], ["Documento", customerRow.document_number ? `${customerRow.document_type?.toUpperCase() || ""} ${customerRow.document_number}` : "Sin registrar"], ["Dirección", customerRow.address || "Sin registrar"], ["Ciudad", customerRow.city || "Sin registrar"], ["Nacimiento", dateLabel(customerRow.birth_date)], ["Canal favorito", customerRow.preferred_contact_channel || "Sin definir"], ["Promociones", customerRow.marketing_opt_in ? "Permitidas" : "No autorizadas"],
                ].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-3"><dt className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-slate-600">{label}</dt><dd className="max-w-[58%] text-right text-sm font-bold text-slate-200">{value}</dd></div>)}</dl>
                {customerRow.notes_summary && <p className="mt-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] p-4 text-sm font-semibold leading-6 text-cyan-100">{customerRow.notes_summary}</p>}
              </BentoCard>

              <BentoCard tone="violet">
                <SectionHeading title="Comportamiento" description="Señales comerciales calculadas con sus compras." />
                <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{[
                  ["Primera compra", dateLabel(metrics.firstPurchaseAt)], ["Promedio entre compras", metrics.averageDaysBetweenPurchases === null ? "Sin datos" : `${Math.round(metrics.averageDaysBetweenPurchases)} días`], ["Producto más comprado", favoriteItem || "Sin datos"],
                ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.07] bg-black/15 p-3.5"><p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-slate-600">{label}</p><p className="mt-2 font-black text-white">{value}</p></div>)}</div>
              </BentoCard>

              <BentoCard>
                <SectionHeading title="Actividad reciente" description="Últimos movimientos de esta relación." />
                {activity.length ? <ol className="mt-5 space-y-4">{activity.map((item, index) => <li key={`${item.date}-${index}`} className="relative flex gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white/[0.04] ${item.tone === "positive" ? "bg-emerald-400" : item.tone === "brand" ? "bg-cyan-400" : item.tone === "neutral" ? "bg-slate-500" : "bg-blue-400"}`} /><div><p className="text-sm font-bold text-slate-200">{item.label}</p><p className="mt-0.5 text-xs font-semibold text-slate-600">{dateLabel(item.date, true)}</p></div></li>)}</ol> : <DashboardEmptyState title="Sin actividad" description="La actividad aparecerá cuando agregues compras, abonos o notas." />}
              </BentoCard>

              <CustomerRowActions appearance="dark" customerId={id} status={customerRow.status} variant="block" />
            </aside>
          </section>
        </div>
      </DashboardShell>
    </main>
  );
}

function SectionHeading({ description, title }: { description: string; title: string }) {
  return <div><h2 className="text-xl font-black text-white">{title}</h2><p className="mt-1.5 text-sm font-semibold leading-6 text-slate-500">{description}</p></div>;
}
