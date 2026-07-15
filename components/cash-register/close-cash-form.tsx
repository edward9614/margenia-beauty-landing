"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { closeCashSession } from "@/app/(dashboard)/app/caja/actions";
import { FieldLabel } from "@/components/ui/field-label";
import {
  dashboardFieldClass,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import {
  emptyCloseCashSession,
  getPaymentMethodLabel,
  validateCloseCashSession,
  type CashFieldErrors,
  type CashMovementRow,
  type CashSalePaymentRow,
  type CashSessionRow,
  type CloseCashSessionInput,
} from "@/lib/cash-register";
import { calculateSessionSummary } from "@/lib/cash-register";
import { cashHelp } from "@/lib/help-content";
import { moneyFormatter, sanitizeNumericInput, toSafeNumber } from "@/lib/products/product-utils";

const inputClass = `mt-2 ${dashboardFieldClass}`;

export function CloseCashForm({
  currency = "COP",
  movements,
  payments,
  session,
}: {
  currency?: string;
  movements: CashMovementRow[];
  payments: CashSalePaymentRow[];
  session: CashSessionRow;
}) {
  const formatter = moneyFormatter(currency);
  const summary = useMemo(
    () => calculateSessionSummary({ movements, payments, session }),
    [movements, payments, session],
  );
  const [form, setForm] = useState<CloseCashSessionInput>(() => {
    const initial = emptyCloseCashSession(session.id);
    return {
      ...initial,
      counts: initial.counts.map((count) => ({
        ...count,
        countedAmount: String(
          summary.byMethod.find((item) => item.paymentMethod === count.paymentMethod)?.expectedAmount || 0,
        ),
      })),
    };
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CashFieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const countedTotal = form.counts.reduce((total, count) => total + toSafeNumber(count.countedAmount), 0);

  function updateCount(index: number, countedAmount: string) {
    setForm((current) => ({
      ...current,
      counts: current.counts.map((count, currentIndex) =>
        currentIndex === index ? { ...count, countedAmount } : count,
      ),
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[`counts.${index}.countedAmount`];
      return next;
    });
  }

  function submit() {
    const validation = validateCloseCashSession(form);

    if (!validation.ok) {
      setError(validation.error);
      setFieldErrors(validation.fieldErrors);
      return;
    }

    if (!confirm("Al cerrar la caja no podrás registrar más movimientos en esta sesión.")) {
      return;
    }

    startTransition(async () => {
      setError("");
      const result = await closeCashSession(form);

      if (result && !result.ok) {
        setError(result.error || "No pudimos cerrar caja.");
        setFieldErrors(result.fieldErrors || {});
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Caja</p>
            <h1 className="mt-2 text-3xl font-black text-white">Cerrar caja</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
              Revisa lo esperado, confirma lo contado y guarda el cierre del día.
            </p>
          </div>
          <Link href="/app/caja" className={dashboardSecondaryActionClass}>
            Volver
          </Link>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-100">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/15 p-4">
          <FieldLabel appearance="dark" help={cashHelp.expectedCash} label="Resumen esperado" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Saldo inicial", formatter.format(toSafeNumber(session.opening_cash_amount))],
              ["Ventas cobradas", formatter.format(summary.totalSales)],
              ["Ingresos manuales", formatter.format(summary.totalManualIn)],
              ["Salidas manuales", formatter.format(summary.totalManualOut)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/[0.045] p-4 ring-1 ring-white/10">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <FieldLabel appearance="dark" help={cashHelp.countedAmount} label="Conteo por método de pago" required />
          <div className="mt-3 space-y-3">
            {form.counts.map((count, index) => {
              const expected =
                summary.byMethod.find((item) => item.paymentMethod === count.paymentMethod)?.expectedAmount || 0;
              const difference = toSafeNumber(count.countedAmount) - expected;

              return (
                <div key={count.paymentMethod} className="grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-white/15 hover:bg-white/[0.045] md:grid-cols-[1fr_1fr_1fr] md:items-end">
                  <div>
                    <p className="text-sm font-black text-white">
                      {getPaymentMethodLabel(count.paymentMethod)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Esperado: {formatter.format(expected)}
                    </p>
                  </div>
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Contado
                    </span>
                    <input
                      inputMode="decimal"
                      value={count.countedAmount}
                      onChange={(event) => updateCount(index, sanitizeNumericInput(event.target.value))}
                      className={`${inputClass} ${fieldErrors[`counts.${index}.countedAmount`] ? "border-[#EF4444]" : ""}`}
                    />
                  </label>
                  <div className={`rounded-2xl px-4 py-3 text-sm font-black ${
                    difference === 0
                      ? "bg-emerald-300/10 text-emerald-200 ring-1 ring-emerald-300/20"
                      : difference > 0
                        ? "bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20"
                        : "bg-rose-300/10 text-rose-200 ring-1 ring-rose-300/20"
                  }`}>
                    {difference === 0 ? "Cuadra" : difference > 0 ? "Sobra" : "Falta"} · {formatter.format(Math.abs(difference))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-black text-slate-100">Notas de cierre</span>
          <textarea
            value={form.closingNotes}
            onChange={(event) => setForm((current) => ({ ...current, closingNotes: event.target.value }))}
            className={`${inputClass} min-h-28`}
          />
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className={`${dashboardPrimaryActionClass} mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isPending ? "Cerrando..." : "Cerrar caja"}
        </button>
      </section>

      <aside className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm sm:p-6 xl:sticky xl:top-6 xl:self-start">
        <FieldLabel appearance="dark" help={cashHelp.difference} label="Diferencias" />
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/60">Total esperado</p>
            <p className="mt-2 text-3xl font-black">{formatter.format(summary.expectedTotal)}</p>
          </div>
          <div className="rounded-2xl border border-blue-300/20 bg-blue-300/[0.08] p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-200">Total contado</p>
            <p className="mt-2 text-3xl font-black text-white">{formatter.format(countedTotal)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Diferencia total</p>
            <p className="mt-2 text-3xl font-black text-white">
              {formatter.format(countedTotal - summary.expectedTotal)}
            </p>
          </div>
          <p className="rounded-2xl bg-white/[0.035] p-4 text-sm font-semibold leading-6 text-slate-400 ring-1 ring-white/[0.07]">
            Margenia guardará este cierre para que luego puedas revisar reportes e historial.
          </p>
        </div>
      </aside>
    </div>
  );
}
