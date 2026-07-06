import { redirect } from "next/navigation";
import { SettingsForms } from "@/components/settings/settings-forms";
import type { BusinessSettings, UserPreferenceSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

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

type PreferenceRow = {
  first_name: string | null;
  language: string | null;
  last_name: string | null;
  phone: string | null;
  theme: string | null;
};

function splitFullName(fullName?: string | null) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function mapBusiness(row: BusinessRow): BusinessSettings {
  return {
    address: row.address || "",
    billingEmail: row.billing_email || "",
    businessType: row.business_type || "",
    city: row.city || "",
    contactEmail: row.contact_email || "",
    country: row.country || "",
    currency: row.currency || "COP",
    dateFormat: row.date_format || "DD/MM/YYYY",
    description: row.description || "",
    fiscalAddress: row.fiscal_address || "",
    fiscalId: row.fiscal_id || "",
    fiscalName: row.fiscal_name || "",
    fiscalRegime: row.fiscal_regime || "",
    id: row.id,
    instagram: row.instagram || "",
    language: row.language || "es",
    logoPath: row.logo_path || "",
    logoUrl: row.logo_url || "",
    name: row.name || "",
    phone: row.phone || "",
    timezone: row.timezone || "America/Bogota",
    website: row.website || "",
  };
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: business }, { data: preferences }, { data: profile }] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "id,name,description,business_type,country,city,address,phone,contact_email,instagram,website,logo_url,logo_path,currency,timezone,language,date_format,fiscal_name,fiscal_id,fiscal_regime,fiscal_address,billing_email",
      )
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select("first_name,last_name,phone,language,theme")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!business) {
    redirect("/app/onboarding");
  }

  const nameFallback = splitFullName(
    (profile as { full_name?: string | null } | null)?.full_name ||
      (user.user_metadata?.full_name as string | undefined),
  );
  const typedPreferences = preferences as PreferenceRow | null;
  const initialBusiness = mapBusiness(business as BusinessRow);
  const initialPreferences: UserPreferenceSettings = {
    firstName: typedPreferences?.first_name || nameFallback.firstName,
    language: typedPreferences?.language || initialBusiness.language || "es",
    lastName: typedPreferences?.last_name || nameFallback.lastName,
    phone: typedPreferences?.phone || "",
    theme: typedPreferences?.theme || "system",
  };

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <div className="w-full max-w-none space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Configuración
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
            Configuración
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#475569]">
            Administra los datos de tu negocio, cuenta, seguridad y preferencias.
          </p>
        </section>

        <SettingsForms
          initialBusiness={initialBusiness}
          initialPreferences={initialPreferences}
          userEmail={user.email || "Correo no disponible"}
        />
      </div>
    </main>
  );
}
