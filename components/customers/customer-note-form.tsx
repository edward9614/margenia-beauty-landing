"use client";

import { useState, useTransition } from "react";
import { addCustomerNote } from "@/app/(dashboard)/app/clientes/actions";

export function CustomerNoteForm({ customerId }: { customerId: string }) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await addCustomerNote(customerId, note);
      if (!result.ok) {
        setError(result.error || "No pudimos guardar la nota.");
        return;
      }
      setNote("");
      setMessage(result.message || "Nota agregada correctamente.");
    });
  }

  return (
    <form onSubmit={submit} className="mt-5">
      <label className="text-sm font-black text-[#334155] dark:text-slate-200">
        Nueva nota interna
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          placeholder="Ej. Prefiere entregas los viernes y contacto por WhatsApp."
          className="mt-2 min-h-28 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base font-bold text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </label>
      {error && <p className="mt-2 text-sm font-bold text-[#DC2626]">{error}</p>}
      {message && <p className="mt-2 rounded-xl bg-[#F0FDF4] px-3 py-2 text-sm font-bold text-[#166534]">{message}</p>}
      <button disabled={isPending || !note.trim()} className="mt-3 rounded-full bg-[#0F172A] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-50">
        {isPending ? "Guardando..." : "Registrar nota"}
      </button>
    </form>
  );
}
