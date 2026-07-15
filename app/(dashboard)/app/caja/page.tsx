import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CashMovementItem,
  CashSummaryCard,
  PaymentMethodUsageCard,
} from "@/components/cash-register/cash-dashboard-widgets";
import {
  AppPageHeader,
  DashboardEmptyState,
  DashboardShell,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import {
  buildCashTimeline,
  calculateSessionSummary,
  formatCashDifference,
  getCashSessionStatusLabel,
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

async function getBusinessContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) {
    redirect("/app/onboarding");
  }

  return { business, supabase };
}

export default async function CashRegisterPage() {
  const { business, supabase } = await getBusinessContext();
  const formatter = moneyFormatter(business.currency || "COP");
  const { data: openSession } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("business_id", business.id)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: recentSessions } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("business_id", business.id)
    .order("opened_at", { ascending: false })
    .limit(8);

  const session = openSession as CashSessionRow | null;
  let movements: CashMovementRow[] = [];
  let payments: CashSalePaymentRow[] = [];

  if (session) {
    const [{ data: movementRows }, { data: paymentRows }] = await Promise.all([
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
        .lte("paid_at", new Date().toISOString())
        .order("paid_at", { ascending: false }),
    ]);

    movements = (movementRows || []) as CashMovementRow[];
    payments = (paymentRows || []) as unknown as CashSalePaymentRow[];
  }

  const summary = session
    ? calculateSessionSummary({ movements, payments, session })
    : null;
  const timeline = buildCashTimeline({ movements, payments });
  const lastClosed = ((recentSessions || []) as CashSessionRow[]).find(
    (item) => item.status === "closed",
  );
  const methodTotal = summary
    ? summary.byMethod.reduce((total, item) => total + item.expectedAmount, 0)
    : 0;
  const topMethodAmount = summary
    ? Math.max(...summary.byMethod.map((item) => item.expectedAmount))
    : 0;
  const lastDifference = Number(lastClosed?.total_difference_amount || 0);

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <DashboardShell>
        <AppPageHeader
          eyebrow="Caja"
          title={session ? "Caja abierta" : "Caja sin abrir"}
          description={
            session
              ? `Abierta desde ${formatDateTime(session.opened_at)}. Controla ventas cobradas, ingresos, salidas y cierres.`
              : "Abre caja para empezar a controlar ingresos, salidas y cierres del día."
          }
          actions={
            <>
              {session ? (
                <>
                  <Link href="/app/caja/movimiento" className={dashboardSecondaryActionClass}>
                    Registrar movimiento
                  </Link>
                  <Link href="/app/caja/cierre" className={dashboardPrimaryActionClass}>
                    Cerrar caja
                  </Link>
                </>
              ) : (
                <Link href="/app/caja/abrir" className={dashboardPrimaryActionClass}>
                  Abrir caja
                </Link>
              )}
            </>
          }
        />

        <div className="space-y-5 p-4 sm:p-6 lg:p-8">

        {summary && session ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <CashSummaryCard
                icon="cash"
                label="Efectivo esperado"
                tone="blue"
                value={formatter.format(summary.expectedCash)}
              />
              <CashSummaryCard
                icon="sale"
                label="Ventas cobradas"
                tone="green"
                value={formatter.format(summary.totalSales)}
              />
              <CashSummaryCard
                icon="out"
                label="Salidas registradas"
                tone="red"
                value={formatter.format(summary.totalManualOut)}
              />
              <CashSummaryCard
                icon="difference"
                label="Última diferencia"
                tone={!lastClosed ? "slate" : lastDifference === 0 ? "green" : lastDifference > 0 ? "blue" : "red"}
                value={lastClosed ? formatter.format(lastDifference) : "Sin cierres"}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">Movimientos de la caja</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-400">
                      Ventas cobradas y movimientos manuales de esta sesión.
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-cyan-200 ring-1 ring-cyan-300/20">
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
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-6 text-center">
                      <p className="text-base font-black text-white">Aún no hay movimientos en esta caja</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                        Cuando registres ventas, ingresos o salidas, aparecerán aquí con su color y método de pago.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6 xl:sticky xl:top-6 xl:self-start">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-white">Por método de pago</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-400">
                      Participación del dinero esperado.
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-black text-slate-300 ring-1 ring-white/10">
                    {formatter.format(methodTotal)}
                  </span>
                </div>
                <div className="mt-5 space-y-3">
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
              </aside>
            </section>
          </>
        ) : (
          <DashboardEmptyState
            actionHref="/app/caja/abrir"
            actionLabel="Abrir caja"
            title="Tu caja está lista para comenzar"
            description="Define el saldo inicial y Margenia reunirá ventas cobradas, ingresos y salidas en una sola sesión."
          />
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Historial de caja</h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">Últimas sesiones abiertas o cerradas.</p>
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08]">
            {(recentSessions || []).length ? (
              <div className="divide-y divide-white/[0.07]">
                {((recentSessions || []) as CashSessionRow[]).map((item) => (
                  <Link
                    key={item.id}
                    href={`/app/caja/sesiones/${item.id}`}
                    className="grid gap-3 p-4 transition hover:bg-white/[0.055] md:grid-cols-[1fr_1fr_1fr_1fr] md:items-center"
                  >
                    <div>
                      <p className="font-black text-white">{item.session_code}</p>
                      <p className="text-xs font-semibold text-slate-500">{formatDateTime(item.opened_at)}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-300">{getCashSessionStatusLabel(item.status)}</p>
                    <p className="text-sm font-semibold text-slate-400">
                      Esperado {formatter.format(toSafeNumber(item.expected_total_amount))}
                    </p>
                    <p className="text-sm font-black text-white">
                      {item.status === "closed"
                        ? `${formatCashDifference(item.total_difference_amount)} ${formatter.format(Math.abs(Number(item.total_difference_amount || 0)))}`
                        : "Pendiente de cierre"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="p-5 text-sm font-semibold text-slate-400">
                Aún no tienes sesiones de caja.
              </p>
            )}
          </div>
        </section>
        </div>
      </DashboardShell>
    </main>
  );
}
