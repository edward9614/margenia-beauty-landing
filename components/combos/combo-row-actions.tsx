"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { archiveCombo, restoreCombo } from "@/app/(dashboard)/app/combos/actions";
import { trackEvent } from "@/lib/analytics";

export function ComboRowActions({
  appearance = "light",
  comboId,
  editHref,
  status,
  variant = "inline",
}: {
  appearance?: "dark" | "light";
  comboId: string;
  editHref: string;
  status: "active" | "archived";
  variant?: "inline" | "block";
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const isBlock = variant === "block";
  const dark = appearance === "dark";

  function archive() {
    if (!confirm("¿Archivar este combo?")) {
      return;
    }

    setError("");
    startTransition(async () => {
      trackEvent("combo_archived", { source: "combo_list" });
      const result = await archiveCombo(comboId);

      if (result && !result.ok) {
        setError(result.error || "No pudimos archivar el combo. Intenta nuevamente.");
      }
    });
  }

  function restore() {
    setError("");
    startTransition(async () => {
      trackEvent("combo_restored", { source: "combo_list" });
      const result = await restoreCombo(comboId);

      if (result && !result.ok) {
        setError(result.error || "No pudimos restaurar el combo. Intenta nuevamente.");
      }
    });
  }

  return (
    <div className={isBlock ? "mt-4 grid gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2"}>
      <Link
        href={editHref}
        className={
          isBlock
            ? dark
              ? "block rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              : "block rounded-full bg-[#EFF6FF] px-4 py-3 text-center text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE]"
            : dark
              ? "rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              : "rounded-full bg-[#EFF6FF] px-4 py-2 text-xs font-black text-[#2563EB] ring-1 ring-[#BFDBFE]"
        }
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={status === "archived" ? restore : archive}
        disabled={isPending}
        className={
          status === "archived"
            ? isBlock
              ? dark
                ? "block rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-center text-sm font-black text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                : "block rounded-full bg-[#DCFCE7] px-4 py-3 text-center text-sm font-black text-[#166534] transition hover:bg-[#BBF7D0] disabled:cursor-not-allowed disabled:opacity-60"
              : dark
                ? "rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                : "rounded-full bg-[#DCFCE7] px-4 py-2 text-xs font-black text-[#166534] transition hover:bg-[#BBF7D0] disabled:cursor-not-allowed disabled:opacity-60"
            : isBlock
              ? dark
                ? "block rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-center text-sm font-black text-amber-100 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                : "block rounded-full bg-[#FEF3C7] px-4 py-3 text-center text-sm font-black text-[#92400E] transition hover:bg-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-60"
              : dark
                ? "rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                : "rounded-full bg-[#FEF3C7] px-4 py-2 text-xs font-black text-[#92400E] transition hover:bg-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isPending
          ? status === "archived"
            ? "Restaurando..."
            : "Archivando..."
          : status === "archived"
            ? "Restaurar"
            : "Archivar"}
      </button>
      {error && <p className={`text-xs font-bold sm:col-span-2 ${dark ? "text-rose-200" : "text-[#DC2626]"}`}>{error}</p>}
    </div>
  );
}
