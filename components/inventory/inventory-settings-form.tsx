"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateInventorySettings } from "@/app/(dashboard)/app/inventario/actions";
import { sanitizeNumericInput } from "@/lib/products/product-utils";

export function InventorySettingsForm({
  inventoryLocation = "",
  lowStockThreshold = "",
  unitLabel = "unidades",
  variantId,
}: {
  inventoryLocation?: string;
  lowStockThreshold?: string;
  unitLabel?: string;
  variantId: string;
}) {
  const [threshold, setThreshold] = useState(lowStockThreshold);
  const [location, setLocation] = useState(inventoryLocation);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      setMessage("");
      const result = await updateInventorySettings({
        inventoryLocation: location,
        lowStockThreshold: threshold,
        variantId,
      });

      setMessage(result.ok ? "Configuración guardada." : result.error || "No pudimos guardar.");
    });
  }

  return (
    <div id="alerta-stock" className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-[#0F172A]">Configurar alerta de stock bajo</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-[#475569]">
        Margenia te mostrará una alerta cuando este producto llegue a esta cantidad o menos.
      </p>
      <label className="mt-5 block">
        <span className="text-sm font-black text-[#0F172A]">Alerta de stock bajo desde</span>
        <div className="mt-2 flex overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-[#BFDBFE]/60">
          <input
            inputMode="decimal"
            value={threshold}
            onChange={(event) => setThreshold(sanitizeNumericInput(event.target.value))}
            className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
          />
          <span className="grid min-w-20 place-items-center border-l border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm font-black text-[#475569]">
            {unitLabel}
          </span>
        </div>
        <p className="mt-2 text-xs font-bold text-[#64748B]">
          Escribe 0 para desactivar la alerta y mostrar “Alerta sin configurar”.
        </p>
      </label>
      <label className="mt-4 block">
        <span className="text-sm font-black text-[#0F172A]">Ubicación, opcional</span>
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
        />
      </label>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar alerta"}
        </button>
        <Link
          href="/app/inventario"
          className="rounded-full border border-[#BFDBFE] bg-white px-5 py-3 text-center text-sm font-black text-[#2563EB]"
        >
          Cancelar
        </Link>
      </div>
      {message && <p className="mt-3 text-sm font-bold text-[#475569]">{message}</p>}
    </div>
  );
}
