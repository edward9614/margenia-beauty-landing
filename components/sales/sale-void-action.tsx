"use client";

import { useState, useTransition } from "react";
import { voidSale } from "@/app/(dashboard)/app/ventas/actions";
import { trackEvent } from "@/lib/analytics";

export function SaleVoidAction({
  appearance = "light",
  disabled,
  saleId,
}: {
  appearance?: "dark" | "light";
  disabled?: boolean;
  saleId: string;
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleVoid() {
    if (disabled) {
      return;
    }

    const confirmed = confirm(
      "¿Anular esta venta?\n\nMargenia restaurará las existencias descontadas y conservará el historial.",
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setError("");
      trackEvent("sale_voided", { source: "sale_detail" });
      const result = await voidSale(saleId, "Anulada por el usuario");

      if (result && !result.ok) {
        setError(result.error || "No pudimos anular la venta. Intenta nuevamente.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={handleVoid}
        className={`rounded-full border px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${appearance === "dark" ? "border-rose-300/25 bg-rose-300/10 text-rose-100 hover:bg-rose-300/15" : "border-[#FECACA] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]"}`}
      >
        {isPending ? "Anulando..." : "Anular venta"}
      </button>
      {error && <p className={`mt-2 text-sm font-bold ${appearance === "dark" ? "text-rose-200" : "text-[#B91C1C]"}`}>{error}</p>}
    </div>
  );
}
