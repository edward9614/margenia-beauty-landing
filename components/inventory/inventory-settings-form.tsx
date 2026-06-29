"use client";

import { useState, useTransition } from "react";
import { updateInventorySettings } from "@/app/(dashboard)/app/inventario/actions";
import { sanitizeNumericInput } from "@/lib/products/product-utils";

export function InventorySettingsForm({
  inventoryLocation = "",
  lowStockThreshold = "",
  variantId,
}: {
  inventoryLocation?: string;
  lowStockThreshold?: string;
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
    <div className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-[#0F172A]">Configuración</h2>
      <label className="mt-5 block">
        <span className="text-sm font-black text-[#0F172A]">Stock bajo</span>
        <input
          inputMode="decimal"
          value={threshold}
          onChange={(event) => setThreshold(sanitizeNumericInput(event.target.value))}
          className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
        />
      </label>
      <label className="mt-4 block">
        <span className="text-sm font-black text-[#0F172A]">Ubicación</span>
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
        />
      </label>
      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="mt-5 w-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        {isPending ? "Guardando..." : "Guardar configuración"}
      </button>
      {message && <p className="mt-3 text-sm font-bold text-[#475569]">{message}</p>}
    </div>
  );
}
