"use client";

import { useMemo, useRef, useState } from "react";
import {
  calculateMinimumPrice,
  calculateSuggestedPrice,
  currencyFormatter,
  formatCOPInput,
  toNumber,
} from "@/components/calculator-utils";
import { primaryButtonClass, secondaryButtonClass } from "@/components/button-classes";
import { TrackedLink } from "@/components/tracked-link";
import { trackEvent } from "@/lib/analytics";

type SaleType = "product" | "combo";
type ResultStatus = "profitable" | "tight" | "loss" | "invalid";
type ComboProduct = {
  id: number;
  name: string;
  unitCost: string;
  quantity: string;
};

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base font-bold text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

const labelClass = "text-sm font-black text-[#0F172A]";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        inputMode="numeric"
        value={formatCOPInput(value)}
        onChange={(event) => onChange(String(toNumber(event.target.value)))}
        className={inputClass}
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        min="0"
        max="99"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]`}
      />
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function Toggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#BFDBFE]"
      aria-pressed={enabled}
    >
      <span className="text-sm font-black text-[#0F172A]">{label}</span>
      <span
        className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
          enabled ? "bg-[#2563EB]" : "bg-[#CBD5E1]"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#475569]">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-[#0F172A]">{value}</p>
    </div>
  );
}

export function InteractiveCalculator() {
  const [saleType, setSaleType] = useState<SaleType>("product");
  const [productCost, setProductCost] = useState("25000");
  const [comboProducts, setComboProducts] = useState<ComboProduct[]>([
    { id: 1, name: "Serum vitamina C", unitCost: "25000", quantity: "1" },
    { id: 2, name: "Rodillo facial", unitCost: "12000", quantity: "1" },
  ]);
  const [packagingCost, setPackagingCost] = useState("1500");
  const [shippingCost, setShippingCost] = useState("0");
  const [commissionPercent, setCommissionPercent] = useState("3");
  const [discount, setDiscount] = useState("0");
  const [desiredMargin, setDesiredMargin] = useState("35");
  const [includeShipping, setIncludeShipping] = useState(true);
  const [includeCommission, setIncludeCommission] = useState(true);
  const hasTrackedInteraction = useRef(false);

  const trackFirstInteraction = () => {
    if (!hasTrackedInteraction.current) {
      trackEvent("calculator_interaction", {
        location: "interactive_calculator",
        sale_type: saleType,
      });
      hasTrackedInteraction.current = true;
    }
  };

  const updateMoney = (setter: (value: string) => void, value: string) => {
    trackFirstInteraction();
    setter(value);
  };

  const updateComboProduct = (
    id: number,
    key: keyof Omit<ComboProduct, "id">,
    value: string,
  ) => {
    trackFirstInteraction();
    setComboProducts((current) =>
      current.map((product) =>
        product.id === id ? { ...product, [key]: value } : product,
      ),
    );
  };

  const addComboProduct = () => {
    trackFirstInteraction();
    trackEvent("calculator_combo_add_product", {
      location: "interactive_calculator",
      sale_type: "combo",
    });
    setComboProducts((current) => [
      ...current,
      {
        id: Date.now(),
        name: `Producto ${current.length + 1}`,
        unitCost: "0",
        quantity: "1",
      },
    ]);
  };

  const removeComboProduct = (id: number) => {
    trackFirstInteraction();
    setComboProducts((current) =>
      current.length > 1 ? current.filter((product) => product.id !== id) : current,
    );
  };

  const productsCost = useMemo(() => {
    if (saleType === "product") {
      return toNumber(productCost);
    }

    return comboProducts.reduce((total, product) => {
      const unitCost = toNumber(product.unitCost);
      const quantity = Math.max(toNumber(product.quantity), 1);
      return total + unitCost * quantity;
    }, 0);
  }, [comboProducts, productCost, saleType]);

  const result = useMemo(() => {
    const cleanPackagingCost = toNumber(packagingCost);
    const cleanShippingCost = includeShipping ? toNumber(shippingCost) : 0;
    const cleanCommissionPercent = includeCommission ? toNumber(commissionPercent) : 0;
    const cleanDiscount = toNumber(discount);
    const cleanDesiredMargin = clamp(toNumber(desiredMargin), 10, 70);
    const invalidRate = cleanCommissionPercent + cleanDesiredMargin >= 100;
    const baseCostWithoutDiscount =
      productsCost + cleanPackagingCost + cleanShippingCost;
    const baseCost = baseCostWithoutDiscount + cleanDiscount;

    if (invalidRate) {
      return {
        baseCost,
        commissionAmount: 0,
        desiredMargin: cleanDesiredMargin,
        invalidRate,
        minimumPrice: 0,
        realMargin: 0,
        suggestedPrice: 0,
        totalCost: baseCost,
        utility: 0,
      };
    }

    const suggestedPrice = calculateSuggestedPrice({
      baseCost,
      commissionPercent: cleanCommissionPercent,
      desiredMargin: cleanDesiredMargin,
    });
    const minimumPrice = calculateMinimumPrice({
      baseCost,
      commissionPercent: cleanCommissionPercent,
    });
    const commissionAmount = suggestedPrice * (cleanCommissionPercent / 100);
    const utility =
      suggestedPrice -
      productsCost -
      cleanPackagingCost -
      cleanShippingCost -
      commissionAmount -
      cleanDiscount;
    const realMargin = suggestedPrice > 0 ? (utility / suggestedPrice) * 100 : 0;
    const totalCost =
      productsCost +
      cleanPackagingCost +
      cleanShippingCost +
      commissionAmount +
      cleanDiscount;

    return {
      baseCost,
      commissionAmount,
      desiredMargin: cleanDesiredMargin,
      invalidRate,
      minimumPrice,
      realMargin,
      suggestedPrice,
      totalCost,
      utility,
    };
  }, [
    commissionPercent,
    desiredMargin,
    discount,
    includeCommission,
    includeShipping,
    packagingCost,
    productsCost,
    shippingCost,
  ]);

  const status: ResultStatus = result.invalidRate
    ? "invalid"
    : result.utility <= 0
      ? "loss"
      : result.realMargin >= result.desiredMargin - 3
        ? "profitable"
        : "tight";

  const statusConfig = {
    profitable: {
      label: "Rentable",
      className: "bg-[#DCFCE7] text-[#166534] ring-[#BBF7D0]",
      message: "Este precio cubre tus costos y deja una utilidad saludable.",
      bar: "bg-[#16A34A]",
    },
    tight: {
      label: "Ajustado",
      className: "bg-[#FEF3C7] text-[#92400E] ring-[#FDE68A]",
      message: "El precio cubre tus costos, pero tu margen queda más bajo de lo esperado.",
      bar: "bg-[#F59E0B]",
    },
    loss: {
      label: "Estás perdiendo dinero",
      className: "bg-[#FEE2E2] text-[#991B1B] ring-[#FECACA]",
      message: "Con estos valores podrías vender sin ganar. Revisa costos, descuento o precio final.",
      bar: "bg-[#EF4444]",
    },
    invalid: {
      label: "Revisa porcentajes",
      className: "bg-[#FEF3C7] text-[#92400E] ring-[#FDE68A]",
      message: "La comisión y el margen deseado deben sumar menos de 100%.",
      bar: "bg-[#F59E0B]",
    },
  }[status];

  const marginWidth = `${clamp(result.realMargin, 0, 70) / 0.7}%`;
  const saleLabel = saleType === "product" ? "producto" : "combo";

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-xl shadow-[#0F172A]/5">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <section className="border-b border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2563EB]">
                Configura tu venta
              </p>
              <h3 className="mt-2 text-2xl font-black text-[#0F172A]">
                Configura tu producto
              </h3>
            </div>
            <div className="grid grid-cols-2 rounded-full border border-[#E2E8F0] bg-white p-1 shadow-sm">
              {[
                { value: "product", label: "Producto individual" },
                { value: "combo", label: "Combo" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    trackFirstInteraction();
                    const nextSaleType = option.value as SaleType;
                    setSaleType(nextSaleType);

                    if (nextSaleType === "combo") {
                      trackEvent("calculator_mode_combo", {
                        location: "interactive_calculator",
                        sale_type: "combo",
                      });
                    }
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    saleType === option.value
                      ? "bg-[#0F172A] text-white shadow-sm"
                      : "text-[#475569] hover:text-[#2563EB]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7">
            {saleType === "combo" ? (
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-black text-[#0F172A]">
                      Productos del combo
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#475569]">
                      Agrega los productos que harán parte del combo para
                      calcular si realmente deja ganancia.
                    </p>
                  </div>
                  <div className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-black text-[#2563EB]">
                    Subtotal productos: {currencyFormatter.format(productsCost)}
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {comboProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm font-black text-[#0F172A]">
                          Producto {index + 1}
                        </strong>
                        {comboProducts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeComboProduct(product.id)}
                            className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#EF4444] ring-1 ring-[#FECACA] transition hover:bg-[#FEE2E2]"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr_0.65fr]">
                        <TextInput
                          label="Nombre del producto"
                          value={product.name}
                          onChange={(value) =>
                            updateComboProduct(product.id, "name", value)
                          }
                        />
                        <MoneyInput
                          label="Costo unitario"
                          value={product.unitCost}
                          onChange={(value) =>
                            updateComboProduct(product.id, "unitCost", value)
                          }
                        />
                        <NumberInput
                          label="Cantidad"
                          value={product.quantity}
                          onChange={(value) =>
                            updateComboProduct(product.id, "quantity", value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addComboProduct}
                  className="mt-4 w-full rounded-2xl border border-dashed border-[#BFDBFE] bg-[#F8FAFC] px-5 py-3 text-sm font-black text-[#2563EB] transition hover:border-[#2563EB] hover:bg-[#EFF6FF]"
                >
                  + Agregar producto
                </button>
              </div>
            ) : (
              <MoneyInput
                label="Costo del producto"
                value={productCost}
                onChange={(value) => updateMoney(setProductCost, value)}
              />
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MoneyInput
              label={
                saleType === "combo" ? "Costo de empaque del combo" : "Costo de empaque"
              }
              value={packagingCost}
              onChange={(value) => updateMoney(setPackagingCost, value)}
            />
            <MoneyInput
              label="Envío asumido"
              value={shippingCost}
              onChange={(value) => updateMoney(setShippingCost, value)}
            />
            <NumberInput
              label="Comisión de pago %"
              value={commissionPercent}
              disabled={!includeCommission}
              onChange={(value) => {
                trackFirstInteraction();
                setCommissionPercent(value);
              }}
            />
            <MoneyInput
              label="Descuento aplicado"
              value={discount}
              onChange={(value) => updateMoney(setDiscount, value)}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={labelClass}>Margen deseado</p>
                <p className="mt-1 text-sm text-[#475569]">
                  Ajusta la utilidad que quieres dejar en cada venta.
                </p>
              </div>
              <strong className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm text-[#2563EB]">
                {result.desiredMargin}%
              </strong>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={result.desiredMargin}
              onChange={(event) => {
                trackFirstInteraction();
                setDesiredMargin(event.target.value);
                trackEvent("calculator_margin_change", {
                  location: "interactive_calculator",
                  margin: Number(event.target.value),
                  sale_type: saleType,
                });
              }}
              className="mt-5 h-2 w-full cursor-pointer accent-[#2563EB]"
            />
            <p className="mt-3 text-sm font-bold text-[#475569]">
              Margen deseado: {result.desiredMargin}%
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Toggle
              label="Incluir envío"
              enabled={includeShipping}
              onChange={(enabled) => {
                trackFirstInteraction();
                setIncludeShipping(enabled);
              }}
            />
            <Toggle
              label="Incluir comisión"
              enabled={includeCommission}
              onChange={(enabled) => {
                trackFirstInteraction();
                setIncludeCommission(enabled);
              }}
            />
          </div>
        </section>

        <section className="bg-white p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2563EB]">
                Resultado en tiempo real
              </p>
              <h3 className="mt-2 text-2xl font-black text-[#0F172A]">
                Precio para tu {saleLabel}
              </h3>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-black ring-1 ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
          </div>

          <div className="mt-7 rounded-[1.75rem] bg-[linear-gradient(135deg,#0F172A_0%,#1E3A8A_100%)] p-5 text-white shadow-lg shadow-[#0F172A]/15">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#BFDBFE]">
              {saleType === "combo" ? "Precio sugerido del combo" : "Precio sugerido"}
            </p>
            <p className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              {result.invalidRate
                ? "No válido"
                : currencyFormatter.format(result.suggestedPrice)}
            </p>
            <p className="mt-4 text-sm leading-6 text-[#CBD5E1]">
              {statusConfig.message}
            </p>
          </div>

          {result.invalidRate && (
            <div className="mt-4 rounded-2xl border border-[#F59E0B] bg-[#FFFBEB] p-4 text-sm font-black text-[#92400E]">
              La comisión y el margen deseado deben sumar menos de 100%.
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniMetric
              label="Precio mínimo para no perder"
              value={currencyFormatter.format(result.minimumPrice)}
            />
            <MiniMetric
              label={
                saleType === "combo"
                  ? "Ganancia estimada del combo"
                  : "Ganancia estimada"
              }
              value={currencyFormatter.format(result.utility)}
            />
            <MiniMetric
              label="Margen real"
              value={`${Math.max(result.realMargin, 0).toFixed(1)}%`}
            />
            <MiniMetric
              label={saleType === "combo" ? "Costo total del combo" : "Costo total"}
              value={currencyFormatter.format(result.totalCost)}
            />
            <MiniMetric
              label="Comisión estimada"
              value={currencyFormatter.format(result.commissionAmount)}
            />
          </div>

          <div className="mt-5 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-black text-[#0F172A]">Margen estimado</p>
              <p className="text-sm font-black text-[#475569]">
                {Math.max(result.realMargin, 0).toFixed(1)}%
              </p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${statusConfig.bar}`}
                style={{ width: marginWidth }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs font-bold text-[#64748B]">
              <span>0%</span>
              <span>70%</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <TrackedLink
              href="#beta"
              events={[
                {
                  name: "click_beta",
                  params: {
                    location: "interactive_calculator",
                    cta_text: "Quiero acceder a la beta",
                  },
                },
              ]}
              className={primaryButtonClass}
            >
              Quiero acceder a la beta
            </TrackedLink>
            <TrackedLink
              href="#lista-espera"
              events={[
                {
                  name: "click_calculator_lead",
                  params: {
                    location: "interactive_calculator",
                    cta_text: "Guardar mis datos",
                  },
                },
              ]}
              className={secondaryButtonClass}
            >
              Guardar mis datos
            </TrackedLink>
          </div>
        </section>
      </div>
    </div>
  );
}
