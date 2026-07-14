export type CustomerStatus = "active" | "archived" | "inactive";
export type CustomerFrequency = "new" | "recurring" | "vip";

export type CustomerRow = {
  address: string | null;
  archived_at: string | null;
  birth_date: string | null;
  business_id: string;
  city: string | null;
  created_at: string;
  document_number: string | null;
  document_type: string | null;
  email: string | null;
  full_name: string;
  gender: string | null;
  id: string;
  marketing_opt_in: boolean;
  notes_summary: string | null;
  phone: string | null;
  preferred_contact_channel: string | null;
  status: CustomerStatus | string;
  tags: string[] | null;
  updated_at: string;
};

export type CustomerSaleRow = {
  balance_due: number | string | null;
  channel?: string | null;
  customer_id: string | null;
  gross_profit: number | string | null;
  id: string;
  paid_amount: number | string | null;
  payment_status: string | null;
  sale_code: string;
  sale_date: string;
  status: string | null;
  total_amount: number | string | null;
};

export type CustomerMetrics = {
  averageDaysBetweenPurchases: number | null;
  averageTicket: number;
  daysSinceLastPurchase: number | null;
  firstPurchaseAt: string | null;
  frequency: CustomerFrequency;
  lastPurchaseAt: string | null;
  pendingBalance: number;
  totalOrders: number;
  totalSpent: number;
};

export type CustomerWithMetrics = CustomerRow & CustomerMetrics;

export type CustomerFormInput = {
  address: string;
  birthDate: string;
  city: string;
  documentNumber: string;
  documentType: string;
  email: string;
  fullName: string;
  gender: string;
  marketingOptIn: boolean;
  notesSummary: string;
  phone: string;
  preferredContactChannel: string;
  status: CustomerStatus;
  tags: string;
};

export type CustomerSearchFilters = {
  city: string;
  frequency: string;
  lastPurchase: string;
  maxSpent: number | null;
  minSpent: number | null;
  query: string;
  sort: string;
  status: string;
};

export const customerDocumentTypes = [
  { label: "Cédula de ciudadanía", value: "cc" },
  { label: "Cédula de extranjería", value: "ce" },
  { label: "NIT", value: "nit" },
  { label: "Pasaporte", value: "passport" },
  { label: "Otro", value: "other" },
] as const;

export const customerContactChannels = [
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Llamada", value: "phone" },
  { label: "Correo", value: "email" },
  { label: "Instagram", value: "instagram" },
  { label: "Otro", value: "other" },
] as const;

export function emptyCustomerForm(): CustomerFormInput {
  return {
    address: "",
    birthDate: "",
    city: "",
    documentNumber: "",
    documentType: "",
    email: "",
    fullName: "",
    gender: "",
    marketingOptIn: false,
    notesSummary: "",
    phone: "",
    preferredContactChannel: "whatsapp",
    status: "active",
    tags: "",
  };
}

export function customerFormFromRow(customer: CustomerRow): CustomerFormInput {
  return {
    address: customer.address || "",
    birthDate: customer.birth_date || "",
    city: customer.city || "",
    documentNumber: customer.document_number || "",
    documentType: customer.document_type || "",
    email: customer.email || "",
    fullName: customer.full_name,
    gender: customer.gender || "",
    marketingOptIn: customer.marketing_opt_in,
    notesSummary: customer.notes_summary || "",
    phone: customer.phone || "",
    preferredContactChannel: customer.preferred_contact_channel || "whatsapp",
    status: customer.status === "inactive" ? "inactive" : "active",
    tags: (customer.tags || []).join(", "),
  };
}

export function safeNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function completedSales(sales: CustomerSaleRow[]) {
  return sales
    .filter((sale) => sale.status !== "voided")
    .sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());
}

export function buildCustomerMetrics(sales: CustomerSaleRow[]): CustomerMetrics {
  const validSales = completedSales(sales);
  const totalOrders = validSales.length;
  const totalSpent = validSales.reduce((total, sale) => total + safeNumber(sale.total_amount), 0);
  const pendingBalance = validSales.reduce(
    (total, sale) => total + safeNumber(sale.balance_due),
    0,
  );
  const firstPurchaseAt = validSales[0]?.sale_date || null;
  const lastPurchaseAt = validSales.at(-1)?.sale_date || null;
  const intervals = validSales.slice(1).map((sale, index) => {
    const previous = new Date(validSales[index].sale_date).getTime();
    const current = new Date(sale.sale_date).getTime();
    return Math.max((current - previous) / 86_400_000, 0);
  });
  const averageDaysBetweenPurchases = intervals.length
    ? intervals.reduce((total, days) => total + days, 0) / intervals.length
    : null;
  const daysSinceLastPurchase = lastPurchaseAt
    ? Math.max(Math.floor((Date.now() - new Date(lastPurchaseAt).getTime()) / 86_400_000), 0)
    : null;
  const frequency: CustomerFrequency =
    totalOrders >= 10 || totalSpent >= 1_000_000
      ? "vip"
      : totalOrders >= 2
        ? "recurring"
        : "new";

  return {
    averageDaysBetweenPurchases,
    averageTicket: totalOrders ? totalSpent / totalOrders : 0,
    daysSinceLastPurchase,
    firstPurchaseAt,
    frequency,
    lastPurchaseAt,
    pendingBalance,
    totalOrders,
    totalSpent,
  };
}

export function mergeCustomersWithSales(
  customers: CustomerRow[],
  sales: CustomerSaleRow[],
): CustomerWithMetrics[] {
  const salesByCustomer = new Map<string, CustomerSaleRow[]>();

  sales.forEach((sale) => {
    if (!sale.customer_id) return;
    const current = salesByCustomer.get(sale.customer_id) || [];
    current.push(sale);
    salesByCustomer.set(sale.customer_id, current);
  });

  return customers.map((customer) => ({
    ...customer,
    ...buildCustomerMetrics(salesByCustomer.get(customer.id) || []),
  }));
}

function isWithinLastPurchaseRange(date: string | null, range: string) {
  if (!range || range === "all") return true;
  if (!date) return false;

  const ageInDays = (Date.now() - new Date(date).getTime()) / 86_400_000;
  if (range === "30d") return ageInDays <= 30;
  if (range === "90d") return ageInDays <= 90;
  if (range === "inactive") return ageInDays > 90;
  return true;
}

export function filterCustomers(
  customers: CustomerWithMetrics[],
  filters: CustomerSearchFilters,
) {
  const query = filters.query.trim().toLowerCase();
  const city = filters.city.trim().toLowerCase();

  const filtered = customers.filter((customer) => {
    const searchValue = [
      customer.full_name,
      customer.phone,
      customer.email,
      customer.document_number,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "debt"
        ? customer.pendingBalance > 0
        : customer.status === filters.status);
    const matchesFrequency =
      filters.frequency === "all" || customer.frequency === filters.frequency;

    return (
      (!query || searchValue.includes(query)) &&
      matchesStatus &&
      matchesFrequency &&
      (!city || customer.city?.toLowerCase() === city) &&
      (filters.minSpent === null || customer.totalSpent >= filters.minSpent) &&
      (filters.maxSpent === null || customer.totalSpent <= filters.maxSpent) &&
      isWithinLastPurchaseRange(customer.lastPurchaseAt, filters.lastPurchase)
    );
  });

  return filtered.sort((a, b) => {
    if (filters.sort === "spent") return b.totalSpent - a.totalSpent;
    if (filters.sort === "orders") return b.totalOrders - a.totalOrders;
    if (filters.sort === "last_purchase") {
      return (b.lastPurchaseAt ? new Date(b.lastPurchaseAt).getTime() : 0) -
        (a.lastPurchaseAt ? new Date(a.lastPurchaseAt).getTime() : 0);
    }
    if (filters.sort === "name") return a.full_name.localeCompare(b.full_name, "es");
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function customerFrequencyLabel(frequency: CustomerFrequency) {
  if (frequency === "vip") return "VIP";
  if (frequency === "recurring") return "Frecuente";
  return "Nuevo";
}

export function customerStatusLabel(status: string) {
  if (status === "archived") return "Archivado";
  if (status === "inactive") return "Inactivo";
  return "Activo";
}

export function customerInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CL";
}

export function normalizeTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

export function nullableText(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

export function validateCustomerInput(input: CustomerFormInput) {
  const fieldErrors: Record<string, string> = {};
  const name = input.fullName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();

  if (name.length < 2) fieldErrors.fullName = "Escribe el nombre completo del cliente.";
  if (!phone && !email) fieldErrors.contact = "Agrega al menos un teléfono o correo.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Escribe un correo válido.";
  }
  if (phone && phone.replace(/\D/g, "").length < 7) {
    fieldErrors.phone = "Escribe un teléfono válido.";
  }
  if (input.documentNumber.trim() && !input.documentType) {
    fieldErrors.documentType = "Selecciona el tipo de documento.";
  }

  return {
    fieldErrors,
    ok: Object.keys(fieldErrors).length === 0,
  };
}

export type CustomerPermissions = {
  canArchive: boolean;
  canEdit: boolean;
  canExport: boolean;
  canRegisterPayment: boolean;
};

export function customerPermissions(role: "owner" | "seller" = "owner"): CustomerPermissions {
  return {
    canArchive: role === "owner",
    canEdit: true,
    canExport: role === "owner",
    canRegisterPayment: true,
  };
}
