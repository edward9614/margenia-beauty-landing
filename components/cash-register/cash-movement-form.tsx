"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createCashMovement } from "@/app/(dashboard)/app/caja/actions";
import { FieldLabel } from "@/components/ui/field-label";
import {
  dashboardFieldClass,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import {
  cashMovementTypes,
  cashPaymentMethods,
  emptyCashMovement,
  validateCashMovement,
  type CashFieldErrors,
  type CashMovementInput,
} from "@/lib/cash-register";
import { cashHelp } from "@/lib/help-content";
import { sanitizeNumericInput } from "@/lib/products/product-utils";

const inputClass = `mt-2 ${dashboardFieldClass}`;

export function CashMovementForm() {
  const [form, setForm] = useState<CashMovementInput>(emptyCashMovement());
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CashFieldErrors>({});
  const [isPending, startTransition] = useTransition();
  const filteredTypes = useMemo(
    () => cashMovementTypes.filter((item) => !item.direction || item.direction === form.direction),
    [form.direction],
  );

  function updateForm<K extends keyof CashMovementInput>(
    key: K,
    value: CashMovementInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function changeDirection(direction: CashMovementInput["direction"]) {
    const nextType =
      cashMovementTypes.find((item) => item.direction === direction)?.value || "other";

    setForm((current) => ({
      ...current,
      direction,
      movementType: nextType,
    }));
  }

  function submit() {
    const validation = validateCashMovement(form);

    if (!validation.ok) {
      setError(validation.error);
      setFieldErrors(validation.fieldErrors);
      return;
    }

    startTransition(async () => {
      setError("");
      const result = await createCashMovement(form);

      if (result && !result.ok) {
        setError(result.error || "No pudimos guardar el movimiento.");
        setFieldErrors(result.fieldErrors || {});
      }
    });
  }

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Caja
            </p>
          </div>
          <h1 className="mt-2 text-3xl font-black text-white">
            Registrar movimiento de caja
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
            Registra ingresos o salidas que no vienen directamente de una venta.
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

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <FieldLabel appearance="dark" help={cashHelp.movement} label="Tipo" required />
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {[
              { help: cashHelp.income, label: "Ingreso", value: "in" as const },
              { help: cashHelp.outcome, label: "Salida", value: "out" as const },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => changeDirection(option.value)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  form.direction === option.value
                    ? option.value === "in"
                      ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100 ring-4 ring-emerald-300/5"
                      : "border-rose-300/40 bg-rose-300/10 text-rose-100 ring-4 ring-rose-300/5"
                    : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20 hover:bg-white/[0.06]"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-black">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-black text-slate-100">Motivo</span>
          <select
            value={form.movementType}
            onChange={(event) => updateForm("movementType", event.target.value as CashMovementInput["movementType"])}
            className={`${inputClass} ${fieldErrors.movementType ? "border-[#EF4444]" : ""}`}
          >
            {filteredTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <FieldLabel appearance="dark" help={cashHelp.paymentMethod} label="Método de pago" required />
          <select
            value={form.paymentMethod}
            onChange={(event) => updateForm("paymentMethod", event.target.value as CashMovementInput["paymentMethod"])}
            className={`${inputClass} ${fieldErrors.paymentMethod ? "border-[#EF4444]" : ""}`}
          >
            {cashPaymentMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-100">Valor</span>
          <input
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => updateForm("amount", sanitizeNumericInput(event.target.value))}
            placeholder="Ej: 25000"
            className={`${inputClass} ${fieldErrors.amount ? "border-[#EF4444]" : ""}`}
          />
          {fieldErrors.amount && (
            <span className="mt-1 block text-xs font-bold text-rose-300">
              {fieldErrors.amount}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-100">Fecha/hora opcional</span>
          <input
            type="datetime-local"
            value={form.occurredAt}
            onChange={(event) => updateForm("occurredAt", event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-100">Categoría opcional</span>
          <input
            value={form.category}
            onChange={(event) => updateForm("category", event.target.value)}
            placeholder="Ej: Bolsas, domicilios, proveedor"
            className={inputClass}
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-sm font-black text-slate-100">Descripción</span>
          <textarea
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
            placeholder="Ej: compra de bolsas para entregas"
            className={`${inputClass} min-h-28`}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className={`${dashboardPrimaryActionClass} mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isPending ? "Guardando..." : "Guardar movimiento"}
      </button>
    </section>
  );
}
