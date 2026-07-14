"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createCustomer,
  updateCustomer,
} from "@/app/(dashboard)/app/clientes/actions";
import { FieldHelpTooltip } from "@/components/ui/info-tooltip";
import {
  customerContactChannels,
  customerDocumentTypes,
  emptyCustomerForm,
  type CustomerFormInput,
} from "@/lib/customers";

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base font-bold text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

function Field({
  children,
  error,
  help,
  label,
  required,
}: {
  children: React.ReactNode;
  error?: string;
  help?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-black text-[#334155] dark:text-slate-200">
      <span className="inline-flex items-center gap-2">
        {label} {required && <span className="text-[#DC2626]">*</span>}
        {help && <FieldHelpTooltip content={help} title={label} />}
      </span>
      {children}
      {error && <span className="mt-2 block text-xs font-bold text-[#DC2626]">{error}</span>}
    </label>
  );
}

export function CustomerForm({
  customerId,
  initialValue,
}: {
  customerId?: string;
  initialValue?: CustomerFormInput;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CustomerFormInput>(initialValue || emptyCustomerForm());
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof CustomerFormInput>(key: K, value: CustomerFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      if (key === "phone" || key === "email") delete next.contact;
      return next;
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const result = customerId
        ? await updateCustomer(customerId, form)
        : await createCustomer(form);

      if (!result.ok || !result.customerId) {
        setError(result.error || "No pudimos guardar el cliente.");
        setFieldErrors(result.fieldErrors || {});
        return;
      }

      router.push(`/app/clientes/${result.customerId}?saved=${customerId ? "updated" : "created"}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div role="alert" className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#991B1B]">
          {error}
        </div>
      )}

      <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm transition dark:border-slate-800 dark:bg-slate-950 sm:p-7">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2563EB]">Datos básicos</p>
          <h2 className="mt-2 text-2xl font-black text-[#0F172A] dark:text-white">Identifica a tu cliente</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#64748B] dark:text-slate-400">
            El nombre y al menos un medio de contacto son suficientes para empezar.
          </p>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field error={fieldErrors.fullName} label="Nombre completo" required>
            <input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className={inputClass} placeholder="Ej. Laura Martínez" />
          </Field>
          <Field error={fieldErrors.phone || fieldErrors.contact} label="Teléfono o WhatsApp" help="Puedes incluir el indicativo del país.">
            <input inputMode="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} className={inputClass} placeholder="Ej. 300 123 4567" />
          </Field>
          <Field error={fieldErrors.email || fieldErrors.contact} label="Correo electrónico">
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className={inputClass} placeholder="cliente@correo.com" />
          </Field>
          <Field label="Fecha de nacimiento" help="Úsala solo si aporta a tu relación comercial.">
            <input type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} className={inputClass} />
          </Field>
          <Field error={fieldErrors.documentType} label="Tipo de documento">
            <select value={form.documentType} onChange={(event) => update("documentType", event.target.value)} className={inputClass}>
              <option value="">Sin documento</option>
              {customerDocumentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Número de documento">
            <input value={form.documentNumber} onChange={(event) => update("documentNumber", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Género" help="Este dato es opcional.">
            <select value={form.gender} onChange={(event) => update("gender", event.target.value)} className={inputClass}>
              <option value="">No especificado</option>
              <option value="female">Mujer</option>
              <option value="male">Hombre</option>
              <option value="non_binary">No binario</option>
              <option value="prefer_not_to_say">Prefiere no decirlo</option>
              <option value="other">Otro</option>
            </select>
          </Field>
          <Field label="Estado">
            <select value={form.status} onChange={(event) => update("status", event.target.value as CustomerFormInput["status"])} className={inputClass}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0891B2]">Ubicación y preferencias</p>
        <h2 className="mt-2 text-2xl font-black text-[#0F172A] dark:text-white">Personaliza la relación</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Ciudad">
            <input value={form.city} onChange={(event) => update("city", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Dirección">
            <input value={form.address} onChange={(event) => update("address", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Canal de contacto preferido">
            <select value={form.preferredContactChannel} onChange={(event) => update("preferredContactChannel", event.target.value)} className={inputClass}>
              {customerContactChannels.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Etiquetas" help="Separa las etiquetas con comas." >
            <input value={form.tags} onChange={(event) => update("tags", event.target.value)} className={inputClass} placeholder="VIP, Mayorista, Instagram" />
          </Field>
          <Field label="Observaciones importantes" help="Información breve que conviene ver al abrir la ficha.">
            <textarea value={form.notesSummary} onChange={(event) => update("notesSummary", event.target.value)} className={`${inputClass} min-h-28`} />
          </Field>
          <label className="flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm font-bold text-[#334155] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <input type="checkbox" checked={form.marketingOptIn} onChange={(event) => update("marketingOptIn", event.target.checked)} className="mt-1 h-5 w-5 accent-[#2563EB]" />
            <span>
              Permite recordatorios y promociones
              <span className="mt-1 block text-xs text-[#64748B]">Registra el consentimiento antes de enviar comunicaciones comerciales.</span>
            </span>
          </label>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={customerId ? `/app/clientes/${customerId}` : "/app/clientes"} className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF]">
          Cancelar
        </Link>
        <button disabled={isPending} className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-7 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "Guardando..." : customerId ? "Guardar cambios" : "Crear cliente"}
        </button>
      </div>
    </form>
  );
}
