import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductAnalyticsEvent } from "@/components/products/product-analytics";
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

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <ProductAnalyticsEvent eventName="sales_module_view" />
      <div className="w-full max-w-none space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
                Ventas
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
                Ventas
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#475569]">
                Registra ingresos, controla pagos pendientes y entiende la utilidad de cada venta.
              </p>
            </div>
            {hasCatalog ? (
              <Link
                href="/app/ventas/nueva"
                className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-4 text-center text-base font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
              >
                Nueva venta
              </Link>
            ) : (
              <Link
                href="/app/productos"
                className="rounded-full border border-[#BFDBFE] bg-white px-6 py-4 text-center text-base font-black text-[#2563EB]"
              >
                Primero crea productos
              </Link>
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Ventas de hoy", formatter.format(metrics.today)],
            ["Ingresos del mes", formatter.format(metrics.month)],
            ["Utilidad bruta estimada", formatter.format(metrics.profit)],
            ["Pendiente por cobrar", formatter.format(metrics.pending)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-[#475569]">{label}</p>
              <p className="mt-3 text-2xl font-black text-[#0F172A]">{value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <form className="grid gap-4 xl:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(130px,170px))]">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por código o cliente"
              className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
            />
            <select name="status" defaultValue={status} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="completed">Completadas</option>
              <option value="voided">Anuladas</option>
              <option value="all">Todas</option>
            </select>
            <select name="payment" defaultValue={payment} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="all">Todos los pagos</option>
              <option value="paid">Pagadas</option>
              <option value="partial">Parciales</option>
              <option value="pending">Pendientes</option>
            </select>
            <select name="range" defaultValue={range} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="today">Hoy</option>
              <option value="7d">Últimos 7 días</option>
              <option value="month">Mes actual</option>
              <option value="all">Todas</option>
            </select>
            <select name="channel" defaultValue={channel} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="all">Todos los canales</option>
              <option value="local">Local</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="online_store">Tienda online</option>
              <option value="feria">Feria</option>
              <option value="otro">Otro</option>
            </select>
            <select name="method" defaultValue={method} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="all">Método</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="other">Otro</option>
            </select>
            <button className="rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-black text-white">
              Filtrar
            </button>
          </form>
        </section>

        {error ? (
          <section className="rounded-[2rem] border border-[#FECACA] bg-[#FEF2F2] p-6 text-[#991B1B]">
            <h2 className="text-xl font-black">No pudimos cargar ventas</h2>
            <p className="mt-2 text-sm font-bold">Revisa que la migración 006_sales.sql exista en Supabase.</p>
          </section>
        ) : saleList.length ? (
          <section className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-sm">
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">
                  <tr>
                    {["Venta", "Fecha", "Cliente", "Total", "Pagado", "Pendiente", "Utilidad", "Pago", "Estado", "Acciones"].map((header) => (
                      <th key={header} className="px-5 py-4">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {saleList.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-5 py-4 font-black text-[#0F172A]">{sale.sale_code}</td>
                      <td className="px-5 py-4 text-[#475569]">{new Date(sale.sale_date).toLocaleDateString("es-CO")}</td>
                      <td className="px-5 py-4 text-[#475569]">{sale.customer_name || "Sin cliente"}</td>
                      <td className="px-5 py-4 font-black text-[#0F172A]">{formatter.format(toSafeNumber(sale.total_amount))}</td>
                      <td className="px-5 py-4">{formatter.format(toSafeNumber(sale.paid_amount))}</td>
                      <td className="px-5 py-4">{formatter.format(toSafeNumber(sale.balance_due))}</td>
                      <td className="px-5 py-4">{formatter.format(toSafeNumber(sale.gross_profit))}</td>
                      <td className="px-5 py-4">{salePaymentStatusLabel(sale.payment_status)}</td>
                      <td className="px-5 py-4">{saleStatusLabel(sale.status)}</td>
                      <td className="px-5 py-4">
                        <Link href={`/app/ventas/${sale.id}`} className="font-black text-[#2563EB]">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-4 p-4 lg:hidden">
              {saleList.map((sale) => (
                <article key={sale.id} className="rounded-[1.5rem] border border-[#E2E8F0] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#0F172A]">{sale.sale_code}</p>
                      <p className="text-sm font-bold text-[#475569]">{sale.customer_name || "Sin cliente"}</p>
                    </div>
                    <Link href={`/app/ventas/${sale.id}`} className="font-black text-[#2563EB]">
                      Ver
                    </Link>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <p><span className="block font-bold text-[#64748B]">Total</span>{formatter.format(toSafeNumber(sale.total_amount))}</p>
                    <p><span className="block font-bold text-[#64748B]">Pago</span>{salePaymentStatusLabel(sale.payment_status)}</p>
                    <p><span className="block font-bold text-[#64748B]">Pendiente</span>{formatter.format(toSafeNumber(sale.balance_due))}</p>
                    <p><span className="block font-bold text-[#64748B]">Fecha</span>{new Date(sale.sale_date).toLocaleDateString("es-CO")}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-[2rem] border border-dashed border-[#BFDBFE] bg-[#EFF6FF] p-8 text-center">
            <h2 className="text-2xl font-black text-[#0F172A]">
              {hasCatalog ? "Registra tu primera venta" : "Primero crea productos"}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-6 text-[#475569]">
              {hasCatalog
                ? "Cuando vendas productos o combos, Margenia actualizará inventario, utilidad y pagos pendientes."
                : "Para registrar ventas necesitas productos o combos activos."}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {hasCatalog ? (
                <Link href="/app/ventas/nueva" className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-3 text-sm font-black text-white">
                  Nueva venta
                </Link>
              ) : (
                <>
                  <Link href="/app/productos" className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-3 text-sm font-black text-white">
                    Ir a Productos
                  </Link>
                  <Link href="/app/combos" className="rounded-full border border-[#BFDBFE] bg-white px-6 py-3 text-sm font-black text-[#2563EB]">
                    Ir a Combos
                  </Link>
                </>
              )}
            </div>
          </section>
        )}

        {saleList.length > 0 && (
          <div className="flex items-center justify-between">
            <Link
              href={{ pathname: "/app/ventas", query: { ...params, page: Math.max(page - 1, 1) } }}
              className="rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-black text-[#0F172A]"
            >
              Anterior
            </Link>
            <span className="text-sm font-bold text-[#64748B]">
              Página {page} de {totalPages}
            </span>
            <Link
              href={{ pathname: "/app/ventas", query: { ...params, page: Math.min(page + 1, totalPages) } }}
              className="rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-black text-[#0F172A]"
            >
              Siguiente
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
