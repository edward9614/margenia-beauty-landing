import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SaleVoidAction } from "@/components/sales/sale-void-action";
import { SemanticBadge, ToneCard, semanticToneStyles, type SemanticTone } from "@/components/ui/semantic";
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
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <div className="w-full max-w-none space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link href="/app/ventas" className="text-sm font-black text-[#2563EB]">
                ← Volver a ventas
              </Link>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
                Venta
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
                {typedSale.sale_code}
              </h1>
              <p className="mt-3 text-sm font-bold text-[#475569]">
                {new Date(typedSale.sale_date).toLocaleString("es-CO")} ·{" "}
                {saleChannelLabel(typedSale.channel)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SemanticBadge tone={paymentTone(typedSale.payment_status)} className="px-4 py-2 text-sm">
                {salePaymentStatusLabel(typedSale.payment_status)}
              </SemanticBadge>
              <SemanticBadge tone={saleStatusTone(typedSale.status)} className="px-4 py-2 text-sm">
                {saleStatusLabel(typedSale.status)}
              </SemanticBadge>
              <SaleVoidAction disabled={typedSale.status === "voided"} saleId={typedSale.id} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total", formatter.format(toSafeNumber(typedSale.total_amount)), "info"],
            ["Pendiente", formatter.format(toSafeNumber(typedSale.balance_due)), pendingTone(toSafeNumber(typedSale.balance_due))],
            ["Costo", formatter.format(toSafeNumber(typedSale.total_cost)), "neutral"],
            ["Utilidad", formatter.format(toSafeNumber(typedSale.gross_profit)), amountTone(toSafeNumber(typedSale.gross_profit))],
          ].map(([label, value, tone]) => (
            <ToneCard key={label} tone={tone as SemanticTone}>
              <p className="text-sm font-black text-[#475569]">{label}</p>
              <p className="mt-3 text-2xl font-black text-[#0F172A]">{value}</p>
            </ToneCard>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
          <div className="space-y-6">
            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-[#0F172A]">Ítems vendidos</h2>
              <div className="mt-5 space-y-3">
                {((typedSale.sale_items || []) as SaleItemRow[])
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl bg-[#F8FAFC] p-4">
                      <div>
                        <p className="font-black text-[#0F172A]">{item.item_name}</p>
                        <p className="text-sm font-bold text-[#475569]">
                          {item.variant_name || (item.item_type === "combo" ? "Combo" : "Producto")} ·{" "}
                          {toSafeNumber(item.quantity)} {saleUnitLabel(item.quantity_unit)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#0F172A]">
                          {formatter.format(toSafeNumber(item.total_amount))}
                        </p>
                        <p className="text-xs font-bold text-[#64748B]">
                          Utilidad {formatter.format(toSafeNumber(item.gross_profit))}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </article>

            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-[#0F172A]">Movimientos de inventario</h2>
              <div className="mt-5 space-y-3">
                {movementRows.length ? (
                  movementRows.map((movement) => {
                    const tone = movementTone(movement);

                    return (
                      <div key={movement.id} className={`flex items-start justify-between gap-4 rounded-2xl border border-[#E2E8F0] border-l-4 ${semanticToneStyles[tone].border} ${semanticToneStyles[tone].soft} p-4`}>
                        <div>
                          <p className="font-black text-[#0F172A]">
                            {movement.product_variants?.products?.name || "Producto"} ·{" "}
                            {movement.product_variants?.name || "Presentación"}
                          </p>
                          <p className="mt-1 text-sm font-bold text-[#475569]">
                            {movement.movement_type === "sale_void" ? "Restauración" : "Salida por venta"}
                          </p>
                        </div>
                        <p className={`font-black ${semanticToneStyles[tone].text}`}>
                          {toSafeNumber(movement.quantity)} {saleUnitLabel(movement.stock_unit)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-2xl bg-[#F8FAFC] p-4 text-sm font-bold text-[#475569]">
                    Esta venta no generó movimientos de inventario.
                  </p>
                )}
              </div>
            </article>
          </div>

          <aside className="space-y-6">
            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-[#0F172A]">Cliente y pago</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div>
                  <dt className="font-black text-[#64748B]">Cliente</dt>
                  <dd className="font-bold text-[#0F172A]">{typedSale.customer_name || "Sin cliente"}</dd>
                </div>
                <div>
                  <dt className="font-black text-[#64748B]">Teléfono</dt>
                  <dd className="font-bold text-[#0F172A]">{typedSale.customer_phone || "Sin teléfono"}</dd>
                </div>
                <div>
                  <dt className="font-black text-[#64748B]">Pago</dt>
                  <dd className="font-bold text-[#0F172A]">{salePaymentStatusLabel(typedSale.payment_status)}</dd>
                </div>
              </dl>
              <div className="mt-5 space-y-3">
                {((typedSale.sale_payments || []) as SalePaymentRow[]).length ? (
                  ((typedSale.sale_payments || []) as SalePaymentRow[]).map((payment) => (
                    <div key={payment.id} className="rounded-2xl bg-[#F8FAFC] p-4">
                      <p className="font-black text-[#0F172A]">
                        {formatter.format(toSafeNumber(payment.amount))}
                      </p>
                      <p className="text-sm font-bold text-[#475569]">
                        {salePaymentMethodLabel(payment.payment_method)} ·{" "}
                        {new Date(payment.paid_at).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-[#F8FAFC] p-4 text-sm font-bold text-[#475569]">
                    Venta pendiente sin pagos registrados.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-[2rem] border border-[#E2E8F0] bg-[#0F172A] p-5 text-white shadow-sm">
              <h2 className="text-xl font-black">Totales</h2>
              <div className="mt-5 space-y-3 text-sm">
                {[
                  ["Subtotal", typedSale.subtotal_amount],
                  ["Descuentos", typedSale.discount_amount],
                  ["Impuestos", typedSale.tax_amount],
                  ["Envío", typedSale.shipping_amount],
                  ["Total", typedSale.total_amount],
                  ["Pagado", typedSale.paid_amount],
                  ["Pendiente", typedSale.balance_due],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between gap-3">
                    <span className="font-bold text-white/70">{label}</span>
                    <span className="font-black">{formatter.format(toSafeNumber(value))}</span>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
