import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerExportButton } from "@/components/customers/customer-export-button";
import { CustomerNoteForm } from "@/components/customers/customer-note-form";
import { CustomerPaymentForm } from "@/components/customers/customer-payment-form";
import { CustomerRowActions } from "@/components/customers/customer-row-actions";
import { SemanticBadge, ToneCard, type SemanticTone } from "@/components/ui/semantic";
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

function EmptyBlock({ action, description, title }: { action?: React.ReactNode; description: string; title: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-7 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto h-10 w-10 rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#E0F7FA]" />
      <p className="mt-4 font-black text-[#0F172A] dark:text-white">{title}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-[#64748B]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
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
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <div className="w-full max-w-none space-y-6">
        {saved && <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm font-black text-[#166534]">{saved === "created" ? "Cliente creado correctamente." : "Cliente actualizado correctamente."}</div>}
        <section className="relative overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#E0F7FA] blur-3xl dark:bg-cyan-900/20" />
          <Link href="/app/clientes" className="relative text-sm font-black text-[#2563EB]">← Volver a clientes</Link>
          <div className="relative mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.5rem] bg-gradient-to-br from-[#2563EB] to-[#06B6D4] text-xl font-black text-white shadow-lg shadow-cyan-500/20">{customerInitials(customerRow.full_name)}</span>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black tracking-tight text-[#0F172A] dark:text-white sm:text-4xl">{customerRow.full_name}</h1><SemanticBadge tone={customerRow.status === "active" ? "positive" : "neutral"}>{customerStatusLabel(customerRow.status)}</SemanticBadge>{customerRow.tags?.map((tag) => <SemanticBadge key={tag} tone="brand">{tag}</SemanticBadge>)}</div><p className="mt-2 text-sm font-bold text-[#64748B]">{customerRow.phone || customerRow.email || "Sin contacto adicional"}</p></div>
            </div>
            <div className="flex flex-wrap gap-2"><Link href={`/app/clientes/${id}/editar`} className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE]">Editar cliente</Link><Link href={`/app/ventas/nueva?customerId=${id}`} className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 py-3 text-sm font-black text-white">Registrar venta</Link>{metrics.pendingBalance > 0 && <Link href="#registrar-abono" className="rounded-full bg-[#FEF3C7] px-5 py-3 text-sm font-black text-[#92400E]">Registrar abono</Link>}<CustomerExportButton customerId={id} label="Descargar historial" scope="history" /></div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Total comprado", formatter.format(metrics.totalSpent), "positive"],
            ["Compras", String(metrics.totalOrders), "info"],
            ["Ticket promedio", formatter.format(metrics.averageTicket), "brand"],
            ["Última compra", dateLabel(metrics.lastPurchaseAt), "neutral"],
            ["Días sin comprar", metrics.daysSinceLastPurchase === null ? "Sin datos" : String(metrics.daysSinceLastPurchase), metrics.daysSinceLastPurchase !== null && metrics.daysSinceLastPurchase > 60 ? "warning" : "neutral"],
            ["Saldo pendiente", formatter.format(metrics.pendingBalance), metrics.pendingBalance ? "warning" : "positive"],
          ].map(([label, value, tone]) => <ToneCard key={label} tone={tone as SemanticTone}><p className="text-xs font-black uppercase tracking-[0.1em] text-[#64748B]">{label}</p><p className="mt-3 text-xl font-black text-[#0F172A] dark:text-white">{value}</p></ToneCard>)}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <div className="space-y-6">
            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <h2 className="text-2xl font-black text-[#0F172A] dark:text-white">Historial de compras</h2>
              <p className="mt-2 text-sm font-bold text-[#64748B]">Ventas enlazadas a esta ficha.</p>
              {sales.length ? <div className="mt-5 space-y-3">{sales.map((sale) => <Link key={sale.id} href={`/app/ventas/${sale.id}`} className="grid gap-3 rounded-[1.5rem] border border-[#E2E8F0] p-4 transition hover:border-[#BFDBFE] hover:bg-[#F8FAFC] dark:border-slate-700 dark:hover:bg-slate-900 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-black text-[#0F172A] dark:text-white">{sale.sale_code}</p><p className="text-xs font-bold text-[#64748B]">{dateLabel(sale.sale_date)} · {saleChannelLabel(sale.channel)}</p><p className="mt-1 text-xs font-bold text-[#475569]">{(sale.sale_items || []).map((item) => item.item_name).slice(0, 3).join(", ") || "Sin detalle"}</p></div><p className="font-black text-[#0F172A] dark:text-white">{formatter.format(safeNumber(sale.total_amount))}</p><SemanticBadge tone={paymentTone(sale.payment_status)}>{salePaymentStatusLabel(sale.payment_status)}</SemanticBadge></Link>)}</div> : <div className="mt-5"><EmptyBlock title="Aún no hay compras" description="Registra la primera venta para empezar a construir el historial." action={<Link href={`/app/ventas/nueva?customerId=${id}`} className="text-sm font-black text-[#2563EB]">Registrar primera venta</Link>} /></div>}
            </article>

            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-[#0F172A] dark:text-white">Cuentas por cobrar</h2><p className="mt-2 text-sm font-bold text-[#64748B]">{pendingSales.length} ventas pendientes · {formatter.format(metrics.pendingBalance)}</p></div>{metrics.pendingBalance > 0 && <SemanticBadge tone="warning">Requiere seguimiento</SemanticBadge>}</div>
              {pendingSales.length ? <><div className="mt-5 space-y-3">{pendingSales.map((sale) => <div key={sale.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FFFBEB] p-4"><div><p className="font-black text-[#0F172A]">{sale.sale_code}</p><p className="text-xs font-bold text-[#92400E]">Desde {dateLabel(sale.sale_date)}</p></div><p className="text-lg font-black text-[#B45309]">{formatter.format(safeNumber(sale.balance_due))}</p></div>)}</div><CustomerPaymentForm currency={currency} customerId={id} pendingSales={pendingSales.map((sale) => ({ balanceDue: safeNumber(sale.balance_due), label: sale.sale_code, saleId: sale.id }))} /></> : <div className="mt-5"><EmptyBlock title="Sin deudas pendientes" description="Todas las ventas asociadas a este cliente están al día." /></div>}
              {latestPayment && <p className="mt-4 text-xs font-bold text-[#64748B]">Último abono: {dateLabel(latestPayment.paid_at)} · {formatter.format(safeNumber(latestPayment.amount))}</p>}
            </article>

            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <h2 className="text-2xl font-black text-[#0F172A] dark:text-white">Notas del cliente</h2>
              {notes.length ? <div className="mt-5 space-y-3">{notes.map((note) => <div key={note.id} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-sm font-bold leading-6 text-[#334155] dark:text-slate-200">{note.note}</p><p className="mt-2 text-xs font-bold text-[#94A3B8]">{dateLabel(note.created_at, true)} · Usuario del negocio</p></div>)}</div> : <div className="mt-5"><EmptyBlock title="Sin notas internas" description="Registra preferencias, acuerdos o detalles útiles para futuras conversaciones." /></div>}
              <CustomerNoteForm customerId={id} />
            </article>
          </div>

          <aside className="space-y-6">
            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <h2 className="text-xl font-black text-[#0F172A] dark:text-white">Datos del cliente</h2>
              <dl className="mt-5 space-y-4">{[
                ["Teléfono", customerRow.phone || "Sin registrar"], ["Email", customerRow.email || "Sin registrar"], ["Documento", customerRow.document_number ? `${customerRow.document_type?.toUpperCase() || ""} ${customerRow.document_number}` : "Sin registrar"], ["Dirección", customerRow.address || "Sin registrar"], ["Ciudad", customerRow.city || "Sin registrar"], ["Nacimiento", dateLabel(customerRow.birth_date)], ["Canal favorito", customerRow.preferred_contact_channel || "Sin definir"], ["Promociones", customerRow.marketing_opt_in ? "Permitidas" : "No autorizadas"],
              ].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 border-b border-[#F1F5F9] pb-3"><dt className="text-xs font-black uppercase tracking-[0.08em] text-[#94A3B8]">{label}</dt><dd className="text-right text-sm font-black text-[#334155] dark:text-slate-200">{value}</dd></div>)}</dl>
              {customerRow.notes_summary && <p className="mt-5 rounded-2xl bg-[#EFF6FF] p-4 text-sm font-bold leading-6 text-[#1E40AF]">{customerRow.notes_summary}</p>}
            </article>

            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <h2 className="text-xl font-black text-[#0F172A] dark:text-white">Comportamiento comercial</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{[
                ["Segmento", customerFrequencyLabel(metrics.frequency)], ["Primera compra", dateLabel(metrics.firstPurchaseAt)], ["Promedio entre compras", metrics.averageDaysBetweenPurchases === null ? "Sin datos" : `${Math.round(metrics.averageDaysBetweenPurchases)} días`], ["Producto más comprado", favoriteItem || "Sin datos"],
              ].map(([label, value]) => <div key={label} className="rounded-2xl bg-[#F8FAFC] p-4 dark:bg-slate-900"><p className="text-xs font-black uppercase text-[#94A3B8]">{label}</p><p className="mt-2 font-black text-[#0F172A] dark:text-white">{value}</p></div>)}</div>
            </article>

            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <h2 className="text-xl font-black text-[#0F172A] dark:text-white">Actividad reciente</h2>
              {activity.length ? <ol className="mt-5 space-y-4">{activity.map((item, index) => <li key={`${item.date}-${index}`} className="relative flex gap-3"><span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.tone === "positive" ? "bg-[#16A34A]" : item.tone === "brand" ? "bg-[#06B6D4]" : item.tone === "neutral" ? "bg-[#94A3B8]" : "bg-[#2563EB]"}`} /><div><p className="text-sm font-black text-[#334155] dark:text-slate-200">{item.label}</p><p className="text-xs font-bold text-[#94A3B8]">{dateLabel(item.date, true)}</p></div></li>)}</ol> : <EmptyBlock title="Sin actividad" description="La actividad aparecerá cuando agregues compras, abonos o notas." />}
            </article>

            <CustomerRowActions customerId={id} status={customerRow.status} variant="block" />
          </aside>
        </section>
      </div>
    </main>
  );
}
