import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CashMovementItem,
  CashSummaryCard,
  PaymentMethodUsageCard,
} from "@/components/cash-register/cash-dashboard-widgets";
import {
  buildCashTimeline,
  calculateSessionSummary,
  formatCashDifference,
  getCashSessionStatusLabel,
  getPaymentMethodLabel,
  type CashMovementRow,
  type CashSalePaymentRow,
  type CashSessionRow,
} from "@/lib/cash-register";
import { moneyFormatter, toSafeNumber } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

function formatDateTime(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CashSessionDetailPage({
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

  const { data: sessionRow } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("business_id", business.id)
    .eq("id", id)
    .maybeSingle();

  if (!sessionRow) {
    notFound();
  }

  const session = sessionRow as CashSessionRow;
  const endDate = session.closed_at || new Date().toISOString();
  const [{ data: movementRows }, { data: paymentRows }, { data: countRows }] = await Promise.all([
    supabase
      .from("cash_movements")
      .select("*")
      .eq("business_id", business.id)
      .eq("session_id", session.id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("sale_payments")
      .select("id,amount,payment_method,paid_at,reference,sales!inner(id,sale_code,status)")
      .eq("business_id", business.id)
      .eq("sales.status", "completed")
      .gte("paid_at", session.opened_at)
      .lte("paid_at", endDate)
      .order("paid_at", { ascending: false }),
    supabase
      .from("cash_session_counts")
      .select("*")
      .eq("business_id", business.id)
      .eq("session_id", session.id),
  ]);
  const movements = (movementRows || []) as CashMovementRow[];
  const payments = (paymentRows || []) as unknown as CashSalePaymentRow[];
  const summary = calculateSessionSummary({ movements, payments, session });
  const timeline = buildCashTimeline({ movements, payments });
  const formatter = moneyFormatter(business.currency || "COP");
  const counts = (countRows || []) as {
    counted_amount: number | string | null;
    difference_amount: number | string | null;
    expected_amount: number | string | null;
    payment_method: string;
  }[];
  const expectedTotal =
    session.status === "closed" ? toSafeNumber(session.expected_total_amount) : summary.expectedTotal;
  const expectedCash =
    session.status === "closed" ? toSafeNumber(session.expected_cash_amount) : summary.expectedCash;
  const totalDifference = Number(session.total_difference_amount || 0);
  const methodTotal = summary.byMethod.reduce((total, item) => total + item.expectedAmount, 0);
  const topMethodAmount = Math.max(...summary.byMethod.map((item) => item.expectedAmount));

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
                {session.session_code}
              </p>
              <h1 className="mt-2 text-3xl font-black text-[#0F172A]">
                Detalle de caja
              </h1>
              <p className="mt-2 text-sm font-bold text-[#475569]">
                {getCashSessionStatusLabel(session.status)} · Apertura {formatDateTime(session.opened_at)}
                {session.closed_at ? ` · Cierre ${formatDateTime(session.closed_at)}` : ""}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {session.status === "open" && (
                <>
                  <Link href="/app/caja/movimiento" className="rounded-full border border-[#BFDBFE] bg-white px-5 py-3 text-center text-sm font-black text-[#2563EB]">
                    Registrar movimiento
                  </Link>
                  <Link href="/app/caja/cierre" className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/20">
                    Cerrar caja
                  </Link>
                </>
              )}
              <Link href="/app/caja" className="rounded-full border border-[#E2E8F0] bg-white px-5 py-3 text-center text-sm font-black text-[#475569]">
                Volver
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CashSummaryCard
            icon="cash"
            label="Saldo inicial"
            tone="blue"
            value={formatter.format(toSafeNumber(session.opening_cash_amount))}
          />
          <CashSummaryCard
            icon="cash"
            label="Efectivo esperado"
            tone="green"
            value={formatter.format(expectedCash)}
          />
          <CashSummaryCard
            icon="sale"
            label="Total esperado"
            tone="blue"
            value={formatter.format(expectedTotal)}
          />
          <CashSummaryCard
            icon="difference"
            label="Diferencia"
            tone={session.status !== "closed" ? "slate" : totalDifference === 0 ? "green" : totalDifference > 0 ? "blue" : "red"}
            value={
              session.status === "closed"
                ? `${formatCashDifference(session.total_difference_amount)} ${formatter.format(Math.abs(totalDifference))}`
                : "Pendiente"
            }
          />
        </section>

        {counts.length ? (
          <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-[#0F172A]">Cierre por método de pago</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {counts.map((count) => (
                <div key={count.payment_method} className="rounded-2xl bg-[#F8FAFC] p-4">
                  <p className="font-black text-[#0F172A]">{getPaymentMethodLabel(count.payment_method)}</p>
                  <p className="mt-2 text-sm font-bold text-[#475569]">
                    Esperado {formatter.format(toSafeNumber(count.expected_amount))}
                  </p>
                  <p className="text-sm font-bold text-[#475569]">
                    Contado {formatter.format(toSafeNumber(count.counted_amount))}
                  </p>
                  <p className="mt-2 text-sm font-black text-[#2563EB]">
                    Diferencia {formatter.format(Number(count.difference_amount || 0))}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-[#0F172A]">Uso por método</h2>
            <p className="mt-1 text-sm font-bold text-[#475569]">
              Participación de cada método dentro de esta sesión.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {summary.byMethod.map((item) => (
                <PaymentMethodUsageCard
                  key={item.paymentMethod}
                  amount={item.expectedAmount}
                  formatter={formatter}
                  isTop={item.expectedAmount > 0 && item.expectedAmount === topMethodAmount}
                  manualOut={item.manualOut}
                  paymentMethod={item.paymentMethod}
                  percentage={methodTotal > 0 ? (item.expectedAmount / methodTotal) * 100 : 0}
                  sales={item.sales}
                />
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-[#E2E8F0] bg-[#0F172A] p-5 text-white shadow-sm sm:p-6 xl:sticky xl:top-6 xl:self-start">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Estado</p>
            <h2 className="mt-2 text-2xl font-black">{getCashSessionStatusLabel(session.status)}</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-white/70">
              {session.status === "closed"
                ? "Esta sesión está cerrada y queda disponible para historial y reportes."
                : "Esta caja sigue abierta. Puedes registrar movimientos o hacer el cierre."}
            </p>
          </aside>
        </section>

        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-[#0F172A]">Movimientos y ventas cobradas</h2>
              <p className="mt-1 text-sm font-bold text-[#475569]">
                Actividad ordenada por fecha con color según tipo de movimiento.
              </p>
            </div>
            <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-[#2563EB]">
              {timeline.length} movimiento{timeline.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-5">
            {timeline.length ? (
              <div className="space-y-3">
                {timeline.map((item) => (
                  <CashMovementItem
                    key={item.id}
                    formatDateTime={formatDateTime}
                    formatter={formatter}
                    item={item}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[#BFDBFE] bg-[#F8FAFC] p-6 text-center">
                <p className="text-base font-black text-[#0F172A]">Esta sesión no tiene movimientos todavía</p>
                <p className="mt-2 text-sm font-bold leading-6 text-[#475569]">
                  Las ventas cobradas y movimientos manuales aparecerán aquí.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
