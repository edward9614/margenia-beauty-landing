"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { openCashSession } from "@/app/(dashboard)/app/caja/actions";
import { FieldLabel } from "@/components/ui/field-label";
import {
  dashboardFieldClass,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import { cashHelp } from "@/lib/help-content";
import { emptyOpenCashSession, validateOpenCashSession, type CashFieldErrors, type OpenCashSessionInput } from "@/lib/cash-register";
import { sanitizeNumericInput } from "@/lib/products/product-utils";

const inputClass = `mt-2 ${dashboardFieldClass}`;

export function OpenCashForm() {
  const [form, setForm] = useState<OpenCashSessionInput>(emptyOpenCashSession());
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CashFieldErrors>({});
  const [isPending, startTransition] = useTransition();

  function updateForm<K extends keyof OpenCashSessionInput>(
    key: K,
    value: OpenCashSessionInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function submit() {
    const validation = validateOpenCashSession(form);

    if (!validation.ok) {
      setError(validation.error);
      setFieldErrors(validation.fieldErrors);
      return;
    }

    startTransition(async () => {
      setError("");
      const result = await openCashSession(form);

      if (result && !result.ok) {
        setError(result.error || "No pudimos abrir caja.");
        setFieldErrors(result.fieldErrors || {});
      }
    });
  }

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Caja</p>
          <h1 className="mt-2 text-3xl font-black text-white">Abrir caja</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
            Define el efectivo inicial para empezar a controlar ingresos, salidas y cierre del día.
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

      <div className="mt-6 space-y-5">
        <label className="block">
          <FieldLabel appearance="dark" help={cashHelp.openingCash} label="Saldo inicial en efectivo" required />
          <input
            inputMode="decimal"
            value={form.openingCashAmount}
            onChange={(event) => updateForm("openingCashAmount", sanitizeNumericInput(event.target.value))}
            placeholder="Ej: 100000"
            className={`${inputClass} ${fieldErrors.openingCashAmount ? "border-rose-300/70" : ""}`}
          />
          {fieldErrors.openingCashAmount && (
            <span className="mt-1 block text-xs font-bold text-rose-300">
              {fieldErrors.openingCashAmount}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-100">Nota opcional</span>
          <textarea
            value={form.openingNotes}
            onChange={(event) => updateForm("openingNotes", event.target.value)}
            placeholder="Ej: caja inicia con cambio para ventas del día"
            className={`${inputClass} min-h-28`}
          />
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className={`${dashboardPrimaryActionClass} w-full disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isPending ? "Abriendo..." : "Abrir caja"}
        </button>
      </div>
    </section>
  );
}
