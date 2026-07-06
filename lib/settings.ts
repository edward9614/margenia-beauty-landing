export const businessTypeOptions = [
  "Tienda de productos",
  "Cosméticos / belleza",
  "Mascotas",
  "Moda / accesorios",
  "Repostería",
  "Papelería",
  "Otro",
] as const;

export const currencyOptions = ["COP", "USD", "MXN", "PEN", "CLP", "ARS", "BRL"] as const;

export const dateFormatOptions = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;

export const languageOptions = [
  { label: "Español", value: "es" },
  { label: "Portugués", value: "pt" },
  { label: "Inglés", value: "en" },
] as const;

export const themeOptions = [
  { label: "Claro", value: "light" },
  { label: "Sistema", value: "system" },
] as const;

export const timezoneOptions = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
] as const;

export type BusinessSettings = {
  address: string;
  billingEmail: string;
  businessType: string;
  city: string;
  contactEmail: string;
  country: string;
  currency: string;
  dateFormat: string;
  description: string;
  fiscalAddress: string;
  fiscalId: string;
  fiscalName: string;
  fiscalRegime: string;
  id: string;
  instagram: string;
  language: string;
  logoPath: string;
  logoUrl: string;
  name: string;
  phone: string;
  timezone: string;
  website: string;
};

export type UserPreferenceSettings = {
  firstName: string;
  lastName: string;
  language: string;
  phone: string;
  theme: string;
};

export type SettingsActionResult = {
  error?: string;
  message?: string;
  ok: boolean;
};

export function cleanText(value: string | null | undefined) {
  return String(value || "").trim();
}

export function isValidEmail(value: string) {
  const clean = value.trim();

  if (!clean) return true;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

export function normalizeInstagram(value: string) {
  const clean = value.trim();

  if (!clean) return "";

  return clean.startsWith("@") ? clean.replace(/^@+/, "@") : `@${clean}`;
}
