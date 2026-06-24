"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const channels = [
  "Local físico",
  "Instagram",
  "WhatsApp",
  "Tienda online",
  "Ferias",
  "Otro",
];

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [currency, setCurrency] = useState("COP");
  const [primaryChannel, setPrimaryChannel] = useState("WhatsApp");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanBusinessType = businessType.trim();
    const cleanCountry = country.trim();
    const cleanCurrency = currency.trim().toUpperCase() || "COP";

    if (!cleanName) {
      setError("Ingresa el nombre de tu negocio.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Tu sesión expiró. Vuelve a iniciar sesión.");
        return;
      }

      const { error: insertError } = await supabase.from("businesses").insert({
        business_type: cleanBusinessType,
        country: cleanCountry,
        currency: cleanCurrency,
        name: cleanName,
        owner_id: user.id,
        primary_channel: primaryChannel,
      });

      if (insertError) {
        setError("No pudimos crear tu negocio. Intenta nuevamente.");
        return;
      }

      router.replace("/app");
      router.refresh();
    } catch {
      setError("No pudimos crear tu negocio en este momento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-black">Nombre del negocio</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm font-black">Tipo de negocio</span>
        <input
          placeholder="Ej: accesorios, alimentos, cosméticos, regalos"
          value={businessType}
          onChange={(event) => setBusinessType(event.target.value)}
          className={inputClass}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-black">País</span>
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-black">Moneda</span>
          <input
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-black">Canal principal</span>
        <select
          value={primaryChannel}
          onChange={(event) => setPrimaryChannel(event.target.value)}
          className={inputClass}
        >
          {channels.map((channel) => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-4 text-sm font-bold text-[#991B1B]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-center text-base font-black text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creando negocio..." : "Crear mi negocio"}
      </button>
    </form>
  );
}
