"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createInventoryCount } from "@/app/(dashboard)/app/inventario/actions";
import { trackEvent } from "@/lib/analytics";
import {
  inventoryUnitLabel,
  unitsForVariant,
  validateCountInput,
  type InventoryCountInput,
  type InventoryCountInputItem,
  type InventoryFieldErrors,
  type InventoryVariant,
} from "@/lib/inventory";
import type { MeasurementUnit } from "@/lib/measurements";
import { moneyFormatter, sanitizeNumericInput, toSafeNumber } from "@/lib/products/product-utils";

const inputClass =
  "w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] shadow-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

function variantLabel(variant: InventoryVariant) {
  return `${variant.product_name} · ${variant.name || "Presentación estándar"}`;
}

export function InventoryCountForm({
  currency = "COP",
  variants,
}: {
  currency?: string;
  variants: InventoryVariant[];
}) {
  const formatter = moneyFormatter(currency);
  const [form, setForm] = useState<InventoryCountInput>({ items: [], notes: "" });
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<InventoryFieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const filteredVariants = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return variants.filter((variant) => {
      if (!normalized) return true;
      return `${variant.product_name} ${variant.name || ""} ${variant.sku || ""}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, variants]);

  function addVariant(variant: InventoryVariant) {
    if (form.items.some((item) => item.variantId === variant.id)) return;

    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          countedStock: String(toSafeNumber(variant.current_stock)),
          stockUnit: (variant.inventory_unit || "unit") as MeasurementUnit,
          variantId: variant.id,
        },
      ],
    }));
  }

  function updateItem(index: number, patch: Partial<InventoryCountInputItem>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function removeItem(index: number) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function submit() {
    const validation = validateCountInput(form, variants);

    if (!validation.ok) {
      setError(validation.error);
      setFieldErrors(validation.fieldErrors);
      return;
    }

    if (!confirm("Margenia ajustará el inventario según las cantidades contadas.")) {
      return;
    }

    startTransition(async () => {
      setError("");
      trackEvent("inventory_count_completed", {
        item_count: form.items.length,
        source: "inventory_count",
      });
      const result = await createInventoryCount(form);

      if (result && !result.ok) {
        setError(result.error || "No pudimos finalizar el conteo.");
        setFieldErrors(result.fieldErrors || {});
      }
    });
  }

  const totalDifferenceCost = form.items.reduce((total, item) => {
    const variant = variants.find((current) => current.id === item.variantId);
    const difference = toSafeNumber(item.countedStock) - toSafeNumber(variant?.current_stock);
    return total + Math.abs(difference) * toSafeNumber(variant?.purchase_cost);
  }, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
              Conteo físico
            </p>
            <h1 className="mt-2 text-3xl font-black text-[#0F172A]">Conteo físico</h1>
            <p className="mt-2 text-sm font-bold text-[#475569]">
              Ajusta el inventario real según lo contado en tu negocio.
            </p>
          </div>
          <Link href="/app/inventario" className="rounded-full border border-[#BFDBFE] bg-white px-5 py-3 text-sm font-black text-[#2563EB]">
            Volver
          </Link>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#991B1B]">
            {error}
          </div>
        )}

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca productos para contar"
          className={`${inputClass} mt-6`}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filteredVariants.slice(0, 8).map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => addVariant(variant)}
              className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-left transition hover:bg-white"
            >
              <p className="font-black text-[#0F172A]">{variantLabel(variant)}</p>
              <p className="mt-1 text-xs font-bold text-[#475569]">
                Sistema: {toSafeNumber(variant.current_stock)} {inventoryUnitLabel(variant.inventory_unit)}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <h2 className="text-xl font-black text-[#0F172A]">Productos a contar</h2>
          {form.items.length ? (
            form.items.map((item, index) => {
              const variant = variants.find((current) => current.id === item.variantId);
              const units = unitsForVariant(variant);
              const difference = toSafeNumber(item.countedStock) - toSafeNumber(variant?.current_stock);

              return (
                <div key={item.variantId} className="rounded-2xl border border-[#E2E8F0] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#0F172A]">{variant ? variantLabel(variant) : "Producto"}</p>
                      <p className="text-xs font-bold text-[#475569]">
                        Sistema: {toSafeNumber(variant?.current_stock)} {inventoryUnitLabel(variant?.inventory_unit)}
                      </p>
                    </div>
                    <button type="button" onClick={() => removeItem(index)} className="text-xs font-black text-[#DC2626]">
                      Quitar
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <input
                      inputMode="decimal"
                      value={item.countedStock}
                      onChange={(event) => updateItem(index, { countedStock: sanitizeNumericInput(event.target.value) })}
                      className={`${inputClass} ${fieldErrors[`items.${index}.countedStock`] ? "border-[#EF4444]" : ""}`}
                    />
                    <select
                      value={item.stockUnit}
                      onChange={(event) => updateItem(index, { stockUnit: event.target.value as MeasurementUnit })}
                      className={inputClass}
                    >
                      {units.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                    <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3">
                      <p className="text-xs font-black text-[#64748B]">Diferencia</p>
                      <p className="font-black text-[#0F172A]">{difference.toLocaleString("es-CO")}</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-2xl bg-[#F8FAFC] p-4 text-sm font-bold text-[#475569]">
              Agrega productos para iniciar el conteo.
            </p>
          )}
        </div>
      </section>

      <aside className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 xl:sticky xl:top-6 xl:self-start">
        <h2 className="text-xl font-black text-[#0F172A]">Resumen</h2>
        <div className="mt-5 rounded-2xl bg-[#EFF6FF] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Diferencia estimada
          </p>
          <p className="mt-1 text-2xl font-black text-[#0F172A]">
            {formatter.format(totalDifferenceCost)}
          </p>
        </div>
        <label className="mt-5 block">
          <span className="text-sm font-black text-[#0F172A]">Nota</span>
          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            className={`${inputClass} mt-2 min-h-24`}
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-4 text-sm font-black text-white shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Finalizando..." : "Finalizar conteo"}
        </button>
      </aside>
    </div>
  );
}
