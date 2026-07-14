import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SalesMetricCard, SalesStatusBadge, salesDarkTone } from "@/components/sales/sales-dashboard-ui";
import { SaleVoidAction } from "@/components/sales/sale-void-action";
import {
  AppPageHeader,
  DashboardShell,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import type { SemanticTone } from "@/components/ui/semantic";
import {
  saleChannelLabel,
  salePaymentMethodLabel,
  salePaymentStatusLabel,
  saleStatusLabel,
  saleUnitLabel,
  type SaleItemRow,
  type SalePaymentRow,
  type SaleRow,
} from "@/lib/sales";
import { moneyFormatter, toSafeNumber } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

type InventoryMovementRow = {
  id: string;
  movement_type: string;
  quantity: number | string | null;
  stock_unit: string | null;
  total_cost: number | string | null;
  created_at: string;
  product_variants?: {
    name: string | null;
    products?: {
      name: string;
    } | null;
  } | null;
};

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

function movementTone(movement: InventoryMovementRow): SemanticTone {
  return movement.movement_type === "sale_void" ? "positive" : "negative";
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const [{ data: sale }, { data: movements }] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "id,sale_code,sale_date,customer_name,customer_phone,customer_note,channel,payment_status,status,subtotal_amount,discount_amount,tax_amount,shipping_amount,total_amount,paid_amount,balance_due,total_cost,gross_profit,gross_margin_percent,notes,void_reason,sale_items(id,item_type,item_name,variant_name,sku,quantity,quantity_unit,unit_price,total_amount,total_cost,gross_profit,position),sale_payments(id,amount,payment_method,paid_at,reference)",
      )
      .eq("business_id", business.id)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("inventory_movements")
      .select(
        "id,movement_type,quantity,stock_unit,total_cost,created_at,product_variants(name,products(name))",
      )
      .eq("business_id", business.id)
      .eq("reference_type", "sale")
      .eq("reference_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!sale) {
    notFound();
  }

  const typedSale = sale as unknown as SaleRow;
  const movementRows = (movements || []) as unknown as InventoryMovementRow[];
  const formatter = moneyFormatter(business.currency || "COP");

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <DashboardShell>
        <AppPageHeader
          eyebrow="Detalle de venta"
          title={typedSale.sale_code}
          description={`${new Date(typedSale.sale_date).toLocaleString("es-CO")} · ${saleChannelLabel(typedSale.channel)}`}
          actions={
            <>
              <SalesStatusBadge tone={paymentTone(typedSale.payment_status)}>{salePaymentStatusLabel(typedSale.payment_status)}</SalesStatusBadge>
              <SalesStatusBadge tone={saleStatusTone(typedSale.status)}>{saleStatusLabel(typedSale.status)}</SalesStatusBadge>
              <SaleVoidAction appearance="dark" disabled={typedSale.status === "voided"} saleId={typedSale.id} />
              <Link href="/app/ventas" className={dashboardSecondaryActionClass}>Volver a ventas</Link>
            </>
          }
        />

        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SalesMetricCard label="Total" value={formatter.format(toSafeNumber(typedSale.total_amount))} description="Valor final de la venta" icon="sales" tone="brand" />
            <SalesMetricCard label="Pendiente" value={formatter.format(toSafeNumber(typedSale.balance_due))} description="Saldo por cobrar" icon="pending" tone={pendingTone(toSafeNumber(typedSale.balance_due))} />
            <SalesMetricCard label="Costo" value={formatter.format(toSafeNumber(typedSale.total_cost))} description="Costo estimado de los ítems" icon="income" tone="neutral" />
            <SalesMetricCard label="Utilidad" value={formatter.format(toSafeNumber(typedSale.gross_profit))} description={`Margen ${toSafeNumber(typedSale.gross_margin_percent).toFixed(1)}%`} icon="profit" tone={amountTone(toSafeNumber(typedSale.gross_profit))} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="space-y-4">
              <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Detalle comercial</p>
                <h2 className="mt-1 text-xl font-black text-white">Ítems vendidos</h2>
                <div className="mt-5 space-y-2.5">
                  {((typedSale.sale_items || []) as SaleItemRow[])
                    .sort((a, b) => (a.position || 0) - (b.position || 0))
                    .map((item) => {
                      const profit = toSafeNumber(item.gross_profit);
                      return (
                        <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/15 p-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-black text-white">{item.item_name}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">{item.variant_name || (item.item_type === "combo" ? "Combo" : "Producto")} · {toSafeNumber(item.quantity)} {saleUnitLabel(item.quantity_unit)}</p>
                          </div>
                          <div className="sm:text-right">
                            <p className="font-black text-cyan-100">{formatter.format(toSafeNumber(item.total_amount))}</p>
                            <p className={`mt-1 text-xs font-black ${salesDarkTone[amountTone(profit)].text}`}>Utilidad {formatter.format(profit)}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Trazabilidad</p>
                <h2 className="mt-1 text-xl font-black text-white">Movimientos de inventario</h2>
                <div className="mt-5 space-y-2.5">
                  {movementRows.length ? movementRows.map((movement) => {
                    const tone = movementTone(movement);
                    return (
                      <div key={movement.id} className={`flex items-start justify-between gap-4 rounded-xl border border-l-4 p-4 ${salesDarkTone[tone].badge}`}>
                        <div>
                          <p className="font-black text-white">{movement.product_variants?.products?.name || "Producto"} · {movement.product_variants?.name || "Presentación"}</p>
                          <p className="mt-1 text-sm font-semibold opacity-70">{movement.movement_type === "sale_void" ? "Restauración" : "Salida por venta"}</p>
                        </div>
                        <p className={`shrink-0 font-black ${salesDarkTone[tone].text}`}>{toSafeNumber(movement.quantity)} {saleUnitLabel(movement.stock_unit)}</p>
                      </div>
                    );
                  }) : <p className="rounded-xl border border-white/[0.07] bg-black/15 p-4 text-sm font-semibold text-slate-500">Esta venta no generó movimientos de inventario.</p>}
                </div>
              </article>
            </div>

            <aside className="space-y-4">
              <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Relación comercial</p>
                <h2 className="mt-1 text-xl font-black text-white">Cliente y pago</h2>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3"><dt className="text-xs font-black uppercase tracking-[0.1em] text-slate-600">Cliente</dt><dd className="mt-1 font-bold text-slate-200">{typedSale.customer_name || "Sin cliente"}</dd></div>
                  <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3"><dt className="text-xs font-black uppercase tracking-[0.1em] text-slate-600">Teléfono</dt><dd className="mt-1 font-bold text-slate-200">{typedSale.customer_phone || "Sin teléfono"}</dd></div>
                </dl>
                <div className="mt-3 space-y-2.5">
                  {((typedSale.sale_payments || []) as SalePaymentRow[]).length ? ((typedSale.sale_payments || []) as SalePaymentRow[]).map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.07] p-3">
                      <p className="font-black text-emerald-100">{formatter.format(toSafeNumber(payment.amount))}</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-100/60">{salePaymentMethodLabel(payment.payment_method)} · {new Date(payment.paid_at).toLocaleDateString("es-CO")}</p>
                    </div>
                  )) : <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.07] p-3 text-sm font-semibold text-amber-100/70">Venta pendiente sin pagos registrados.</p>}
                </div>
              </article>

              <article className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-blue-500/15 to-cyan-400/[0.07] p-5 sm:p-6">
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
                <h2 className="text-xl font-black text-white">Totales</h2>
                <div className="mt-5 space-y-3 text-sm">
                  {[["Subtotal", typedSale.subtotal_amount], ["Descuentos", typedSale.discount_amount], ["Impuestos", typedSale.tax_amount], ["Envío", typedSale.shipping_amount], ["Total", typedSale.total_amount], ["Pagado", typedSale.paid_amount], ["Pendiente", typedSale.balance_due]].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between gap-3 border-b border-white/[0.07] pb-2 last:border-0 last:pb-0"><span className="font-semibold text-slate-400">{label}</span><span className="font-black text-white">{formatter.format(toSafeNumber(value))}</span></div>
                  ))}
                </div>
              </article>
            </aside>
          </section>
        </div>
      </DashboardShell>
    </main>
  );
}
