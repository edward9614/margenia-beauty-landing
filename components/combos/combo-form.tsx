"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import {
  archiveCombo,
  createCombo,
  restoreCombo,
  updateCombo as updateComboAction,
} from "@/app/(dashboard)/app/combos/actions";
import { trackEvent } from "@/lib/analytics";
import {
  calculateAvailableComboStock,
  calculateComboBaseCost,
  calculateComboItemCost,
  calculateComboPriceSuggestion,
  calculateComboProfit,
  comboMoneyFormatter,
  emptyComboForm,
  quantityInInventoryUnit,
  validateComboInput,
  type ComboCatalogVariant,
  type ComboFieldErrors,
  type ComboFormInput,
  type ComboFormItemInput,
} from "@/lib/combos";
import {
  areUnitsCompatible,
  getUnitLabel,
  getUnitSymbol,
  unitsForFamily,
  type MeasurementFamily,
  type MeasurementUnit,
} from "@/lib/measurements";
import { sanitizeNumericInput, toSafeNumber } from "@/lib/products/product-utils";
import { ActionHelp } from "@/components/ui/action-help";
import { FieldLabel } from "@/components/ui/field-label";
import { comboHelp } from "@/lib/help-content";
import type { HelpContent } from "@/lib/help-content";

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

function Field({
  children,
  error,
  help,
  label,
}: {
  children: ReactNode;
  error?: string;
  help?: HelpContent;
  label: string;
}) {
  return (
    <label className="block">
      <FieldLabel help={help} label={label} />
      {children}
      {error && <span className="mt-1 block text-xs font-bold text-[#DC2626]">{error}</span>}
    </label>
  );
}

function NumberField({
  error,
  help,
  label,
  onChange,
  value,
}: {
  error?: string;
  help?: HelpContent;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Field error={error} help={help} label={label}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(sanitizeNumericInput(event.target.value))}
        className={`${inputClass} ${error ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FECACA]/70" : ""}`}
      />
    </Field>
  );
}

function variantLabel(variant: ComboCatalogVariant) {
  return `${variant.product_name} · ${variant.name || "Presentación estándar"}`;
}

function defaultQuantityUnit(variant: ComboCatalogVariant): MeasurementUnit {
  return (variant.inventory_mode === "measured"
    ? variant.default_sale_unit || variant.inventory_unit || "kg"
    : "unit") as MeasurementUnit;
}

function buildItem(variant: ComboCatalogVariant, position: number): ComboFormItemInput {
  const quantityUnit = defaultQuantityUnit(variant);
  const quantity = "1";

  return {
    position,
    productId: variant.product_id || "",
    quantity,
    quantityInInventoryUnit: String(
      quantityInInventoryUnit({ quantity, quantityUnit, variant }),
    ),
    quantityUnit,
    status: "active",
    variantId: variant.id,
  };
}

export function ComboForm({
  appearance = "default",
  currency = "COP",
  initialCombo,
  mode,
  variants,
}: {
  appearance?: "default" | "premium";
  currency?: string;
  initialCombo?: ComboFormInput & { id: string };
  mode: "create" | "edit";
  variants: ComboCatalogVariant[];
}) {
  const isPremium = appearance === "premium";
  const [combo, setCombo] = useState<ComboFormInput>(initialCombo || emptyComboForm());
  const [currentStep, setCurrentStep] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ComboFieldErrors>({});
  const [isPending, startTransition] = useTransition();
  const formatter = useMemo(() => comboMoneyFormatter(currency), [currency]);
  const selectedVariants = combo.items
    .map((item) => variants.find((variant) => variant.id === item.variantId))
    .filter((variant): variant is ComboCatalogVariant => Boolean(variant));
  const baseCost = calculateComboBaseCost(combo.items, variants);
  const packagingCost = toSafeNumber(combo.packagingCost);
  const commissionPercent = toSafeNumber(combo.commissionPercent);
  const desiredMarginPercent = toSafeNumber(combo.desiredMarginPercent);
  const taxPercent = toSafeNumber(combo.taxPercent);
  const salePrice = toSafeNumber(combo.salePrice);
  const suggestion = calculateComboPriceSuggestion({
    baseCost,
    commissionPercent,
    desiredMarginPercent,
    packagingCost,
    taxPercent,
  });
  const profit = calculateComboProfit({
    baseCost,
    commissionPercent,
    packagingCost,
    salePrice,
    taxPercent,
  });
  const availableStock = calculateAvailableComboStock(combo.items, variants);
  const filteredVariants = variants.filter((variant) => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return true;
    }

    return (
      variant.product_name.toLowerCase().includes(normalized) ||
      String(variant.name || "").toLowerCase().includes(normalized) ||
      String(variant.sku || "").toLowerCase().includes(normalized)
    );
  });
  const hasMeasuredItems = selectedVariants.some(
    (variant) => variant.inventory_mode === "measured",
  );

  function updateCombo<K extends keyof ComboFormInput>(key: K, value: ComboFormInput[K]) {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
    setCombo((current) => ({ ...current, [key]: value }));
  }

  function addVariant(variant: ComboCatalogVariant) {
    if (combo.items.some((item) => item.variantId === variant.id && item.status === "active")) {
      return;
    }

    setCombo((current) => ({
      ...current,
      items: [...current.items, buildItem(variant, current.items.length)],
    }));
    setError("");
    trackEvent("combo_product_added", {
      has_measured_items: variant.inventory_mode === "measured",
      item_count: combo.items.length + 1,
      source: "combo_form",
    });
  }

  function removeItem(index: number) {
    setCombo((current) => ({
      ...current,
      items: current.items.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function updateItem(index: number, patch: Partial<ComboFormItemInput>) {
    setCombo((current) => ({
      ...current,
      items: current.items.map((item, currentIndex) => {
        if (currentIndex !== index) {
          return item;
        }

        const next = { ...item, ...patch };
        const variant = variants.find((currentVariant) => currentVariant.id === next.variantId);

        return variant
          ? {
              ...next,
              quantityInInventoryUnit: String(
                quantityInInventoryUnit({
                  quantity: next.quantity,
                  quantityUnit: next.quantityUnit,
                  variant,
                }),
              ),
            }
          : next;
      }),
    }));
  }

  function validateStep() {
    if (currentStep === 1) {
      if (!combo.name.trim()) {
        const message = "Escribe el nombre del combo.";
        setError(message);
        setFieldErrors({ name: message });
        return false;
      }

      return true;
    }

    if (currentStep === 2 && !combo.items.length) {
      setError("Agrega al menos un producto al combo.");
      setFieldErrors({ items: "Agrega al menos un producto al combo." });
      return false;
    }

    if (currentStep === 2) {
      const validation = validateComboInput({ ...combo, salePrice: combo.salePrice || "1" }, variants);

      if (!validation.ok) {
        const itemErrors = Object.fromEntries(
          Object.entries(validation.fieldErrors).filter(([key]) => key.startsWith("items.")),
        );

        if (Object.keys(itemErrors).length) {
          setError(Object.values(itemErrors)[0] || "Revisa los productos del combo.");
          setFieldErrors(itemErrors);
          return false;
        }
      }
    }

    return true;
  }

  function nextStep() {
    if (!validateStep()) {
      return;
    }

    setError("");
    setFieldErrors({});
    setCurrentStep((step) => Math.min(step + 1, 3));
  }

  function previousStep() {
    setCurrentStep((step) => Math.max(step - 1, 1));
  }

  function useSuggestedPrice() {
    if (suggestion.error) {
      setError(suggestion.error);
      return;
    }

    updateCombo("salePrice", String(Math.ceil(suggestion.suggestedPrice)));
    trackEvent("combo_price_suggestion_used", {
      has_measured_items: hasMeasuredItems,
      item_count: combo.items.length,
      source: "combo_form",
    });
  }

  function submit() {
    setError("");
    setFieldErrors({});
    const validation = validateComboInput(combo, variants);

    if (!validation.ok) {
      setError(validation.error);
      setFieldErrors(validation.fieldErrors);
      return;
    }

    startTransition(async () => {
      trackEvent(mode === "create" ? "combo_created" : "combo_updated", {
        has_measured_items: hasMeasuredItems,
        item_count: validation.value.items.length,
        source: "combo_form",
      });

      const result =
        mode === "create"
          ? await createCombo(combo)
          : await updateComboAction(initialCombo?.id || "", combo);

      if (result && !result.ok) {
        setError(result.error || "No pudimos guardar el combo. Intenta nuevamente.");
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      }
    });
  }

  function archive() {
    if (!initialCombo || !confirm("¿Archivar este combo?")) {
      return;
    }

    startTransition(async () => {
      trackEvent("combo_archived", { source: "combo_form" });
      const result = await archiveCombo(initialCombo.id);

      if (result && !result.ok) {
        setError(result.error || "No pudimos archivar el combo. Intenta nuevamente.");
      }
    });
  }

  function restore() {
    if (!initialCombo) {
      return;
    }

    startTransition(async () => {
      trackEvent("combo_restored", { source: "combo_form" });
      const result = await restoreCombo(initialCombo.id);

      if (result && !result.ok) {
        setError(result.error || "No pudimos restaurar el combo. Intenta nuevamente.");
      }
    });
  }

  const statusLabel =
    profit.profit <= 0
      ? "Pérdida"
      : profit.marginPercent < desiredMarginPercent
        ? "Margen ajustado"
        : "Rentable";

  return (
    <div className={`grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] ${isPremium ? "combo-form-premium" : ""}`}>
      <div className="space-y-6">
        <section className="combo-form-section combo-wizard-card rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Paso {currentStep} de 3
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#0F172A]">
            {currentStep === 1
              ? "Información básica"
              : currentStep === 2
                ? "Productos del combo"
                : "Precio y revisión"}
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(step)}
                className={`h-2 rounded-full ${currentStep >= step ? "bg-[#2563EB]" : "bg-[#E2E8F0]"}`}
                aria-label={`Ir al paso ${step}`}
              />
            ))}
          </div>
        </section>

        <section
          className={`combo-form-section rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 ${
            currentStep === 1 ? "block" : "hidden"
          }`}
        >
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Combo
          </p>
          <div className="mt-5 grid gap-4">
            <Field error={fieldErrors.name} help={comboHelp.name} label="Nombre del combo">
              <input
                value={combo.name}
                onChange={(event) => updateCombo("name", event.target.value)}
                maxLength={120}
                placeholder="Kit glow, Pack ahorro, Combo mensual..."
                className={inputClass}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoría opcional">
                <input
                  value={combo.category}
                  onChange={(event) => updateCombo("category", event.target.value)}
                  maxLength={100}
                  className={inputClass}
                />
              </Field>
              <Field label="Descripción opcional">
                <textarea
                  value={combo.description}
                  onChange={(event) => updateCombo("description", event.target.value)}
                  maxLength={1000}
                  rows={3}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </section>

        <section
          className={`combo-form-section rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 ${
            currentStep === 2 ? "block" : "hidden"
          }`}
        >
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Productos
            <ActionHelp help={comboHelp.products} />
          </p>
          <h3 className="mt-2 text-2xl font-black text-[#0F172A]">
            Agrega productos del catálogo
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#475569]">
            Agrega los productos que harán parte del combo. Margenia calculará el costo
            y te sugerirá un precio rentable.
          </p>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto, variante o SKU"
            className={inputClass}
          />

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {filteredVariants.slice(0, 8).map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => addVariant(variant)}
                className="combo-catalog-option rounded-[1.25rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-left transition hover:border-[#BFDBFE] hover:bg-white"
              >
                <span className="block font-black text-[#0F172A]">
                  {variantLabel(variant)}
                </span>
                <span className="mt-1 block text-xs font-bold text-[#475569]">
                  Costo: {formatter.format(toSafeNumber(variant.purchase_cost))} · Stock:{" "}
                  {toSafeNumber(variant.current_stock)}{" "}
                  {getUnitSymbol(variant.inventory_unit || "unit")}
                </span>
                <span className="mt-3 inline-flex rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-black text-[#2563EB]">
                  Agregar al combo
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm font-black text-[#0F172A]">Productos agregados</p>
            {combo.items.length ? (
              combo.items.map((item, index) => {
                const variant = variants.find((current) => current.id === item.variantId);
                const compatibleUnits =
                  variant?.inventory_mode === "measured"
                    ? unitsForFamily((variant.measurement_family || "mass") as MeasurementFamily)
                    : [{ label: "Unidad", value: "unit" as MeasurementUnit }];
                const itemCost = variant ? calculateComboItemCost(item, variant) : 0;
                const itemStock =
                  variant && toSafeNumber(item.quantityInInventoryUnit) > 0
                    ? Math.floor(
                        toSafeNumber(variant.current_stock) /
                          toSafeNumber(item.quantityInInventoryUnit),
                      )
                    : 0;

                return (
                  <div
                    key={item.variantId}
                    className="combo-item-card rounded-[1.5rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-start">
                      <div>
                        <p className="font-black text-[#0F172A]">
                          {variant ? variantLabel(variant) : "Producto"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#475569]">
                          Este producto suma {formatter.format(itemCost)} al costo del combo.
                        </p>
                        {variant?.track_inventory !== false && itemStock <= 2 && (
                          <p className="mt-2 text-xs font-black text-[#92400E]">
                            Este producto limita la cantidad de combos que puedes vender.
                          </p>
                        )}
                      </div>
                      <NumberField
                        error={fieldErrors[`items.${index}.quantity`]}
                        help={comboHelp.quantity}
                        label="Cantidad"
                        value={item.quantity}
                        onChange={(value) => updateItem(index, { quantity: value })}
                      />
                      <Field help={comboHelp.quantity} label="Unidad">
                        <select
                          value={item.quantityUnit}
                          onChange={(event) => {
                            if (
                              variant &&
                              variant.inventory_mode === "measured" &&
                              !areUnitsCompatible(
                                event.target.value,
                                variant.inventory_unit || "unit",
                              )
                            ) {
                              setError("La unidad seleccionada no es compatible con este producto.");
                              return;
                            }

                            updateItem(index, {
                              quantityUnit: event.target.value as MeasurementUnit,
                            });
                          }}
                          className={inputClass}
                        >
                          {compatibleUnits.map((unit) => (
                            <option key={unit.value} value={unit.value}>
                              {getUnitLabel(unit.value)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded-full bg-white px-4 py-3 text-sm font-black text-[#92400E] ring-1 ring-[#FDE68A] lg:mt-7"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[#BFDBFE] bg-[#EFF6FF]/50 p-5 text-sm font-bold text-[#475569]">
                Agrega al menos un producto al combo.
              </div>
            )}
          </div>
        </section>

        <section
          className={`combo-form-section rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 ${
            currentStep === 3 ? "block" : "hidden"
          }`}
        >
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Rentabilidad
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <NumberField
              error={fieldErrors.packagingCost}
              help={comboHelp.baseCost}
              label="Costo de empaque del combo"
              value={combo.packagingCost}
              onChange={(value) => updateCombo("packagingCost", value)}
            />
            <NumberField
              error={fieldErrors.commissionPercent}
              label="Comisión %"
              value={combo.commissionPercent}
              onChange={(value) => updateCombo("commissionPercent", value)}
            />
            <NumberField
              error={fieldErrors.taxPercent}
              label="Impuesto %"
              value={combo.taxPercent}
              onChange={(value) => updateCombo("taxPercent", value)}
            />
            <NumberField
              error={fieldErrors.desiredMarginPercent}
              label="Margen deseado %"
              value={combo.desiredMarginPercent}
              onChange={(value) => updateCombo("desiredMarginPercent", value)}
            />
            <NumberField
              error={fieldErrors.salePrice}
              help={comboHelp.salePrice}
              label="Precio de venta del combo"
              value={combo.salePrice}
              onChange={(value) => updateCombo("salePrice", value)}
            />
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={useSuggestedPrice}
              disabled={Boolean(suggestion.error)}
              className="rounded-full bg-[#EFF6FF] px-5 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Usar precio sugerido
            </button>
            <ActionHelp help={comboHelp.suggestedPrice} />
          </div>
        </section>

        {error && (
          <div className="rounded-[1.5rem] border border-[#FECACA] bg-[#FEE2E2] p-4 text-sm font-bold text-[#991B1B]">
            {error}
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <section className="combo-summary-card sticky top-6 rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#0F172A]">Resumen del combo</p>
          <dl className="mt-4 grid gap-3 text-sm">
            {[
              ["Productos", String(combo.items.length)],
              ["Costo de productos", formatter.format(baseCost)],
              ["Costo con empaque", formatter.format(baseCost + packagingCost)],
              ["Precio sugerido", formatter.format(suggestion.suggestedPrice)],
              ["Precio elegido", formatter.format(salePrice)],
              ["Utilidad estimada", formatter.format(profit.profit)],
              ["Margen real", `${profit.marginPercent.toFixed(1)}%`],
              [
                "Stock posible",
                availableStock === null ? "Sin control" : `${availableStock} combos`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-[#475569]">{label}</dt>
                <dd className="text-right font-black text-[#0F172A]">{value}</dd>
              </div>
            ))}
          </dl>

          <p
            className={`mt-4 rounded-2xl p-3 text-center text-sm font-black ${
              statusLabel === "Rentable"
                ? "bg-[#DCFCE7] text-[#166534]"
                : statusLabel === "Margen ajustado"
                  ? "bg-[#FEF3C7] text-[#92400E]"
                  : "bg-[#FEE2E2] text-[#991B1B]"
            }`}
          >
            {statusLabel}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#475569]">
            Con el inventario actual puedes vender aproximadamente{" "}
            <strong>
              {availableStock === null ? "combos sin control de stock" : `${availableStock} combos`}
            </strong>
            .
          </p>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={currentStep < 3 ? nextStep : submit}
              disabled={isPending}
              className="rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-base font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {currentStep < 3
                ? "Continuar"
                : isPending
                  ? "Guardando..."
                  : mode === "create"
                    ? "Guardar combo"
                    : "Guardar cambios"}
            </button>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={previousStep}
                className="rounded-full bg-white px-6 py-4 text-base font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF]"
              >
                Volver
              </button>
            )}
            <Link
              href="/app/combos"
              className="rounded-full bg-white px-6 py-4 text-center text-base font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF]"
            >
              Cancelar
            </Link>
          </div>
        </section>

        {mode === "edit" && initialCombo && (
          <section className="combo-form-section rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <p className="font-black text-[#0F172A]">Estado del combo</p>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              Archivar conserva el historial y oculta el combo del catálogo activo.
            </p>
            {initialCombo.status === "active" ? (
              <button
                type="button"
                onClick={archive}
                disabled={isPending}
                className="mt-4 w-full rounded-full bg-[#FEF3C7] px-5 py-3 text-sm font-black text-[#92400E] transition hover:bg-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Archivando..." : "Archivar combo"}
              </button>
            ) : (
              <button
                type="button"
                onClick={restore}
                disabled={isPending}
                className="mt-4 w-full rounded-full bg-[#DCFCE7] px-5 py-3 text-sm font-black text-[#166534] transition hover:bg-[#BBF7D0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Restaurando..." : "Restaurar combo"}
              </button>
            )}
          </section>
        )}
      </aside>
    </div>
  );
}
