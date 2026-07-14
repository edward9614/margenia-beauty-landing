"use client";

import { useState, useTransition } from "react";
import { addCustomerNote } from "@/app/(dashboard)/app/clientes/actions";
import { dashboardFieldClass, dashboardPrimaryActionClass } from "@/components/ui/dashboard-primitives";

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
      <label className="text-sm font-black text-slate-300">
        Nueva nota interna
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          placeholder="Ej. Prefiere entregas los viernes y contacto por WhatsApp."
          className={`${dashboardFieldClass} mt-2 min-h-28 resize-y`}
        />
      </label>
      {error && <p className="mt-2 text-sm font-bold text-rose-300">{error}</p>}
      {message && <p className="mt-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-bold text-emerald-200">{message}</p>}
      <button disabled={isPending || !note.trim()} className={`${dashboardPrimaryActionClass} mt-3 disabled:cursor-not-allowed disabled:opacity-50`}>
        {isPending ? "Guardando..." : "Registrar nota"}
      </button>
    </form>
  );
}
