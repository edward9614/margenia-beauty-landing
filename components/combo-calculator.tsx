"use client";

import { useMemo, useState } from "react";
import { calculateMinimumPrice, calculateSuggestedPrice, toNumber } from "@/components/calculator-utils";
import { Field, MoneyField } from "@/components/field";
import { ResultRow } from "@/components/result-row";

type ComboItem = {
  name: string;
  unitCost: string;
  quantity: string;
};

const initialItems: ComboItem[] = [
  { name: "Producto 1", unitCost: "18000", quantity: "1" },
  { name: "Producto 2", unitCost: "12000", quantity: "1" },
];

export function ComboCalculator() {
  const [items, setItems] = useState(initialItems);
  const [extras, setExtras] = useState({
    packagingCost: "2500",
    shippingCost: "0",
    commissionPercent: "3",
    discount: "3000",
    desiredMargin: "35",
  });

  const result = useMemo(() => {
    const productsCost = items.reduce((total, item) => {
      const unitCost = toNumber(item.unitCost);
      const quantity = Math.max(toNumber(item.quantity), 1);
      return total + unitCost * quantity;
    }, 0);

    const packagingCost = toNumber(extras.packagingCost);
    const shippingCost = toNumber(extras.shippingCost);
    const commissionPercent = toNumber(extras.commissionPercent);
    const discount = toNumber(extras.discount);
    const desiredMargin = toNumber(extras.desiredMargin);
    const invalidRate = commissionPercent + desiredMargin >= 100;
    const baseCostWithoutDiscount = productsCost + packagingCost + shippingCost;
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
      productsCost -
      packagingCost -
      shippingCost -
      commissionAmount -
      discount;

    const realMargin = suggestedPrice > 0 ? (utility / suggestedPrice) * 100 : 0;

    const totalCost =
      productsCost +
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
  }, [items, extras]);

  const updateItem = (index: number, key: keyof ComboItem, value: string) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const addItem = () => {
    if (items.length < 5) {
      setItems((current) => [
        ...current,
        { name: `Producto ${current.length + 1}`, unitCost: "0", quantity: "1" },
      ]);
    }
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const alerts: string[] = [];

  if (result.invalidRate) {
    alerts.push("La comisión y el margen deseado deben sumar menos de 100%.");
  }

  if (result.utility <= 0 && !result.invalidRate) {
    alerts.push("Con este combo estarías perdiendo dinero.");
  }

  if (
    result.realMargin < result.desiredMargin &&
    result.suggestedPrice > 0 &&
    !result.invalidRate
  ) {
    alerts.push("Tu margen real está por debajo de lo que esperabas.");
  }

  return (
    <article className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#4F46E5]">
          Combos rentables
        </p>
        <h3 className="mt-2 text-2xl font-black">Calculadora de combo</h3>
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item, index) => (
          <div key={index} className="rounded-lg bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm text-[#0F172A]">Producto {index + 1}</strong>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="rounded-full px-3 py-1 text-sm font-bold text-[#4F46E5] ring-1 ring-[#E2E8F0]"
                >
                  Quitar
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_1fr_0.8fr]">
              <Field
                label="Nombre"
                value={item.name}
                onChange={(event) => updateItem(index, "name", event.target.value)}
              />
              <MoneyField
                label="Costo unitario"
                value={item.unitCost}
                onValueChange={(value) => updateItem(index, "unitCost", value)}
              />
              <Field
                label="Cantidad"
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) => updateItem(index, "quantity", event.target.value)}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          disabled={items.length >= 5}
          className="w-full rounded-full border border-[#C7D2FE] bg-white px-5 py-3 text-sm font-black text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Agregar producto
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <MoneyField
          label="Empaque del combo"
          value={extras.packagingCost}
          onValueChange={(value) =>
            setExtras((current) => ({ ...current, packagingCost: value }))
          }
        />
        <MoneyField
          label="Envío asumido"
          value={extras.shippingCost}
          onValueChange={(value) =>
            setExtras((current) => ({ ...current, shippingCost: value }))
          }
        />
        <Field
          label="Comisión de pago o pasarela %"
          type="number"
          min="0"
          max="99"
          value={extras.commissionPercent}
          onChange={(event) =>
            setExtras((current) => ({ ...current, commissionPercent: event.target.value }))
          }
        />
        <MoneyField
          label="Descuento del combo"
          value={extras.discount}
          onValueChange={(value) =>
            setExtras((current) => ({ ...current, discount: value }))
          }
        />
        <Field
          label="Margen deseado %"
          type="number"
          min="1"
          max="90"
          value={extras.desiredMargin}
          onChange={(event) =>
            setExtras((current) => ({ ...current, desiredMargin: event.target.value }))
          }
        />
      </div>

      <div className="mt-6 rounded-lg bg-white p-4">
        <ResultRow label="Costo total del combo" value={result.totalCost} />
        <ResultRow label="Precio mínimo rentable" value={result.minimumPrice} />
        <ResultRow label="Precio sugerido" value={result.suggestedPrice} />
        <ResultRow label="Utilidad estimada" value={result.utility} />
        <ResultRow label="Margen real" value={result.realMargin} percentage />
      </div>

      {alerts.length > 0 && (
        <div className="mt-4 rounded-lg border border-[#F59E0B] bg-[#FFFBEB] p-4 text-sm font-bold text-[#92400E]">
          {alerts.map((alert) => (
            <p key={alert}>{alert}</p>
          ))}
        </div>
      )}
    </article>
  );
}
