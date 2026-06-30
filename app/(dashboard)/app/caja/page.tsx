import Link from "next/link";
import { redirect } from "next/navigation";
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

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
                Caja
              </p>
              <h1 className="mt-2 text-3xl font-black text-[#0F172A]">
                {session ? "Caja abierta" : "Caja sin abrir"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#475569]">
                {session
                  ? `Abierta desde ${formatDateTime(session.opened_at)}. Controla ventas cobradas, ingresos, salidas y cierre.`
                  : "Abre caja para empezar a controlar ingresos, salidas y cierre del día."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {session ? (
                <>
                  <Link href="/app/caja/movimiento" className="rounded-full border border-[#BFDBFE] bg-white px-5 py-3 text-center text-sm font-black text-[#2563EB]">
                    Registrar movimiento
                  </Link>
                  <Link href="/app/caja/cierre" className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/20">
                    Cerrar caja
                  </Link>
                </>
              ) : (
                <Link href="/app/caja/abrir" className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/20">
                  Abrir caja
                </Link>
              )}
            </div>
          </div>
        </section>

        {summary && session ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Efectivo esperado", formatter.format(summary.expectedCash)],
                ["Ventas cobradas", formatter.format(summary.totalSales)],
                ["Salidas registradas", formatter.format(summary.totalManualOut)],
                [
                  "Última diferencia",
                  lastClosed
                    ? formatter.format(Number(lastClosed.total_difference_amount || 0))
                    : "Sin cierres",
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">{label}</p>
                  <p className="mt-3 text-2xl font-black text-[#0F172A]">{value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-black text-[#0F172A]">Movimientos de la caja</h2>
                <p className="mt-1 text-sm font-bold text-[#475569]">
                  Ventas cobradas y movimientos manuales de esta sesión.
                </p>
                <div className="mt-5 overflow-hidden rounded-2xl border border-[#E2E8F0]">
                  {timeline.length ? (
                    <div className="divide-y divide-[#E2E8F0]">
                      {timeline.map((item) => (
                        <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:items-center">
                          <div>
                            <p className="font-black text-[#0F172A]">{item.title}</p>
                            <p className="text-xs font-bold text-[#64748B]">{formatDateTime(item.occurredAt)}</p>
                          </div>
                          <p className="text-sm font-bold text-[#475569]">
                            {getPaymentMethodLabel(item.method)}
                          </p>
                          <p className="text-sm font-bold text-[#475569]">{item.reference}</p>
                          <p className={`text-right text-sm font-black ${item.direction === "in" ? "text-[#166534]" : "text-[#991B1B]"}`}>
                            {item.direction === "in" ? "+" : "-"} {formatter.format(item.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-5 text-sm font-bold text-[#475569]">
                      Aún no hay movimientos en esta caja.
                    </p>
                  )}
                </div>
              </div>

              <aside className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 xl:sticky xl:top-6 xl:self-start">
                <h2 className="text-xl font-black text-[#0F172A]">Por método de pago</h2>
                <div className="mt-5 space-y-3">
                  {summary.byMethod.map((item) => (
                    <div key={item.paymentMethod} className="rounded-2xl bg-[#F8FAFC] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-[#0F172A]">
                          {getPaymentMethodLabel(item.paymentMethod)}
                        </p>
                        <p className="text-sm font-black text-[#2563EB]">
                          {formatter.format(item.expectedAmount)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs font-bold text-[#64748B]">
                        Ventas {formatter.format(item.sales)} · Salidas {formatter.format(item.manualOut)}
                      </p>
                    </div>
                  ))}
                </div>
              </aside>
            </section>
          </>
        ) : null}

        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-[#0F172A]">Historial de caja</h2>
              <p className="mt-1 text-sm font-bold text-[#475569]">Últimas sesiones abiertas o cerradas.</p>
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-[#E2E8F0]">
            {(recentSessions || []).length ? (
              <div className="divide-y divide-[#E2E8F0]">
                {((recentSessions || []) as CashSessionRow[]).map((item) => (
                  <Link
                    key={item.id}
                    href={`/app/caja/sesiones/${item.id}`}
                    className="grid gap-3 p-4 transition hover:bg-[#F8FAFC] md:grid-cols-[1fr_1fr_1fr_1fr] md:items-center"
                  >
                    <div>
                      <p className="font-black text-[#0F172A]">{item.session_code}</p>
                      <p className="text-xs font-bold text-[#64748B]">{formatDateTime(item.opened_at)}</p>
                    </div>
                    <p className="text-sm font-bold text-[#475569]">{getCashSessionStatusLabel(item.status)}</p>
                    <p className="text-sm font-bold text-[#475569]">
                      Esperado {formatter.format(toSafeNumber(item.expected_total_amount))}
                    </p>
                    <p className="text-sm font-black text-[#0F172A]">
                      {item.status === "closed"
                        ? `${formatCashDifference(item.total_difference_amount)} ${formatter.format(Math.abs(Number(item.total_difference_amount || 0)))}`
                        : "Pendiente de cierre"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="p-5 text-sm font-bold text-[#475569]">
                Aún no tienes sesiones de caja.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
