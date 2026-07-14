"use client";

import { useMemo, useState, useTransition } from "react";
import { registerCustomerPayment } from "@/app/(dashboard)/app/clientes/actions";

type PendingSale = {
  balanceDue: number;
  label: string;
  saleId: string;
};

export function CustomerPaymentForm({
  currency,
  customerId,
  pendingSales,
}: {
  currency: string;
  customerId: string;
  pendingSales: PendingSale[];
}) {
  const [saleId, setSaleId] = useState(pendingSales[0]?.saleId || "");
  const selected = useMemo(() => pendingSales.find((sale) => sale.saleId === saleId), [pendingSales, saleId]);
  const [amount, setAmount] = useState(selected ? String(selected.balanceDue) : "");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const formatter = useMemo(() => new Intl.NumberFormat("es-CO", { currency, style: "currency", maximumFractionDigits: 0 }), [currency]);

  if (!pendingSales.length) return null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await registerCustomerPayment({ amount, customerId, notes, paidAt, paymentMethod, reference, saleId });
      if (!result.ok) {
        setError(result.error || "No pudimos registrar el abono.");
        return;
      }
      setMessage(result.message || "Abono registrado correctamente.");
      setReference("");
      setNotes("");
    });
  }

  return (
    <form id="registrar-abono" onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-black text-[#334155] dark:text-slate-200 sm:col-span-2">
        Venta pendiente
        <select
          value={saleId}
          onChange={(event) => {
            const nextId = event.target.value;
            const next = pendingSales.find((sale) => sale.saleId === nextId);
            setSaleId(nextId);
            setAmount(next ? String(next.balanceDue) : "");
          }}
          className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          {pendingSales.map((sale) => <option key={sale.saleId} value={sale.saleId}>{sale.label} · {formatter.format(sale.balanceDue)}</option>)}
        </select>
      </label>
      <label className="text-sm font-black text-[#334155] dark:text-slate-200">
        Valor del abono
        <input type="number" min="1" max={selected?.balanceDue} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
      </label>
      <label className="text-sm font-black text-[#334155] dark:text-slate-200">
        Método de pago
        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option><option value="nequi">Nequi</option><option value="daviplata">Daviplata</option><option value="other">Otro</option>
        </select>
      </label>
      <label className="text-sm font-black text-[#334155] dark:text-slate-200">Fecha<input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
      <label className="text-sm font-black text-[#334155] dark:text-slate-200">Referencia<input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
      <label className="text-sm font-black text-[#334155] dark:text-slate-200 sm:col-span-2">Observación<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 min-h-20 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
      {error && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-sm font-bold text-[#B91C1C] sm:col-span-2">{error}</p>}
      {message && <p className="rounded-xl bg-[#F0FDF4] px-3 py-2 text-sm font-bold text-[#166534] sm:col-span-2">{message}</p>}
      <button disabled={isPending} className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 disabled:opacity-60 sm:col-span-2">
        {isPending ? "Registrando..." : "Registrar abono"}
      </button>
    </form>
  );
}
