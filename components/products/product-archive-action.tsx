"use client";

import { useState, useTransition } from "react";
import {
  archiveProduct,
  restoreProduct,
} from "@/app/(dashboard)/app/productos/actions";
import { trackEvent } from "@/lib/analytics";

type ProductArchiveActionProps = {
  productId: string;
  status: "active" | "archived";
  totalStock: number;
  variant?: "inline" | "block";
};

export function ProductArchiveAction({
  productId,
  status,
  totalStock,
  variant = "inline",
}: ProductArchiveActionProps) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const isBlock = variant === "block";

  function confirmArchive() {
    setError("");
    startTransition(async () => {
      trackEvent("product_archived", {
        product_status_before: "active",
        source: "product_list",
      });

      const result = await archiveProduct(productId);

      if (result && !result.ok) {
        setError(result.error || "No pudimos archivar el producto. Intenta nuevamente.");
      }
    });
  }

  function restore() {
    setError("");
    startTransition(async () => {
      const result = await restoreProduct(productId);

      if (result && !result.ok) {
        setError(result.error || "No pudimos restaurar el producto. Intenta nuevamente.");
      }
    });
  }

  if (status === "archived") {
    return (
      <div className={isBlock ? "mt-4" : ""}>
        <button
          type="button"
          onClick={restore}
          disabled={isPending}
          className={
            isBlock
              ? "block w-full rounded-full bg-[#DCFCE7] px-4 py-3 text-center text-sm font-black text-[#166534] transition hover:bg-[#BBF7D0] disabled:cursor-not-allowed disabled:opacity-60"
              : "rounded-full bg-[#DCFCE7] px-4 py-2 text-xs font-black text-[#166534] transition hover:bg-[#BBF7D0] disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {isPending ? "Restaurando..." : "Restaurar"}
        </button>
        {error && <p className="mt-2 text-xs font-bold text-[#DC2626]">{error}</p>}
      </div>
    );
  }

  return (
    <div className={isBlock ? "mt-4" : ""}>
      <button
        type="button"
        onClick={() => setArchiveDialogOpen(true)}
        disabled={isPending}
        className={
          isBlock
            ? "block w-full rounded-full bg-[#FEF3C7] px-4 py-3 text-center text-sm font-black text-[#92400E] transition hover:bg-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-60"
            : "rounded-full bg-[#FEF3C7] px-4 py-2 text-xs font-black text-[#92400E] transition hover:bg-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isPending ? "Archivando..." : "Archivar"}
      </button>

      {error && <p className="mt-2 text-xs font-bold text-[#DC2626]">{error}</p>}

      {archiveDialogOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#0F172A]/35 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-product-title"
        >
          <div className="w-full max-w-md rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-2xl">
            <p
              id="archive-product-title"
              className="text-xl font-black text-[#0F172A]"
            >
              ¿Archivar este producto?
            </p>
            <p className="mt-3 text-sm font-bold leading-6 text-[#475569]">
              Este producto dejará de aparecer en tu catálogo activo, pero podrás
              restaurarlo desde Archivados.
            </p>
            {totalStock > 0 && (
              <p className="mt-3 rounded-2xl border border-[#FDE68A] bg-[#FEF3C7] p-3 text-sm font-bold leading-6 text-[#92400E]">
                Este producto todavía tiene existencias registradas. Al archivarlo,
                no se borrará el historial ni el stock.
              </p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setArchiveDialogOpen(false)}
                disabled={isPending}
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmArchive}
                disabled={isPending}
                className="rounded-full bg-[#FEF3C7] px-5 py-3 text-sm font-black text-[#92400E] transition hover:bg-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Archivando..." : "Sí, archivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
