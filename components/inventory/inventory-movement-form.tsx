"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createInventoryMovement } from "@/app/(dashboard)/app/inventario/actions";
import { trackEvent } from "@/lib/analytics";
import {
  calculateMovementPreview,
  emptyInventoryMovement,
  manualMovementKinds,
  unitsForVariant,
  validateMovementInput,
  type InventoryFieldErrors,
  type InventoryMovementInput,
  type InventoryVariant,
} from "@/lib/inventory";
import type { MeasurementUnit } from "@/lib/measurements";
import { moneyFormatter, sanitizeNumericInput, toSafeNumber } from "@/lib/products/product-utils";

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

function variantLabel(variant: InventoryVariant) {
  return `${variant.product_name} · ${variant.name || "Presentación estándar"}`;
}

export function InventoryMovementForm({
  currency = "COP",
  variants,
}: {
  currency?: string;
  variants: InventoryVariant[];
}) {
  const formatter = moneyFormatter(currency);
  const [form, setForm] = useState<InventoryMovementInput>(emptyInventoryMovement());
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<InventoryFieldErrors>({});
  const [isPending, startTransition] = useTransition();
  const selectedVariant = variants.find((variant) => variant.id === form.variantId);
  const preview = calculateMovementPreview(form, selectedVariant);
  const units = unitsForVariant(selectedVariant);

  const unitCost = form.unitCost ? toSafeNumber(form.unitCost) : toSafeNumber(selectedVariant?.purchase_cost);
  const estimatedCost = Math.abs(preview.quantityInInventoryUnit) * unitCost;

  function updateForm<K extends keyof InventoryMovementInput>(
    key: K,
    value: InventoryMovementInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function submit() {
    const validation = validateMovementInput(form, selectedVariant);

    if (!validation.ok) {
      setError(validation.error);
      setFieldErrors(validation.fieldErrors);
      return;
    }

    startTransition(async () => {
      setError("");
      trackEvent("inventory_movement_created", {
        source: "inventory_form",
      });
      const result = await createInventoryMovement(form);

      if (result && !result.ok) {
        setError(result.error || "No pudimos guardar el movimiento.");
        setFieldErrors(result.fieldErrors || {});
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
              Inventario
            </p>
            <h1 className="mt-2 text-3xl font-black text-[#0F172A]">
              Registrar movimiento
            </h1>
            <p className="mt-2 text-sm font-bold text-[#475569]">
              Registra entradas, salidas manuales, mermas, devoluciones o ajustes.
            </p>
          </div>
          <Link
            href="/app/inventario"
            className="rounded-full border border-[#BFDBFE] bg-white px-5 py-3 text-sm font-black text-[#2563EB]"
          >
            Volver
          </Link>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#991B1B]">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-sm font-black text-[#0F172A]">Producto</span>
            <select
              value={form.variantId}
              onChange={(event) => {
                const variant = variants.find((item) => item.id === event.target.value);
                updateForm("variantId", event.target.value);
                updateForm("quantityUnit", (variant?.inventory_unit || "unit") as MeasurementUnit);
                updateForm("unitCost", variant?.purchase_cost ? String(variant.purchase_cost) : "");
              }}
              className={`${inputClass} ${fieldErrors.variantId ? "border-[#EF4444]" : ""}`}
            >
              <option value="">Selecciona un producto</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variantLabel(variant)}
                </option>
              ))}
            </select>
            {fieldErrors.variantId && (
              <span className="mt-1 block text-xs font-bold text-[#DC2626]">
                {fieldErrors.variantId}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-black text-[#0F172A]">Tipo</span>
            <select
              value={form.kind}
              onChange={(event) => updateForm("kind", event.target.value as InventoryMovementInput["kind"])}
              className={inputClass}
            >
              {manualMovementKinds.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-black text-[#0F172A]">Cantidad</span>
            <input
              inputMode="decimal"
              value={form.quantity}
              onChange={(event) => updateForm("quantity", sanitizeNumericInput(event.target.value))}
              className={`${inputClass} ${fieldErrors.quantity ? "border-[#EF4444]" : ""}`}
            />
            {fieldErrors.quantity && (
              <span className="mt-1 block text-xs font-bold text-[#DC2626]">
                {fieldErrors.quantity}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-black text-[#0F172A]">Unidad</span>
            <select
              value={form.quantityUnit}
              onChange={(event) => updateForm("quantityUnit", event.target.value as MeasurementUnit)}
              className={inputClass}
            >
              {units.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-black text-[#0F172A]">Costo unitario opcional</span>
            <input
              inputMode="decimal"
              value={form.unitCost}
              onChange={(event) => updateForm("unitCost", sanitizeNumericInput(event.target.value))}
              className={inputClass}
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-black text-[#0F172A]">Motivo</span>
            <input
              value={form.reason}
              onChange={(event) => updateForm("reason", event.target.value)}
              placeholder="Ej: compra, merma, corrección de conteo"
              className={inputClass}
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-black text-[#0F172A]">Nota</span>
            <textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              className={`${inputClass} min-h-24`}
            />
          </label>
        </div>
      </section>

      <aside className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 xl:sticky xl:top-6 xl:self-start">
        <h2 className="text-xl font-black text-[#0F172A]">Preview</h2>
        <div className="mt-5 space-y-4">
          {[
            ["Stock actual", preview.currentStock],
            ["Movimiento", preview.signedQuantity],
            ["Stock final", preview.finalStock],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-center justify-between rounded-2xl bg-[#F8FAFC] px-4 py-3">
              <span className="text-sm font-bold text-[#475569]">{label}</span>
              <span className="font-black text-[#0F172A]">{Number(value).toLocaleString("es-CO")}</span>
            </div>
          ))}
          <div className="rounded-2xl bg-[#EFF6FF] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2563EB]">
              Valor estimado
            </p>
            <p className="mt-1 text-2xl font-black text-[#0F172A]">
              {formatter.format(estimatedCost)}
            </p>
          </div>
          {preview.stockError && (
            <p className="rounded-2xl bg-[#FEF2F2] p-4 text-sm font-black text-[#991B1B]">
              {preview.stockError}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-4 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar movimiento"}
        </button>
      </aside>
    </div>
  );
}
