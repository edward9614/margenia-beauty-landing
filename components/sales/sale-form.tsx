"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createSale } from "@/app/(dashboard)/app/ventas/actions";
import { trackEvent } from "@/lib/analytics";
import {
  calculateSaleLineCombo,
  calculateSaleLineProduct,
  calculateSaleTotals,
  emptySaleForm,
  getComboStockPossible,
  saleChannels,
  salePaymentMethods,
  saleUnitLabel,
  validateSaleCart,
  type SaleCartItem,
  type SaleCatalogCombo,
  type SaleCatalogProduct,
  type SaleFieldErrors,
  type SaleFormInput,
  type SalePaymentStatus,
} from "@/lib/sales";
import { getMeasurementFamily, unitsForFamily, type MeasurementFamily, type MeasurementUnit } from "@/lib/measurements";
import { moneyFormatter, sanitizeNumericInput, toSafeNumber } from "@/lib/products/product-utils";
import { ActionHelp } from "@/components/ui/action-help";
import { FieldLabel } from "@/components/ui/field-label";
import { salesHelp } from "@/lib/help-content";
import type { HelpContent } from "@/lib/help-content";

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

const primaryButtonClass =
  "rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-3 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "rounded-full border border-[#BFDBFE] bg-white px-5 py-3 text-center text-sm font-black text-[#2563EB] transition hover:bg-[#EFF6FF]";

function productLabel(product: SaleCatalogProduct) {
  return `${product.product_name} · ${product.name || "Presentación estándar"}`;
}

function itemKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function defaultQuantityUnit(variant: SaleCatalogProduct): MeasurementUnit {
  return (variant.inventory_mode === "measured"
    ? variant.default_sale_unit || variant.inventory_unit || "kg"
    : "unit") as MeasurementUnit;
}

function compatibleUnits(variant: SaleCatalogProduct) {
  if (variant.inventory_mode !== "measured") {
    return [{ label: "Unidad", value: "unit" as MeasurementUnit }];
  }

  const family =
    getMeasurementFamily(variant.default_sale_unit || variant.inventory_unit || "kg") ||
    (variant.measurement_family as MeasurementFamily) ||
    "mass";

  return unitsForFamily(family);
}

function Field({
  children,
  error,
  help,
  label,
}: {
  children: React.ReactNode;
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
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(sanitizeNumericInput(event.target.value))}
        className={`${inputClass} ${error ? "border-[#EF4444] focus:border-[#EF4444]" : ""}`}
      />
    </Field>
  );
}

export function SaleForm({
  combos,
  currency = "COP",
  products,
}: {
  combos: SaleCatalogCombo[];
  currency?: string;
  products: SaleCatalogProduct[];
}) {
  const formatter = moneyFormatter(currency);
  const [form, setForm] = useState<SaleFormInput>(emptySaleForm());
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<"combos" | "products">("products");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SaleFieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (!query) return true;

      return `${product.product_name} ${product.name || ""} ${product.sku || ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [products, search]);

  const filteredCombos = useMemo(() => {
    const query = search.trim().toLowerCase();

    return combos.filter((combo) => {
      if (!query) return true;
      return combo.name.toLowerCase().includes(query);
    });
  }, [combos, search]);

  const totals = useMemo(
    () => calculateSaleTotals({ combos, form, products }),
    [combos, form, products],
  );

  function updateForm<K extends keyof SaleFormInput>(key: K, value: SaleFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function addProduct(product: SaleCatalogProduct) {
    const quantityUnit = defaultQuantityUnit(product);
    const item: SaleCartItem = {
      discountAmount: "0",
      id: itemKey("product"),
      itemType: "product",
      name: product.product_name,
      position: form.items.length,
      productId: product.product_id,
      quantity: "1",
      quantityUnit,
      sku: product.sku || "",
      taxPercent: "0",
      unitPrice: String(toSafeNumber(product.sale_price)),
      variantId: product.id,
      variantName: product.name || "",
    };

    updateForm("items", [...form.items, item]);
    trackEvent("sale_item_added", {
      has_measured_item: product.inventory_mode === "measured",
      item_count: form.items.length + 1,
      source: "sale_form",
    });
  }

  function addCombo(combo: SaleCatalogCombo) {
    const item: SaleCartItem = {
      comboId: combo.id,
      discountAmount: "0",
      id: itemKey("combo"),
      itemType: "combo",
      name: combo.name,
      position: form.items.length,
      quantity: "1",
      quantityUnit: "unit",
      taxPercent: "0",
      unitPrice: String(toSafeNumber(combo.sale_price)),
    };

    updateForm("items", [...form.items, item]);
    trackEvent("sale_combo_added", {
      has_combo: true,
      item_count: form.items.length + 1,
      source: "sale_form",
    });
  }

  function updateItem(index: number, patch: Partial<SaleCartItem>) {
    updateForm(
      "items",
      form.items.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(index: number) {
    updateForm(
      "items",
      form.items
        .filter((_, currentIndex) => currentIndex !== index)
        .map((item, currentIndex) => ({ ...item, position: currentIndex })),
    );
  }

  function stepIsValid() {
    if (currentStep === 1) {
      if (!form.items.length) {
        const message = "Agrega al menos un producto o combo.";
        setError(message);
        setFieldErrors({ items: message });
        return false;
      }

      const validation = validateSaleCart({ combos, form, products });
      const itemErrors = Object.fromEntries(
        Object.entries(validation.fieldErrors).filter(([key]) => key.startsWith("items.")),
      );

      if (Object.keys(itemErrors).length) {
        setError(Object.values(itemErrors)[0] || "Revisa los productos de la venta.");
        setFieldErrors(itemErrors);
        return false;
      }
    }

    if (currentStep === 2) {
      const validation = validateSaleCart({ combos, form, products });
      const paymentErrors = Object.fromEntries(
        Object.entries(validation.fieldErrors).filter(([key]) =>
          ["customerName", "paidAmount", "paymentMethod"].includes(key),
        ),
      );

      if (Object.keys(paymentErrors).length) {
        setError(Object.values(paymentErrors)[0] || "Revisa el pago de la venta.");
        setFieldErrors(paymentErrors);
        return false;
      }
    }

    setError("");
    setFieldErrors({});
    return true;
  }

  function submit() {
    const validation = validateSaleCart({ combos, form, products });

    if (!validation.ok) {
      setError(validation.error);
      setFieldErrors(validation.fieldErrors);
      return;
    }

    const payload: SaleFormInput = {
      ...form,
      paidAmount:
        form.paymentStatus === "paid"
          ? String(validation.totals.totalAmount)
          : form.paymentStatus === "pending"
            ? "0"
            : form.paidAmount,
    };

    startTransition(async () => {
      trackEvent("sale_created", {
        has_combo: form.items.some((item) => item.itemType === "combo"),
        has_measured_item: form.items.some((item) => {
          const variant = products.find((product) => product.id === item.variantId);
          return variant?.inventory_mode === "measured";
        }),
        item_count: form.items.length,
        payment_status: form.paymentStatus,
        source: "sale_form",
      });

      if (form.paymentStatus !== "paid") {
        trackEvent("sale_payment_pending_created", {
          payment_status: form.paymentStatus,
          source: "sale_form",
        });
      }

      const result = await createSale(payload);

      if (result && !result.ok) {
        setError(result.error || "No pudimos registrar la venta. Intenta nuevamente.");
        setFieldErrors(result.fieldErrors || {});
      }
    });
  }

  function goNext() {
    if (!stepIsValid()) return;
    setCurrentStep((step) => Math.min(step + 1, 3));
  }

  const cartHasItems = form.items.length > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
                Paso {currentStep} de 3
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-[#0F172A] sm:text-3xl">
                {currentStep === 1 && "¿Qué vendiste?"}
                {currentStep === 2 && "Cliente y pago"}
                {currentStep === 3 && "Revisar y registrar"}
              </h1>
            </div>
            <Link href="/app/ventas" className={secondaryButtonClass}>
              Volver
            </Link>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#991B1B]">
              {error}
            </div>
          )}
        </div>

        {currentStep === 1 && (
          <div className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex rounded-full border border-[#E2E8F0] bg-[#F8FAFC] p-1">
              {[
                ["products", "Productos"],
                ["combos", "Combos"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value as "combos" | "products")}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-black transition ${
                    activeTab === value
                      ? "bg-white text-[#2563EB] shadow-sm"
                      : "text-[#475569] hover:text-[#0F172A]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="mt-5 block">
              <FieldLabel help={salesHelp.searchItem} label="Buscar producto o combo" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busca por nombre, SKU, variante o combo"
                className={inputClass}
              />
            </label>

            <div className="mt-5 grid gap-3">
              {activeTab === "products" &&
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="rounded-[1.5rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-left transition hover:border-[#BFDBFE] hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#0F172A]">{productLabel(product)}</p>
                        <p className="mt-1 text-xs font-bold text-[#475569]">
                          SKU {product.sku || "sin SKU"} · Stock {toSafeNumber(product.current_stock)}{" "}
                          {saleUnitLabel(product.inventory_unit)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#0F172A]">
                          {formatter.format(toSafeNumber(product.sale_price))}
                        </p>
                        {product.inventory_mode === "measured" && (
                          <span className="mt-2 inline-flex rounded-full bg-[#E0F7FA] px-3 py-1 text-xs font-black text-[#0891B2]">
                            Por medida
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

              {activeTab === "combos" &&
                filteredCombos.map((combo) => {
                  const stockPossible = getComboStockPossible(combo);

                  return (
                    <button
                      key={combo.id}
                      type="button"
                      onClick={() => addCombo(combo)}
                      className="rounded-[1.5rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-left transition hover:border-[#BFDBFE] hover:bg-white"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-[#0F172A]">{combo.name}</p>
                          <p className="mt-1 text-xs font-bold text-[#475569]">
                            {(combo.combo_items || []).length} productos incluidos · Stock{" "}
                            {stockPossible === null ? "sin control" : stockPossible}
                          </p>
                        </div>
                        <p className="font-black text-[#0F172A]">
                          {formatter.format(toSafeNumber(combo.sale_price))}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="grid gap-5 rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 md:grid-cols-2">
            <Field error={fieldErrors.customerName} help={salesHelp.customer} label="Nombre del cliente">
              <input
                value={form.customerName}
                onChange={(event) => updateForm("customerName", event.target.value)}
                placeholder="Opcional si la venta queda pagada"
                className={inputClass}
              />
            </Field>
            <Field label="WhatsApp o teléfono">
              <input
                value={form.customerPhone}
                onChange={(event) => updateForm("customerPhone", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Canal de venta">
              <select
                value={form.channel}
                onChange={(event) => updateForm("channel", event.target.value as SaleFormInput["channel"])}
                className={inputClass}
              >
                {saleChannels.map((channel) => (
                  <option key={channel.value} value={channel.value}>
                    {channel.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field help={salesHelp.paymentStatus} label="Estado de pago">
              <select
                value={form.paymentStatus}
                onChange={(event) => {
                  const value = event.target.value as SalePaymentStatus;
                  updateForm("paymentStatus", value);
                  updateForm("paidAmount", value === "paid" ? String(totals.totalAmount) : "0");
                }}
                className={inputClass}
              >
                <option value="paid">Pagada</option>
                <option value="partial">Pago parcial</option>
                <option value="pending">Pendiente por cobrar</option>
              </select>
            </Field>
            {form.paymentStatus !== "pending" && (
              <Field error={fieldErrors.paymentMethod} help={salesHelp.paymentMethod} label="Método de pago">
                <select
                  value={form.paymentMethod}
                  onChange={(event) => updateForm("paymentMethod", event.target.value as SaleFormInput["paymentMethod"])}
                  className={inputClass}
                >
                  <option value="">Selecciona un método</option>
                  {salePaymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {form.paymentStatus === "partial" && (
              <NumberField
                error={fieldErrors.paidAmount}
                label="Monto pagado"
                value={form.paidAmount}
                onChange={(value) => updateForm("paidAmount", value)}
              />
            )}
            <Field label="Nota">
              <textarea
                value={form.customerNote}
                onChange={(event) => updateForm("customerNote", event.target.value)}
                className={`${inputClass} min-h-24`}
              />
            </Field>
            <p className="rounded-2xl bg-[#EFF6FF] p-4 text-sm font-bold text-[#1E40AF] md:col-span-2">
              Las ventas pendientes aparecerán luego en pagos por cobrar.
            </p>
          </div>
        )}

        {currentStep === 3 && (
          <div className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-[#0F172A]">Resumen de la venta</h2>
            <div className="mt-5 space-y-3">
              {form.items.map((item) => {
                const variant = products.find((product) => product.id === item.variantId);
                const combo = combos.find((current) => current.id === item.comboId);
                const line =
                  item.itemType === "combo"
                    ? calculateSaleLineCombo(item, combo)
                    : calculateSaleLineProduct(item, variant);

                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-2xl bg-[#F8FAFC] p-4"
                  >
                    <div>
                      <p className="font-black text-[#0F172A]">{item.name}</p>
                      <p className="text-sm font-bold text-[#475569]">
                        {item.quantity} {saleUnitLabel(item.quantityUnit)} ·{" "}
                        {formatter.format(toSafeNumber(item.unitPrice))}
                      </p>
                    </div>
                    <p className="font-black text-[#0F172A]">
                      {formatter.format(line.totalAmount)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-sm font-bold text-[#1E40AF]">
              Al registrar la venta, Margenia descontará el inventario.
            </p>
          </div>
        )}
      </section>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-[#0F172A]">Carrito</h2>
            <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-black text-[#2563EB]">
              {form.items.length} items
            </span>
          </div>

          {!cartHasItems ? (
            <p className="mt-5 rounded-2xl bg-[#F8FAFC] p-4 text-sm font-bold text-[#475569]">
              Agrega productos o combos para empezar.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {form.items.map((item, index) => {
                const variant = products.find((product) => product.id === item.variantId);
                const combo = combos.find((current) => current.id === item.comboId);
                const line =
                  item.itemType === "combo"
                    ? calculateSaleLineCombo(item, combo)
                    : calculateSaleLineProduct(item, variant);
                const units = variant ? compatibleUnits(variant) : [{ label: "Unidad", value: "unit" as MeasurementUnit }];

                return (
                  <div key={item.id} className="rounded-2xl border border-[#E2E8F0] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#0F172A]">{item.name}</p>
                        {item.variantName && (
                          <p className="text-xs font-bold text-[#64748B]">{item.variantName}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-xs font-black text-[#DC2626]"
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <NumberField
                error={fieldErrors[`items.${index}.quantity`]}
                        help={salesHelp.quantity}
                        label="Cantidad"
                        value={item.quantity}
                        onChange={(value) => updateItem(index, { quantity: value })}
                      />
                      <Field help={salesHelp.unit} label="Unidad">
                        <select
                          value={item.quantityUnit}
                          onChange={(event) =>
                            updateItem(index, { quantityUnit: event.target.value as MeasurementUnit })
                          }
                          disabled={item.itemType === "combo"}
                          className={inputClass}
                        >
                          {units.map((unit) => (
                            <option key={unit.value} value={unit.value}>
                              {unit.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <NumberField
                        error={fieldErrors[`items.${index}.unitPrice`]}
                        help={salesHelp.unitPrice}
                        label="Precio"
                        value={item.unitPrice}
                        onChange={(value) => updateItem(index, { unitPrice: value })}
                      />
                      <NumberField
                        help={salesHelp.discount}
                        label="Descuento"
                        value={item.discountAmount}
                        onChange={(value) => updateItem(index, { discountAmount: value })}
                      />
                    </div>

                    {line.stockError && (
                      <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-black text-[#991B1B]">
                        {line.stockError}
                      </p>
                    )}
                    <p className="mt-3 text-right text-sm font-black text-[#0F172A]">
                      Subtotal {formatter.format(line.totalAmount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 space-y-3 border-t border-[#E2E8F0] pt-5 text-sm">
            <div className="flex justify-between">
              <span className="font-bold text-[#475569]">Subtotal</span>
              <span className="font-black text-[#0F172A]">{formatter.format(totals.subtotalAmount)}</span>
            </div>
            <NumberField
              help={salesHelp.discount}
              label="Descuento general"
              value={form.discountAmount}
              onChange={(value) => updateForm("discountAmount", value)}
            />
            <NumberField
              label="Envío"
              value={form.shippingAmount}
              onChange={(value) => updateForm("shippingAmount", value)}
            />
            <div className="flex justify-between text-base">
              <span className="font-black text-[#0F172A]">Total</span>
              <span className="font-black text-[#0F172A]">{formatter.format(totals.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-[#475569]">Pendiente</span>
              <span className="font-black text-[#0F172A]">{formatter.format(totals.balanceDue)}</span>
            </div>
            <div className="rounded-2xl bg-[#F8FAFC] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2563EB]">
                Utilidad estimada
              </p>
              <p className="mt-1 text-2xl font-black text-[#0F172A]">
                {formatter.format(totals.grossProfit)}
              </p>
              <p className="text-xs font-bold text-[#64748B]">
                Margen {totals.grossMarginPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {currentStep < 3 ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={goNext} className={primaryButtonClass}>
                  {currentStep === 1 ? "Revisar venta" : "Continuar"}
                </button>
                {currentStep === 1 && <ActionHelp help={salesHelp.newSale} />}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={isPending}
                  className={primaryButtonClass}
                >
                  {isPending ? "Registrando..." : "Registrar venta"}
                </button>
                <ActionHelp help={salesHelp.newSale} />
              </div>
            )}
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((step) => Math.max(step - 1, 1))}
                className={secondaryButtonClass}
              >
                Volver y editar
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
