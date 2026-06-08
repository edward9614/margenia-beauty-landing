"use client";

import { FormEvent, useEffect, useState } from "react";
import { primaryButtonClass } from "@/components/button-classes";
import { Field, InstagramField, SelectField } from "@/components/field";

const controlOptions = [
  "Cuaderno",
  "Excel",
  "Notas del celular",
  "Treinta",
  "Otra app",
  "No llevo control",
];

const betaOptions = ["Sí", "Tal vez", "No"];

const initialForm = {
  name: "",
  whatsapp: "",
  instagram: "",
  sells: "",
  controlMethod: "",
  wantsBeta: "",
  intent: "lista_espera",
};

export function WaitlistForm() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("intent") === "fundadora") {
      setForm((current) => ({
        ...current,
        wantsBeta: "Sí",
        intent: "fundadora",
      }));
    }
  }, []);

  const isFounderIntent = form.intent === "fundadora";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (
      !form.name.trim() ||
      !form.whatsapp.trim() ||
      !form.sells.trim() ||
      !form.controlMethod ||
      !form.wantsBeta
    ) {
      setMessage("Completa los campos obligatorios para unirte a la beta.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      let data: { message?: string } = {};

      try {
        data = (await response.json()) as { message?: string };
      } catch {
        data = {};
      }

      if (!response.ok) {
        setMessage(
          data.message ||
            "No pudimos guardar tus datos en este momento. Intenta nuevamente en unos segundos.",
        );
        return;
      }

      setMessage("¡Listo! Te avisaremos cuando abramos la beta de Margenia Beauty.");
      setForm(initialForm);
    } catch {
      setMessage(
        "No pudimos guardar tus datos en este momento. Intenta nuevamente en unos segundos.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="lista-espera" className="bg-[#f3f4f6] px-5 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7c3aed]">
            Lista de espera
          </p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            Ayúdanos a construir una herramienta que sí entienda tu negocio.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#625862]">
            Déjanos tus datos y cuéntanos cómo controlas hoy precios, ventas y
            combos. Esta landing existe para validar interés antes de crear la
            app completa.
          </p>
        </div>
        <form onSubmit={submit} className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
          {isFounderIntent && (
            <div className="mb-5 rounded-lg border border-[#ddd6fe] bg-[#f5f3ff] p-4 text-sm font-bold leading-6 text-[#5b21b6]">
              Estás aplicando para ser Fundadora. Déjanos tus datos y te
              contactaremos para activar tu acceso anticipado.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nombre"
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
            <Field
              label="WhatsApp"
              required
              inputMode="tel"
              value={form.whatsapp}
              onChange={(event) => updateField("whatsapp", event.target.value)}
            />
            <InstagramField
              label="Instagram del negocio"
              placeholder="tunegocio"
              value={form.instagram}
              onValueChange={(value) => updateField("instagram", value)}
            />
            <Field
              label="Qué vendes"
              required
              placeholder="Maquillaje, skincare, capilar..."
              value={form.sells}
              onChange={(event) => updateField("sells", event.target.value)}
            />
            <SelectField
              label="¿Cómo controlas hoy tus precios y ventas?"
              required
              options={controlOptions}
              value={form.controlMethod}
              onChange={(event) => updateField("controlMethod", event.target.value)}
            />
            <SelectField
              label="¿Te gustaría probar Margenia Beauty cuando esté lista?"
              required
              options={betaOptions}
              value={form.wantsBeta}
              onChange={(event) => updateField("wantsBeta", event.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60 ${primaryButtonClass}`}
          >
            {isSubmitting ? "Enviando..." : "Unirme a la beta"}
          </button>
          {message && (
            <p className="mt-4 rounded-lg bg-[#eefaf2] p-4 text-sm font-bold text-[#23643a]">
              {message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
