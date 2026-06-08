"use client";

import { useMemo, useState } from "react";
import { calculateMinimumPrice, calculateSuggestedPrice, toNumber } from "@/components/calculator-utils";
import { Field, MoneyField } from "@/components/field";
import { ResultRow } from "@/components/result-row";

export function PriceCalculator() {
  const [form, setForm] = useState({
    productName: "",
    productCost: "25000",
    packagingCost: "1500",
    shippingCost: "0",
    commissionPercent: "3",
    discount: "0",
    desiredMargin: "35",
  });

  const result = useMemo(() => {
    const productCost = toNumber(form.productCost);
    const packagingCost = toNumber(form.packagingCost);
    const shippingCost = toNumber(form.shippingCost);
    const commissionPercent = toNumber(form.commissionPercent);
    const discount = toNumber(form.discount);
    const desiredMargin = toNumber(form.desiredMargin);
    const invalidRate = commissionPercent + desiredMargin >= 100;
    const baseCostWithoutDiscount = productCost + packagingCost + shippingCost;
    const baseCost = baseCostWithoutDiscount + discount;

    if (invalidRate) {
      return {
        totalCost: baseCost,
        minimumPrice: 0,
        suggestedPrice: 0,
        utility: 0,
        realMargin: 0,
        desiredMargin,
        invalidRate: true,
      };
    }

    const minimumPrice = calculateMinimumPrice({ baseCost, commissionPercent });
    const suggestedPrice = calculateSuggestedPrice({
      baseCost,
      commissionPercent,
      desiredMargin,
    });
    const commissionAmount = suggestedPrice * (commissionPercent / 100);
    const utility =
      suggestedPrice -
      productCost -
      packagingCost -
      shippingCost -
      commissionAmount -
      discount;
    const realMargin = suggestedPrice > 0 ? (utility / suggestedPrice) * 100 : 0;
    const totalCost =
      productCost +
      packagingCost +
      shippingCost +
      commissionAmount +
      discount;

    return {
      totalCost,
      minimumPrice,
      suggestedPrice,
      utility,
      realMargin,
      desiredMargin,
      invalidRate: false,
    };
  }, [form]);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const alerts: string[] = [];

  if (result.invalidRate) {
    alerts.push("La comisión y el margen deseado deben sumar menos de 100%.");
  }

  if (result.utility <= 0 && !result.invalidRate) {
    alerts.push("Con este precio estarías perdiendo dinero.");
  }

  if (
    result.realMargin < result.desiredMargin &&
    result.suggestedPrice > 0 &&
    !result.invalidRate
  ) {
    alerts.push("Tu margen real está por debajo de lo que esperabas.");
  }

  return (
    <article className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#7c3aed]">
          Producto individual
        </p>
        <h3 className="mt-2 text-2xl font-black">Calculadora de precio</h3>
      </div>
      <div className="mt-6 grid gap-4">
        <Field
          label="Nombre del producto"
          placeholder="Ej: Serum vitamina C"
          value={form.productName}
          onChange={(event) => updateField("productName", event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField
            label="Costo del producto"
            value={form.productCost}
            onValueChange={(value) => updateField("productCost", value)}
          />
          <MoneyField
            label="Costo de empaque"
            value={form.packagingCost}
            onValueChange={(value) => updateField("packagingCost", value)}
          />
          <MoneyField
            label="Envío asumido"
            value={form.shippingCost}
            onValueChange={(value) => updateField("shippingCost", value)}
          />
          <Field
            label="Comisión de pago %"
            type="number"
            min="0"
            max="99"
            value={form.commissionPercent}
            onChange={(event) => updateField("commissionPercent", event.target.value)}
          />
          <MoneyField
            label="Descuento"
            value={form.discount}
            onValueChange={(value) => updateField("discount", value)}
          />
          <Field
            label="Margen deseado %"
            type="number"
            min="1"
            max="90"
            value={form.desiredMargin}
            onChange={(event) => updateField("desiredMargin", event.target.value)}
          />
        </div>
      </div>
      <div className="mt-6 rounded-lg bg-white p-4">
        <ResultRow label="Costo total" value={result.totalCost} />
        <ResultRow label="Precio mínimo rentable" value={result.minimumPrice} />
        <ResultRow label="Precio sugerido" value={result.suggestedPrice} />
        <ResultRow label="Utilidad estimada" value={result.utility} />
        <ResultRow label="Margen real" value={result.realMargin} percentage />
      </div>
      {alerts.length > 0 && (
        <div className="mt-4 rounded-lg border border-[#f4c0d3] bg-[#fff0f5] p-4 text-sm font-bold text-[#8b235d]">
          {alerts.map((alert) => (
            <p key={alert}>{alert}</p>
          ))}
        </div>
      )}
    </article>
  );
}
