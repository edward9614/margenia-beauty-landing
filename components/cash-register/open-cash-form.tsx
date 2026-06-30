"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { openCashSession } from "@/app/(dashboard)/app/caja/actions";
import { FieldLabel } from "@/components/ui/field-label";
import { cashHelp } from "@/lib/help-content";
import { emptyOpenCashSession, validateOpenCashSession, type CashFieldErrors, type OpenCashSessionInput } from "@/lib/cash-register";
import { sanitizeNumericInput } from "@/lib/products/product-utils";

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

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
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">Caja</p>
          <h1 className="mt-2 text-3xl font-black text-[#0F172A]">Abrir caja</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#475569]">
            Define el efectivo inicial para empezar a controlar ingresos, salidas y cierre del día.
          </p>
        </div>
        <Link href="/app/caja" className="rounded-full border border-[#BFDBFE] bg-white px-5 py-3 text-sm font-black text-[#2563EB]">
          Volver
        </Link>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-5">
        <label className="block">
          <FieldLabel help={cashHelp.openingCash} label="Saldo inicial en efectivo" required />
          <input
            inputMode="decimal"
            value={form.openingCashAmount}
            onChange={(event) => updateForm("openingCashAmount", sanitizeNumericInput(event.target.value))}
            placeholder="Ej: 100000"
            className={`${inputClass} ${fieldErrors.openingCashAmount ? "border-[#EF4444]" : ""}`}
          />
          {fieldErrors.openingCashAmount && (
            <span className="mt-1 block text-xs font-bold text-[#DC2626]">
              {fieldErrors.openingCashAmount}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#0F172A]">Nota opcional</span>
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
          className="w-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-4 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Abriendo..." : "Abrir caja"}
        </button>
      </div>
    </section>
  );
}
