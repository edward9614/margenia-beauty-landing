"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  archiveCustomer,
  restoreCustomer,
} from "@/app/(dashboard)/app/clientes/actions";

export function CustomerRowActions({
  appearance = "light",
  customerId,
  status,
  variant = "inline",
}: {
  appearance?: "dark" | "light";
  customerId: string;
  status: string;
  variant?: "block" | "inline";
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const isArchived = status === "archived";
  const isBlock = variant === "block";
  const dark = appearance === "dark";

  function runRestore() {
    setError("");
    startTransition(async () => {
      const result = await restoreCustomer(customerId);
      if (!result.ok) setError(result.error || "No pudimos restaurar el cliente.");
    });
  }

  function runArchive() {
    setError("");
    startTransition(async () => {
      const result = await archiveCustomer(customerId);
      if (!result.ok) {
        setError(result.error || "No pudimos archivar el cliente.");
        return;
      }
      setDialogOpen(false);
    });
  }

  return (
    <div className={isBlock ? "grid gap-2 sm:grid-cols-3" : "flex flex-wrap gap-2"}>
      <Link href={`/app/clientes/${customerId}`} className={`rounded-full px-4 py-2 text-center text-xs font-black ring-1 transition ${dark ? "bg-cyan-300/10 text-cyan-200 ring-cyan-300/20 hover:bg-cyan-300/20" : "bg-[#EFF6FF] text-[#2563EB] ring-[#BFDBFE] hover:bg-[#DBEAFE]"}`}>
        Ver
      </Link>
      <Link href={`/app/clientes/${customerId}/editar`} className={`rounded-full px-4 py-2 text-center text-xs font-black ring-1 transition ${dark ? "bg-white/[0.05] text-slate-300 ring-white/10 hover:bg-white/10 hover:text-white" : "bg-white text-[#475569] ring-[#CBD5E1] hover:bg-[#F8FAFC]"}`}>
        Editar
      </Link>
      <button
        type="button"
        disabled={isPending}
        onClick={isArchived ? runRestore : () => setDialogOpen(true)}
        className={`rounded-full px-4 py-2 text-xs font-black transition disabled:opacity-60 ${isArchived ? (dark ? "bg-emerald-300/10 text-emerald-200 hover:bg-emerald-300/20" : "bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]") : (dark ? "bg-amber-300/10 text-amber-200 hover:bg-amber-300/20" : "bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]")}`}
      >
        {isPending ? (isArchived ? "Restaurando..." : "Archivando...") : isArchived ? "Restaurar" : "Archivar"}
      </button>
      {error && <p className={`text-xs font-bold sm:col-span-3 ${dark ? "text-rose-300" : "text-[#DC2626]"}`}>{error}</p>}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F172A]/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="archive-customer-title">
          <div className="w-full max-w-md rounded-[2rem] border border-[#E2E8F0] bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <h2 id="archive-customer-title" className="text-2xl font-black text-[#0F172A] dark:text-white">¿Archivar este cliente?</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[#475569] dark:text-slate-300">
              Dejará de aparecer entre los clientes activos, pero conservará sus compras, notas y saldos. Podrás restaurarlo después.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setDialogOpen(false)} disabled={isPending} className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE]">Cancelar</button>
              <button type="button" onClick={runArchive} disabled={isPending} className="rounded-full bg-[#FEF3C7] px-5 py-3 text-sm font-black text-[#92400E] transition hover:bg-[#FDE68A] disabled:opacity-60">
                {isPending ? "Archivando..." : "Sí, archivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
