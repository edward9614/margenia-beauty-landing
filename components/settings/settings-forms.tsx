"use client";

import { FormEvent, type ReactNode, useMemo, useState, useTransition } from "react";
import {
  saveBusinessLogo,
  saveBusinessSettings,
  saveUserPreferences,
} from "@/app/(dashboard)/app/configuracion/actions";
import { createClient } from "@/lib/supabase/client";
import {
  businessTypeOptions,
  currencyOptions,
  dateFormatOptions,
  isValidEmail,
  languageOptions,
  normalizeInstagram,
  themeOptions,
  timezoneOptions,
  type BusinessSettings,
  type SettingsActionResult,
  type UserPreferenceSettings,
} from "@/lib/settings";
import { SemanticBadge, ToneCard } from "@/components/ui/semantic";

type SettingsTab = "account" | "business" | "fiscal" | "preferences" | "security";

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

const readOnlyClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-[#475569]";

const logoMaxSize = 2 * 1024 * 1024;
const logoMimeTypes = ["image/png", "image/jpeg", "image/webp"];

const tabs: { id: SettingsTab; label: string }[] = [
  { id: "business", label: "Negocio" },
  { id: "account", label: "Cuenta" },
  { id: "security", label: "Seguridad" },
  { id: "preferences", label: "Preferencias" },
  { id: "fiscal", label: "Fiscal" },
];

function SettingsCard({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-black text-[#0F172A]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#475569]">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#0F172A]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs font-bold text-[#64748B]">{hint}</span>}
    </label>
  );
}

function SaveBar({
  isSaving,
  label = "Guardar cambios",
}: {
  isSaving: boolean;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold text-[#64748B]">
        Tus cambios se guardan solo para el negocio activo.
      </p>
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Guardando..." : label}
      </button>
    </div>
  );
}

function FormMessage({ result }: { result: SettingsActionResult | null }) {
  if (!result) return null;

  return (
    <p
      className={`rounded-2xl border p-4 text-sm font-bold ${
        result.ok
          ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
          : "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
      }`}
    >
      {result.ok ? result.message || "Configuración guardada." : result.error || "No pudimos guardar los cambios. Intenta nuevamente."}
    </p>
  );
}

function getBusinessInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");

  return initials || "M";
}

function getLogoExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "jpg";
}

function mapLogoUploadError(error: { message?: string; statusCode?: string }) {
  const message = `${error.message || ""} ${error.statusCode || ""}`.toLowerCase();

  if (message.includes("bucket") || message.includes("not found")) {
    return "El bucket business-assets no está configurado. Ejecuta la migración 010 en Supabase.";
  }

  if (message.includes("row-level security") || message.includes("policy") || message.includes("permission")) {
    return "Supabase bloqueó la subida por seguridad. Revisa las policies de Storage de business-assets.";
  }

  if (message.includes("mime") || message.includes("type")) {
    return "El archivo debe ser una imagen.";
  }

  if (message.includes("size") || message.includes("too large")) {
    return "El logo no puede pesar más de 2 MB.";
  }

  return "No pudimos subir el logo. Intenta nuevamente.";
}

function BusinessSettingsForm({ initialBusiness }: { initialBusiness: BusinessSettings }) {
  const [form, setForm] = useState(initialBusiness);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoResult, setLogoResult] = useState<SettingsActionResult | null>(null);
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewContact = form.phone || form.contactEmail || form.instagram || "Contacto sin definir";

  function updateField(field: keyof BusinessSettings, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function uploadLogo(file: File | null | undefined) {
    setLogoResult(null);

    if (!file) return;

    if (!logoMimeTypes.includes(file.type)) {
      setLogoResult({ error: "El archivo debe ser una imagen.", ok: false });
      return;
    }

    if (file.size > logoMaxSize) {
      setLogoResult({ error: "El logo no puede pesar más de 2 MB.", ok: false });
      return;
    }

    setIsLogoUploading(true);

    try {
      const supabase = createClient();
      const extension = getLogoExtension(file);
      const logoPath = `businesses/${form.id}/logo-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("business-assets")
        .upload(logoPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("uploadBusinessLogo failed", {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
        });
        setLogoResult({ error: mapLogoUploadError(uploadError), ok: false });
        return;
      }

      const { data } = supabase.storage.from("business-assets").getPublicUrl(logoPath);
      const logoUrl = data.publicUrl;
      const response = await saveBusinessLogo({
        businessId: form.id,
        logoPath,
        logoUrl,
      });

      if (!response.ok) {
        setLogoResult({
          error: response.error || "No pudimos subir el logo. Intenta nuevamente.",
          ok: false,
        });
        return;
      }

      setForm((current) => ({ ...current, logoPath, logoUrl }));
      setLogoResult(response);
    } catch {
      setLogoResult({ error: "No pudimos subir el logo. Intenta nuevamente.", ok: false });
    } finally {
      setIsLogoUploading(false);
    }
  }

  async function removeLogo() {
    setLogoResult(null);
    setIsLogoUploading(true);

    try {
      const response = await saveBusinessLogo({
        businessId: form.id,
        logoPath: "",
        logoUrl: "",
      });

      if (!response.ok) {
        setLogoResult({
          error: response.error || "No pudimos subir el logo. Intenta nuevamente.",
          ok: false,
        });
        return;
      }

      setForm((current) => ({ ...current, logoPath: "", logoUrl: "" }));
      setLogoResult({ message: "Logo eliminado correctamente.", ok: true });
    } catch {
      setLogoResult({ error: "No pudimos subir el logo. Intenta nuevamente.", ok: false });
    } finally {
      setIsLogoUploading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    if (!form.name.trim()) {
      setResult({ error: "El nombre del negocio es obligatorio.", ok: false });
      return;
    }

    if (!isValidEmail(form.contactEmail)) {
      setResult({ error: "Ingresa un correo válido.", ok: false });
      return;
    }

    startTransition(async () => {
      const response = await saveBusinessSettings({
        address: form.address,
        businessType: form.businessType,
        city: form.city,
        contactEmail: form.contactEmail,
        country: form.country,
        description: form.description,
        instagram: normalizeInstagram(form.instagram),
        logoUrl: form.logoUrl,
        name: form.name,
        phone: form.phone,
        website: form.website,
      });

      setResult(response);
    });
  }

  return (
    <SettingsCard
      description="Actualiza la información visible y operativa de tu negocio."
      eyebrow="Negocio"
      title="Información del negocio"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del negocio">
              <input value={form.name} onChange={(event) => updateField("name", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Tipo de negocio">
              <select value={form.businessType} onChange={(event) => updateField("businessType", event.target.value)} className={inputClass}>
                <option value="">Selecciona una opción</option>
                {businessTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Descripción corta">
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Ej: tienda de productos para mascotas, ventas por Instagram y local físico"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="País">
              <input value={form.country} onChange={(event) => updateField("country", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Ciudad">
              <input value={form.city} onChange={(event) => updateField("city", event.target.value)} className={inputClass} />
            </Field>
          </div>

          <Field label="Dirección">
            <input value={form.address} onChange={(event) => updateField("address", event.target.value)} className={inputClass} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teléfono / WhatsApp">
              <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Correo de contacto">
              <input value={form.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Instagram" hint="Puedes escribirlo con o sin @.">
              <input value={form.instagram} onChange={(event) => updateField("instagram", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Sitio web">
              <input value={form.website} onChange={(event) => updateField("website", event.target.value)} className={inputClass} />
            </Field>
          </div>

          <section className="rounded-[1.75rem] border border-[#E2E8F0] bg-[#F8FAFC] p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {form.logoUrl ? (
                  <div
                    aria-label="Logo actual del negocio"
                    className="h-20 w-20 shrink-0 rounded-[1.5rem] border border-[#E2E8F0] bg-white bg-cover bg-center shadow-sm"
                    style={{ backgroundImage: `url(${form.logoUrl})` }}
                  />
                ) : (
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.5rem] bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-2xl font-black text-white shadow-lg shadow-cyan-500/20">
                    {getBusinessInitials(form.name)}
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="text-base font-black text-[#0F172A]">Logo del negocio</h3>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-[#475569]">
                    Sube el logo que representa tu negocio. Lo usaremos para personalizar tu perfil y futuras vistas.
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#64748B]">
                    PNG, JPG, JPEG o WEBP. Máximo 2 MB.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <label
                  className={`cursor-pointer rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 ${
                    isLogoUploading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {isLogoUploading ? "Subiendo..." : form.logoUrl ? "Cambiar logo" : "Subir logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={isLogoUploading}
                    onChange={(event) => {
                      void uploadLogo(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>

                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      void removeLogo();
                    }}
                    disabled={isLogoUploading}
                    className="rounded-full border border-[#CBD5E1] bg-white px-5 py-3 text-sm font-black text-[#475569] transition hover:bg-[#EFF6FF] hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Eliminar logo
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4">
              <FormMessage result={logoResult} />
            </div>
          </section>

          <FormMessage result={result} />
          <SaveBar isSaving={isPending} />
        </form>

        <ToneCard tone={form.name && form.country ? "positive" : "warning"} className="h-fit">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-[#475569]">Así se verá tu negocio</p>
            <SemanticBadge tone={form.name && form.country ? "positive" : "warning"}>
              {form.name && form.country ? "Completo" : "Incompleto"}
            </SemanticBadge>
          </div>
          <div className="mt-5 rounded-[1.5rem] bg-[#F8FAFC] p-5">
            {form.logoUrl ? (
              <div
                aria-label="Logo del negocio"
                className="h-14 w-14 rounded-2xl border border-[#E2E8F0] bg-white bg-cover bg-center shadow-sm"
                style={{ backgroundImage: `url(${form.logoUrl})` }}
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-lg font-black text-white">
                {getBusinessInitials(form.name)}
              </div>
            )}
            <h3 className="mt-5 text-2xl font-black text-[#0F172A]">{form.name || "Tu negocio"}</h3>
            <p className="mt-2 text-sm font-bold text-[#475569]">{form.businessType || "Tipo de negocio pendiente"}</p>
            <p className="mt-4 text-sm leading-6 text-[#475569]">
              {[form.country, form.city].filter(Boolean).join(" / ") || "Ubicación pendiente"}
            </p>
            <p className="mt-2 text-sm font-black text-[#2563EB]">{previewContact}</p>
          </div>
        </ToneCard>
      </div>
    </SettingsCard>
  );
}

function UserProfileForm({
  initialPreferences,
  userEmail,
}: {
  initialPreferences: UserPreferenceSettings;
  userEmail: string;
}) {
  const [form, setForm] = useState(initialPreferences);
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(field: keyof UserPreferenceSettings, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      setResult(await saveUserPreferences(form));
    });
  }

  return (
    <SettingsCard
      description="Mantén actualizados tus datos personales de trabajo."
      eyebrow="Cuenta"
      title="Perfil personal"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Apellido">
            <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Correo">
            <input value={userEmail} readOnly className={readOnlyClass} />
          </Field>
          <Field label="Teléfono opcional">
            <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={inputClass} />
          </Field>
        </div>
        <FormMessage result={result} />
        <SaveBar isSaving={isPending} />
      </form>
    </SettingsCard>
  );
}

function SecurityForm({ userEmail }: { userEmail: string }) {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    if (newPassword.length < 8) {
      setResult({ error: "La contraseña debe tener al menos 8 caracteres.", ok: false });
      return;
    }

    if (newPassword !== confirmPassword) {
      setResult({ error: "Las contraseñas no coinciden.", ok: false });
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setResult({ error: "No pudimos actualizar tu contraseña. Intenta nuevamente.", ok: false });
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setResult({ message: "Configuración guardada.", ok: true });
    } catch {
      setResult({ error: "No pudimos actualizar tu contraseña. Intenta nuevamente.", ok: false });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsCard
      description="Actualiza tu contraseña sin guardar datos sensibles en Margenia."
      eyebrow="Seguridad"
      title="Acceso y contraseña"
    >
      <div className="mb-5 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-sm font-bold text-[#1D4ED8]">
        Cuenta actual: {userEmail}
      </div>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contraseña nueva">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar contraseña">
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>
        </div>
        <FormMessage result={result} />
        <SaveBar isSaving={isSaving} label="Actualizar contraseña" />
      </form>
    </SettingsCard>
  );
}

function PreferencesForm({
  initialBusiness,
  initialPreferences,
}: {
  initialBusiness: BusinessSettings;
  initialPreferences: UserPreferenceSettings;
}) {
  const [currency, setCurrency] = useState(initialBusiness.currency);
  const [dateFormat, setDateFormat] = useState(initialBusiness.dateFormat);
  const [language, setLanguage] = useState(initialBusiness.language || initialPreferences.language || "es");
  const [theme, setTheme] = useState(initialPreferences.theme || "system");
  const [timezone, setTimezone] = useState(initialBusiness.timezone);
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const businessResponse = await saveBusinessSettings({
        currency,
        dateFormat,
        language,
        timezone,
      });

      if (!businessResponse.ok) {
        setResult(businessResponse);
        return;
      }

      const preferenceResponse = await saveUserPreferences({
        ...initialPreferences,
        language,
        theme,
      });

      setResult(preferenceResponse.ok ? businessResponse : preferenceResponse);
    });
  }

  return (
    <SettingsCard
      description="Define cómo Margenia debe mostrar dinero, fechas e idioma dentro de tu espacio privado."
      eyebrow="Preferencias"
      title="Formato de la app"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Moneda principal">
            <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={inputClass}>
              {currencyOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Zona horaria">
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className={inputClass}>
              {timezoneOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Idioma">
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className={inputClass}>
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Formato de fecha">
            <select value={dateFormat} onChange={(event) => setDateFormat(event.target.value)} className={inputClass}>
              {dateFormatOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Preferencia visual">
            <select value={theme} onChange={(event) => setTheme(event.target.value)} className={inputClass}>
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-sm font-bold text-[#1D4ED8]">
          El modo oscuro completo todavía no está activo. La opción “Sistema” quedará preparada para una fase posterior.
        </div>
        <FormMessage result={result} />
        <SaveBar isSaving={isPending} />
      </form>
    </SettingsCard>
  );
}

function FiscalSettingsForm({ initialBusiness }: { initialBusiness: BusinessSettings }) {
  const [form, setForm] = useState(initialBusiness);
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(field: keyof BusinessSettings, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    if (!isValidEmail(form.billingEmail)) {
      setResult({ error: "Ingresa un correo válido.", ok: false });
      return;
    }

    startTransition(async () => {
      setResult(await saveBusinessSettings({
        billingEmail: form.billingEmail,
        fiscalAddress: form.fiscalAddress,
        fiscalId: form.fiscalId,
        fiscalName: form.fiscalName,
        fiscalRegime: form.fiscalRegime,
      }));
    });
  }

  return (
    <SettingsCard
      description="Guarda datos fiscales informativos para tener tu negocio más ordenado."
      eyebrow="Fiscal"
      title="Datos fiscales básicos"
    >
      <div className="mb-5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-sm font-bold text-[#92400E]">
        Estos datos son informativos. Margenia aún no emite facturación electrónica desde este módulo.
      </div>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre fiscal / razón social">
            <input value={form.fiscalName} onChange={(event) => updateField("fiscalName", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Documento fiscal / NIT / RUC / RFC">
            <input value={form.fiscalId} onChange={(event) => updateField("fiscalId", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Régimen o tipo fiscal opcional">
            <input value={form.fiscalRegime} onChange={(event) => updateField("fiscalRegime", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Correo de facturación">
            <input value={form.billingEmail} onChange={(event) => updateField("billingEmail", event.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Dirección fiscal">
          <input value={form.fiscalAddress} onChange={(event) => updateField("fiscalAddress", event.target.value)} className={inputClass} />
        </Field>
        <FormMessage result={result} />
        <SaveBar isSaving={isPending} />
      </form>
    </SettingsCard>
  );
}

export function SettingsForms({
  initialBusiness,
  initialPreferences,
  userEmail,
}: {
  initialBusiness: BusinessSettings;
  initialPreferences: UserPreferenceSettings;
  userEmail: string;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
  const completion = useMemo(() => {
    const businessComplete = Boolean(initialBusiness.name && initialBusiness.country && initialBusiness.currency && initialBusiness.timezone);

    return businessComplete;
  }, [initialBusiness]);

  return (
    <div className="settings-premium space-y-5">
      <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black transition ${
                activeTab === tab.id
                  ? "bg-[#0F172A] text-white shadow-sm"
                  : "text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <ToneCard tone={completion ? "positive" : "warning"}>
          <p className="text-sm font-black text-[#475569]">Estado de configuración</p>
          <p className="mt-3 text-2xl font-black text-[#0F172A]">
            {completion ? "Completa" : "Incompleta"}
          </p>
        </ToneCard>
        <ToneCard tone="info">
          <p className="text-sm font-black text-[#475569]">Moneda</p>
          <p className="mt-3 text-2xl font-black text-[#0F172A]">{initialBusiness.currency || "COP"}</p>
        </ToneCard>
        <ToneCard tone="neutral">
          <p className="text-sm font-black text-[#475569]">Zona horaria</p>
          <p className="mt-3 text-lg font-black text-[#0F172A]">{initialBusiness.timezone || "America/Bogota"}</p>
        </ToneCard>
      </div>

      {activeTab === "business" && <BusinessSettingsForm initialBusiness={initialBusiness} />}
      {activeTab === "account" && <UserProfileForm initialPreferences={initialPreferences} userEmail={userEmail} />}
      {activeTab === "security" && <SecurityForm userEmail={userEmail} />}
      {activeTab === "preferences" && (
        <PreferencesForm initialBusiness={initialBusiness} initialPreferences={initialPreferences} />
      )}
      {activeTab === "fiscal" && <FiscalSettingsForm initialBusiness={initialBusiness} />}
    </div>
  );
}
