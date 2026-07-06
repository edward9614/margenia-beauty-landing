"use server";

import { revalidatePath } from "next/cache";
import {
  cleanText,
  currencyOptions,
  dateFormatOptions,
  isValidEmail,
  languageOptions,
  themeOptions,
  timezoneOptions,
  type BusinessSettings,
  type SettingsActionResult,
  type UserPreferenceSettings,
} from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

type SupabaseActionError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

type BusinessRow = {
  address: string | null;
  billing_email: string | null;
  business_type: string | null;
  city: string | null;
  contact_email: string | null;
  country: string | null;
  currency: string | null;
  date_format: string | null;
  description: string | null;
  fiscal_address: string | null;
  fiscal_id: string | null;
  fiscal_name: string | null;
  fiscal_regime: string | null;
  id: string;
  instagram: string | null;
  language: string | null;
  logo_path: string | null;
  logo_url: string | null;
  name: string | null;
  phone: string | null;
  timezone: string | null;
  website: string | null;
};

function mapSettingsError(error: SupabaseActionError) {
  const normalized = `${error.code || ""} ${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();

  if (normalized.includes("schema cache") || normalized.includes("could not find")) {
    return "La migración de Configuración aún no está instalada en Supabase.";
  }

  if (normalized.includes("usuario no autenticado")) {
    return "Tu sesión expiró. Inicia sesión nuevamente.";
  }

  if (normalized.includes("nombre del negocio")) {
    return "El nombre del negocio es obligatorio.";
  }

  if (normalized.includes("moneda") || normalized.includes("idioma") || normalized.includes("fecha") || normalized.includes("zona horaria")) {
    return "Revisa las preferencias seleccionadas.";
  }

  if (error.code === "42501" || normalized.includes("row-level security")) {
    return "No tienes permiso para modificar esta configuración.";
  }

  return "No pudimos guardar los cambios. Intenta nuevamente.";
}

async function getActiveBusiness() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Tu sesión expiró. Inicia sesión nuevamente.", supabase };
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select(
      "id,name,description,business_type,country,city,address,phone,contact_email,instagram,website,logo_url,logo_path,currency,timezone,language,date_format,fiscal_name,fiscal_id,fiscal_regime,fiscal_address,billing_email",
    )
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (businessError || !business) {
    return {
      error: businessError ? mapSettingsError(businessError) : "No encontramos el negocio activo.",
      supabase,
    };
  }

  return { business: business as BusinessRow, supabase, user };
}

function mergeBusiness(current: BusinessRow, input: Partial<BusinessSettings>) {
  return {
    address: cleanText(input.address ?? current.address),
    billingEmail: cleanText(input.billingEmail ?? current.billing_email),
    businessType: cleanText(input.businessType ?? current.business_type),
    city: cleanText(input.city ?? current.city),
    contactEmail: cleanText(input.contactEmail ?? current.contact_email),
    country: cleanText(input.country ?? current.country),
    currency: cleanText(input.currency ?? current.currency ?? "COP").toUpperCase(),
    dateFormat: cleanText(input.dateFormat ?? current.date_format ?? "DD/MM/YYYY"),
    description: cleanText(input.description ?? current.description),
    fiscalAddress: cleanText(input.fiscalAddress ?? current.fiscal_address),
    fiscalId: cleanText(input.fiscalId ?? current.fiscal_id),
    fiscalName: cleanText(input.fiscalName ?? current.fiscal_name),
    fiscalRegime: cleanText(input.fiscalRegime ?? current.fiscal_regime),
    instagram: cleanText(input.instagram ?? current.instagram),
    language: cleanText(input.language ?? current.language ?? "es"),
    logoPath: cleanText(input.logoPath ?? current.logo_path),
    logoUrl: cleanText(input.logoUrl ?? current.logo_url),
    name: cleanText(input.name ?? current.name),
    phone: cleanText(input.phone ?? current.phone),
    timezone: cleanText(input.timezone ?? current.timezone ?? "America/Bogota"),
    website: cleanText(input.website ?? current.website),
  };
}

export async function saveBusinessSettings(
  input: Partial<BusinessSettings>,
): Promise<SettingsActionResult> {
  const context = await getActiveBusiness();

  if (context.error || !context.business) {
    return { error: context.error, ok: false };
  }

  const business = mergeBusiness(context.business, input);

  if (!business.name) {
    return { error: "El nombre del negocio es obligatorio.", ok: false };
  }

  if (!isValidEmail(business.contactEmail) || !isValidEmail(business.billingEmail)) {
    return { error: "Ingresa un correo válido.", ok: false };
  }

  if (!currencyOptions.includes(business.currency as (typeof currencyOptions)[number])) {
    return { error: "Selecciona una moneda válida.", ok: false };
  }

  if (!timezoneOptions.includes(business.timezone as (typeof timezoneOptions)[number])) {
    return { error: "Selecciona una zona horaria válida.", ok: false };
  }

  if (!languageOptions.some((option) => option.value === business.language)) {
    return { error: "Selecciona un idioma válido.", ok: false };
  }

  if (!dateFormatOptions.includes(business.dateFormat as (typeof dateFormatOptions)[number])) {
    return { error: "Selecciona un formato de fecha válido.", ok: false };
  }

  const { error } = await context.supabase.rpc("update_business_settings", {
    p_address: business.address,
    p_billing_email: business.billingEmail,
    p_business_id: context.business.id,
    p_business_type: business.businessType,
    p_city: business.city,
    p_contact_email: business.contactEmail,
    p_country: business.country,
    p_currency: business.currency,
    p_date_format: business.dateFormat,
    p_description: business.description,
    p_fiscal_address: business.fiscalAddress,
    p_fiscal_id: business.fiscalId,
    p_fiscal_name: business.fiscalName,
    p_fiscal_regime: business.fiscalRegime,
    p_instagram: business.instagram,
    p_language: business.language,
    p_logo_url: business.logoUrl,
    p_name: business.name,
    p_phone: business.phone,
    p_timezone: business.timezone,
    p_website: business.website,
  });

  if (error) {
    console.error("saveBusinessSettings failed", {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });

    return { error: mapSettingsError(error), ok: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/configuracion");

  return { message: "Configuración guardada.", ok: true };
}

export async function saveBusinessLogo({
  businessId,
  logoPath,
  logoUrl,
}: {
  businessId: string;
  logoPath: string;
  logoUrl: string;
}): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Tu sesión expiró. Inicia sesión nuevamente.", ok: false };
  }

  const { error } = await supabase.rpc("update_business_logo", {
    p_business_id: businessId,
    p_logo_path: cleanText(logoPath),
    p_logo_url: cleanText(logoUrl),
  });

  if (error) {
    console.error("saveBusinessLogo failed", {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });

    return { error: mapSettingsError(error), ok: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/configuracion");

  return { message: "Logo actualizado correctamente.", ok: true };
}

export async function saveUserPreferences(
  input: UserPreferenceSettings,
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Tu sesión expiró. Inicia sesión nuevamente.", ok: false };
  }

  const language = cleanText(input.language || "es");
  const theme = cleanText(input.theme || "system");

  if (!languageOptions.some((option) => option.value === language)) {
    return { error: "Selecciona un idioma válido.", ok: false };
  }

  if (!themeOptions.some((option) => option.value === theme)) {
    return { error: "Selecciona una preferencia visual válida.", ok: false };
  }

  const { error } = await supabase.rpc("update_user_preferences", {
    p_first_name: cleanText(input.firstName),
    p_language: language,
    p_last_name: cleanText(input.lastName),
    p_phone: cleanText(input.phone),
    p_theme: theme,
  });

  if (error) {
    console.error("saveUserPreferences failed", {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });

    return { error: mapSettingsError(error), ok: false };
  }

  revalidatePath("/app/configuracion");

  return { message: "Configuración guardada.", ok: true };
}
