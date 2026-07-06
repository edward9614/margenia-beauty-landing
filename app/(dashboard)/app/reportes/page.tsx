import Link from "next/link";
import { redirect } from "next/navigation";
import {
  SemanticBadge,
  semanticToneStyles,
  type SemanticTone,
} from "@/components/ui/semantic";
import { ExcelDownloadButton } from "@/components/reports/excel-download-button";
import { moneyFormatter, toSafeNumber } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

type ReportTab =
  | "resumen"
  | "ventas"
  | "rentabilidad"
  | "caja"
  | "inventario"
  | "productos"
  | "pagos";

type ReportPeriod =
  | "today"
  | "last_7_days"
  | "current_month"
  | "previous_month"
  | "last_30_days"
  | "custom";

type ReportRange = {
  days: number;
  endDate: string;
  endIso: string;
  from: string;
  period: ReportPeriod;
  startDate: string;
  startIso: string;
  to: string;
};

type SaleItemRow = {
  combo_id: string | null;
  gross_profit: number | string | null;
  item_name: string | null;
  item_type: string | null;
  quantity: number | string | null;
  total_amount: number | string | null;
  total_cost: number | string | null;
  variant_id: string | null;
  variant_name: string | null;
};

type SalePaymentRow = {
  amount: number | string | null;
  paid_at: string | null;
  payment_method: string | null;
};

type SaleRow = {
  balance_due: number | string | null;
  channel: string | null;
  customer_name: string | null;
  discount_amount: number | string | null;
  gross_margin_percent: number | string | null;
  gross_profit: number | string | null;
  id: string;
  paid_amount: number | string | null;
  payment_status: string | null;
  sale_code: string | null;
  sale_date: string;
  sale_items?: SaleItemRow[] | null;
  sale_payments?: SalePaymentRow[] | null;
  status: string | null;
  total_amount: number | string | null;
  total_cost: number | string | null;
};

type ProductVariantReportRow = {
  current_stock: number | string | null;
  id: string;
  low_stock_threshold: number | string | null;
  name: string | null;
  purchase_cost: number | string | null;
  sale_price: number | string | null;
  status: string | null;
};

type ProductReportRow = {
  id: string;
  name: string;
  product_variants?: ProductVariantReportRow[] | null;
  status: string | null;
  track_inventory: boolean | null;
};

type ComboReportRow = {
  id: string;
  name: string;
  sale_price: number | string | null;
  status: string | null;
};

type InventoryMovementRow = {
  movement_type: string | null;
  quantity: number | string | null;
  source: string | null;
  total_cost: number | string | null;
};

type InventoryCountRow = {
  id: string;
  status: string | null;
  inventory_count_items?: {
    difference_quantity: number | string | null;
    total_difference_cost: number | string | null;
  }[] | null;
};

type CashSessionRow = {
  closed_at: string | null;
  counted_cash_amount: number | string | null;
  counted_total_amount: number | string | null;
  expected_cash_amount: number | string | null;
  expected_total_amount: number | string | null;
  id: string;
  opened_at: string | null;
  status: string | null;
  total_difference_amount: number | string | null;
};

type CashMovementRow = {
  amount: number | string | null;
  direction: string | null;
  movement_type: string | null;
  payment_method: string | null;
};

type RankItem = {
  detail?: string;
  label: string;
  tone?: SemanticTone;
  value: string;
};

type ChartItem = {
  label: string;
  tone?: SemanticTone;
  value: number;
};

const tabs: { id: ReportTab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "ventas", label: "Ventas" },
  { id: "rentabilidad", label: "Rentabilidad" },
  { id: "caja", label: "Caja" },
  { id: "inventario", label: "Inventario" },
  { id: "productos", label: "Productos y combos" },
  { id: "pagos", label: "Pagos pendientes" },
];

const periodOptions: { label: string; value: ReportPeriod }[] = [
  { label: "Hoy", value: "today" },
  { label: "Últimos 7 días", value: "last_7_days" },
  { label: "Mes actual", value: "current_month" },
  { label: "Mes anterior", value: "previous_month" },
  { label: "Últimos 30 días", value: "last_30_days" },
  { label: "Personalizado", value: "custom" },
];

const channelOptions = [
  { label: "Todos", value: "all" },
  { label: "Local", value: "local" },
  { label: "Instagram", value: "instagram" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Tienda online", value: "online_store" },
  { label: "Feria", value: "feria" },
  { label: "Otro", value: "otro" },
] as const;

const paymentMethodOptions = [
  { label: "Todos", value: "all" },
  { label: "Efectivo", value: "cash" },
  { label: "Transferencia", value: "transfer" },
  { label: "Tarjeta", value: "card" },
  { label: "Nequi", value: "nequi" },
  { label: "Daviplata", value: "daviplata" },
  { label: "Otro", value: "other" },
] as const;

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Bogota",
  year: "numeric",
});

const displayDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "America/Bogota",
});

function getStringParam(
  searchParams: SearchParams | undefined,
  key: string,
  fallback = "",
) {
  const value = searchParams?.[key];

  return typeof value === "string" ? value : fallback;
}

function toBogotaDateKey(value: Date) {
  const parts = dateFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));

  return date.toISOString().slice(0, 10);
}

function startOfMonth(dateKey: string) {
  return `${dateKey.slice(0, 8)}01`;
}

function previousMonthRange(dateKey: string) {
  const [year, month] = dateKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 2, 1, 12));
  const end = new Date(Date.UTC(year, month - 1, 0, 12));

  return {
    endDate: end.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
  };
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();

  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

function toStartIso(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000-05:00`).toISOString();
}

function toEndIso(dateKey: string) {
  return new Date(`${dateKey}T23:59:59.999-05:00`).toISOString();
}

function buildRange(period: ReportPeriod, startDate: string, endDate: string): ReportRange {
  return {
    days: daysBetween(startDate, endDate),
    endDate,
    endIso: toEndIso(endDate),
    from: startDate,
    period,
    startDate,
    startIso: toStartIso(startDate),
    to: endDate,
  };
}

function getReportRange(searchParams: SearchParams | undefined) {
  const rawPeriod = getStringParam(searchParams, "period", "current_month");
  const validPeriod = periodOptions.some((option) => option.value === rawPeriod)
    ? (rawPeriod as ReportPeriod)
    : "current_month";
  const today = toBogotaDateKey(new Date());

  if (validPeriod === "today") return buildRange(validPeriod, today, today);
  if (validPeriod === "last_7_days") return buildRange(validPeriod, addDays(today, -6), today);
  if (validPeriod === "last_30_days") return buildRange(validPeriod, addDays(today, -29), today);
  if (validPeriod === "previous_month") {
    const previous = previousMonthRange(today);

    return buildRange(validPeriod, previous.startDate, previous.endDate);
  }

  if (validPeriod === "custom") {
    const from = getStringParam(searchParams, "from", startOfMonth(today));
    const to = getStringParam(searchParams, "to", today);
    const safeFrom = isDateKey(from) ? from : startOfMonth(today);
    const safeTo = isDateKey(to) && to >= safeFrom ? to : today;

    return buildRange(validPeriod, safeFrom, safeTo);
  }

  return buildRange(validPeriod, startOfMonth(today), today);
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return displayDateFormatter
    .format(new Date(Date.UTC(year, month - 1, day, 12)))
    .replace(".", "");
}

function reportHref(
  tab: ReportTab,
  filters: {
    channel: string;
    from: string;
    paymentMethod: string;
    period: string;
    to: string;
  },
) {
  const params = new URLSearchParams();

  params.set("tab", tab);
  params.set("period", filters.period);

  if (filters.period === "custom") {
    params.set("from", filters.from);
    params.set("to", filters.to);
  }

  if (filters.channel !== "all") params.set("channel", filters.channel);
  if (filters.paymentMethod !== "all") params.set("payment_method", filters.paymentMethod);

  return `/app/reportes?${params.toString()}`;
}

function channelLabel(value: string | null | undefined) {
  return channelOptions.find((option) => option.value === value)?.label || "Sin canal";
}

function paymentMethodLabel(value: string | null | undefined) {
  return paymentMethodOptions.find((option) => option.value === value)?.label || "Sin método";
}

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Sin datos";

  return `${value.toLocaleString("es-CO", {
    maximumFractionDigits: 1,
  })}%`;
}

function comparePercent(current: number, previous: number) {
  if (previous <= 0) return null;

  return ((current - previous) / previous) * 100;
}

function trendTone(value: number | null): SemanticTone {
  if (value === null) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "negative";

  return "neutral";
}

function trendLabel(value: number | null) {
  if (value === null) return "Sin datos suficientes";
  if (value === 0) return "Sin cambio";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("es-CO", {
    maximumFractionDigits: 1,
  })}%`;
}

function groupByLabel<T>(
  rows: T[],
  labelFor: (row: T) => string,
  valueFor: (row: T) => number,
) {
  const grouped = rows.reduce<Record<string, number>>((acc, row) => {
    const label = labelFor(row);
    acc[label] = (acc[label] || 0) + valueFor(row);

    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function saleDayKey(sale: SaleRow) {
  return toBogotaDateKey(new Date(sale.sale_date));
}

function sumSales(rows: SaleRow[]) {
  return rows.reduce(
    (summary, sale) => {
      summary.sales += toSafeNumber(sale.total_amount);
      summary.profit += toSafeNumber(sale.gross_profit);
      summary.cost += toSafeNumber(sale.total_cost);
      summary.discount += toSafeNumber(sale.discount_amount);
      summary.pending += toSafeNumber(sale.balance_due);
      return summary;
    },
    { cost: 0, discount: 0, pending: 0, profit: 0, sales: 0 },
  );
}

function getTopItems(
  sales: SaleRow[],
  itemType: "combo" | "product",
  valueFormatter: Intl.NumberFormat,
) {
  const items = sales.flatMap((sale) =>
    (sale.sale_items || []).filter((item) => item.item_type === itemType),
  );
  const grouped = items.reduce<Record<string, { profit: number; quantity: number; total: number }>>(
    (acc, item) => {
      const label = item.item_name || (itemType === "combo" ? "Combo sin nombre" : "Producto sin nombre");
      acc[label] ||= { profit: 0, quantity: 0, total: 0 };
      acc[label].quantity += toSafeNumber(item.quantity);
      acc[label].total += toSafeNumber(item.total_amount);
      acc[label].profit += toSafeNumber(item.gross_profit);

      return acc;
    },
    {},
  );

  return Object.entries(grouped)
    .map(([label, values]) => ({
      detail: `${values.quantity.toLocaleString("es-CO")} vendido${values.quantity === 1 ? "" : "s"} · utilidad ${valueFormatter.format(values.profit)}`,
      label,
      value: valueFormatter.format(values.total),
    }))
    .sort((a, b) => toSafeNumber(b.value) - toSafeNumber(a.value))
    .slice(0, 6);
}

function variantRows(products: ProductReportRow[]) {
  return products.flatMap((product) =>
    (product.product_variants || []).map((variant) => ({
      ...variant,
      productName: product.name,
      productStatus: product.status,
      trackInventory: product.track_inventory !== false,
    })),
  );
}

function comboStockPossible(combo: {
  combo_items?: {
    quantity_in_inventory_unit: number | string | null;
    product_variants?: {
      current_stock: number | string | null;
      products?: { status: string | null; track_inventory: boolean | null } | null;
      status: string | null;
    } | null;
    status: string | null;
  }[] | null;
}) {
  const items = combo.combo_items || [];

  if (!items.length) return 0;

  const stocks = items.map((item) => {
    const variant = item.product_variants;
    const required = Math.max(toSafeNumber(item.quantity_in_inventory_unit), 1);

    if (
      item.status !== "active" ||
      variant?.status !== "active" ||
      variant.products?.status !== "active"
    ) {
      return 0;
    }

    if (variant.products?.track_inventory === false) return Number.POSITIVE_INFINITY;

    return Math.floor(toSafeNumber(variant.current_stock) / required);
  });

  const possible = Math.min(...stocks);

  return Number.isFinite(possible) ? possible : null;
}

function toneForNumber(value: number, inverted = false): SemanticTone {
  if (value === 0) return "neutral";

  return value > 0 ? (inverted ? "negative" : "positive") : inverted ? "positive" : "negative";
}

function ReportMetricCard({
  detail,
  label,
  tone = "neutral",
  trend,
  value,
}: {
  detail?: string;
  label: string;
  tone?: SemanticTone;
  trend?: number | null;
  value: string;
}) {
  return (
    <article className={`rounded-[1.5rem] border border-[#E2E8F0] border-l-4 ${semanticToneStyles[tone].border} bg-white p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-black text-[#475569]">{label}</p>
        {typeof trend !== "undefined" && (
          <SemanticBadge tone={trendTone(trend)}>{trendLabel(trend)}</SemanticBadge>
        )}
      </div>
      <p className="mt-3 text-2xl font-black text-[#0F172A]">{value}</p>
      {detail && <p className="mt-2 text-sm font-bold text-[#64748B]">{detail}</p>}
    </article>
  );
}

function ReportSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black text-[#0F172A]">{title}</h2>
        {description && <p className="mt-2 text-sm leading-6 text-[#475569]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ReportEmptyState({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center">
      <p className="text-lg font-black text-[#0F172A]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#475569]">{text}</p>
    </div>
  );
}

function MiniBarChart({
  formatter,
  items,
}: {
  formatter?: (value: number) => string;
  items: ChartItem[];
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  if (!items.length) {
    return (
      <ReportEmptyState
        title="Aún no hay datos para graficar"
        text="Cuando registres operaciones en este periodo, Margenia mostrará su evolución aquí."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item) => {
        const tone = item.tone || "info";

        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-black text-[#0F172A]">{item.label}</p>
              <p className="shrink-0 text-sm font-bold text-[#475569]">
                {formatter ? formatter(item.value) : item.value.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div
                className={`h-full rounded-full ${semanticToneStyles[tone].meter}`}
                style={{ width: `${Math.max(4, (item.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopItemsTable({
  emptyText,
  items,
}: {
  emptyText: string;
  items: RankItem[];
}) {
  if (!items.length) {
    return <ReportEmptyState title="Sin registros" text={emptyText} />;
  }

  return (
    <div className="divide-y divide-[#E2E8F0] overflow-hidden rounded-[1.5rem] border border-[#E2E8F0]">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="grid gap-2 bg-white p-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#EFF6FF] text-xs font-black text-[#2563EB]">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate font-black text-[#0F172A]">{item.label}</p>
            {item.detail && <p className="mt-1 text-sm font-bold text-[#64748B]">{item.detail}</p>}
          </div>
          <p className={`font-black ${semanticToneStyles[item.tone || "neutral"].text}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function FiltersBar({
  channel,
  paymentMethod,
  range,
}: {
  channel: string;
  paymentMethod: string;
  range: ReportRange;
}) {
  return (
    <form action="/app/reportes" className="rounded-[2rem] border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-5">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">Periodo</span>
          <select name="period" defaultValue={range.period} className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-bold text-[#0F172A]">
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">Desde</span>
          <input name="from" type="date" defaultValue={range.from} className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-bold text-[#0F172A]" />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">Hasta</span>
          <input name="to" type="date" defaultValue={range.to} className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-bold text-[#0F172A]" />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">Canal</span>
          <select name="channel" defaultValue={channel} className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-bold text-[#0F172A]">
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">Pago</span>
          <select name="payment_method" defaultValue={paymentMethod} className="mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-bold text-[#0F172A]">
            {paymentMethodOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-[#64748B]">
          Analizando del {formatDateLabel(range.startDate)} al {formatDateLabel(range.endDate)}.
        </p>
        <button className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110">
          Aplicar filtros
        </button>
      </div>
    </form>
  );
}

function TabsNav({
  activeTab,
  filters,
}: {
  activeTab: ReportTab;
  filters: { channel: string; from: string; paymentMethod: string; period: string; to: string };
}) {
  return (
    <nav className="rounded-[2rem] border border-[#E2E8F0] bg-white p-3 shadow-sm" aria-label="Reportes">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={reportHref(tab.id, filters)}
            className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black transition ${
              activeTab === tab.id
                ? "bg-[#0F172A] text-white"
                : "text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) redirect("/app/onboarding");

  const activeTab = tabs.some((tab) => tab.id === getStringParam(params, "tab"))
    ? (getStringParam(params, "tab") as ReportTab)
    : "resumen";
  const range = getReportRange(params);
  const channel = channelOptions.some((option) => option.value === getStringParam(params, "channel"))
    ? getStringParam(params, "channel", "all")
    : "all";
  const paymentMethod = paymentMethodOptions.some((option) => option.value === getStringParam(params, "payment_method"))
    ? getStringParam(params, "payment_method", "all")
    : "all";
  const formatter = moneyFormatter(business.currency || "COP");

  let salesQuery = supabase
    .from("sales")
    .select(
      "id,sale_code,sale_date,customer_name,channel,payment_status,status,total_amount,paid_amount,balance_due,total_cost,gross_profit,gross_margin_percent,discount_amount,sale_items(item_type,item_name,variant_name,quantity,total_amount,total_cost,gross_profit,variant_id,combo_id),sale_payments(payment_method,amount,paid_at)",
    )
    .eq("business_id", business.id)
    .gte("sale_date", range.startIso)
    .lte("sale_date", range.endIso)
    .order("sale_date", { ascending: false });

  if (channel !== "all") salesQuery = salesQuery.eq("channel", channel);

  const [
    { data: saleRows },
    { data: previousSaleRows },
    { data: productRows },
    { data: comboRows },
    { data: comboStockRows },
    { data: inventoryMovementRows },
    { data: inventoryCountRows },
    { data: cashSessionRows },
    { data: cashMovementRows },
  ] = await Promise.all([
    salesQuery,
    supabase
      .from("sales")
      .select("id,sale_date,status,total_amount,gross_profit,balance_due")
      .eq("business_id", business.id)
      .eq("status", "completed")
      .gte("sale_date", toStartIso(addDays(range.startDate, -range.days)))
      .lt("sale_date", range.startIso),
    supabase
      .from("products")
      .select("id,name,status,track_inventory,product_variants(id,name,status,purchase_cost,sale_price,current_stock,low_stock_threshold)")
      .eq("business_id", business.id),
    supabase
      .from("combos")
      .select("id,name,status,sale_price")
      .eq("business_id", business.id),
    supabase
      .from("combos")
      .select("id,name,status,combo_items(id,status,quantity_in_inventory_unit,product_variants(id,status,current_stock,products(status,track_inventory)))")
      .eq("business_id", business.id),
    supabase
      .from("inventory_movements")
      .select("movement_type,quantity,total_cost,source")
      .eq("business_id", business.id)
      .gte("created_at", range.startIso)
      .lte("created_at", range.endIso),
    supabase
      .from("inventory_counts")
      .select("id,status,inventory_count_items(difference_quantity,total_difference_cost)")
      .eq("business_id", business.id)
      .gte("counted_at", range.startIso)
      .lte("counted_at", range.endIso),
    supabase
      .from("cash_sessions")
      .select("id,status,opened_at,closed_at,expected_cash_amount,counted_cash_amount,expected_total_amount,counted_total_amount,total_difference_amount")
      .eq("business_id", business.id)
      .or(`opened_at.gte.${range.startIso},closed_at.gte.${range.startIso}`)
      .order("opened_at", { ascending: false }),
    supabase
      .from("cash_movements")
      .select("movement_type,direction,payment_method,amount")
      .eq("business_id", business.id)
      .gte("occurred_at", range.startIso)
      .lte("occurred_at", range.endIso),
  ]);

  const rawSales = (saleRows || []) as unknown as SaleRow[];
  const filteredSales = paymentMethod === "all"
    ? rawSales
    : rawSales.filter((sale) =>
        (sale.sale_payments || []).some((payment) => payment.payment_method === paymentMethod),
      );
  const activeSales = filteredSales.filter((sale) => sale.status === "completed");
  const voidedSales = filteredSales.filter((sale) => sale.status === "voided");
  const previousSales = ((previousSaleRows || []) as unknown as SaleRow[]).filter(
    (sale) => sale.status === "completed",
  );
  const salesSummary = sumSales(activeSales);
  const previousSummary = sumSales(previousSales);
  const saleCount = activeSales.length;
  const ticketAverage = saleCount ? salesSummary.sales / saleCount : 0;
  const previousTicketAverage = previousSales.length ? previousSummary.sales / previousSales.length : 0;
  const marginAverage = salesSummary.sales > 0 ? (salesSummary.profit / salesSummary.sales) * 100 : null;
  const products = (productRows || []) as unknown as ProductReportRow[];
  const variants = variantRows(products);
  const activeProducts = products.filter((product) => product.status === "active");
  const archivedProducts = products.filter((product) => product.status === "archived");
  const activeCombos = ((comboRows || []) as unknown as ComboReportRow[]).filter((combo) => combo.status === "active");
  const archivedCombos = ((comboRows || []) as unknown as ComboReportRow[]).filter((combo) => combo.status === "archived");
  const comboStock = ((comboStockRows || []) as unknown as { id: string; name: string; status: string | null; combo_items?: Parameters<typeof comboStockPossible>[0]["combo_items"] }[])
    .map((combo) => ({ name: combo.name, possible: comboStockPossible(combo), status: combo.status }));
  const trackedVariants = variants.filter((variant) => variant.trackInventory && variant.status === "active");
  const lowStockVariants = trackedVariants.filter((variant) => {
    const threshold = toSafeNumber(variant.low_stock_threshold);
    const stock = toSafeNumber(variant.current_stock);

    return threshold > 0 && stock > 0 && stock <= threshold;
  });
  const outOfStockVariants = trackedVariants.filter((variant) => toSafeNumber(variant.current_stock) <= 0);
  const inventoryValue = trackedVariants.reduce(
    (total, variant) => total + toSafeNumber(variant.current_stock) * toSafeNumber(variant.purchase_cost),
    0,
  );
  const productsWithoutCost = variants.filter((variant) => toSafeNumber(variant.purchase_cost) <= 0).length;
  const productsWithoutPrice = variants.filter((variant) => toSafeNumber(variant.sale_price) <= 0).length;
  const lowMarginVariants = variants.filter((variant) => {
    const price = toSafeNumber(variant.sale_price);
    const cost = toSafeNumber(variant.purchase_cost);
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

    return price > 0 && cost > 0 && margin < 20;
  });
  const saleItems = activeSales.flatMap((sale) => sale.sale_items || []);
  const productItems = saleItems.filter((item) => item.item_type === "product");
  const comboItems = saleItems.filter((item) => item.item_type === "combo");
  const productsSold = productItems.reduce((total, item) => total + toSafeNumber(item.quantity), 0);
  const combosSold = comboItems.reduce((total, item) => total + toSafeNumber(item.quantity), 0);
  const salesByDay = groupByLabel(activeSales, (sale) => formatDateLabel(saleDayKey(sale)), (sale) => toSafeNumber(sale.total_amount));
  const daysWithMovement = new Set(activeSales.map(saleDayKey)).size;
  const bestDay = salesByDay[0] || null;
  const highestSale = activeSales.reduce((max, sale) => Math.max(max, toSafeNumber(sale.total_amount)), 0);
  const lowestSale = activeSales.length
    ? activeSales.reduce((min, sale) => Math.min(min, toSafeNumber(sale.total_amount)), Number.POSITIVE_INFINITY)
    : 0;
  const salesByChannel = groupByLabel(activeSales, (sale) => channelLabel(sale.channel), (sale) => toSafeNumber(sale.total_amount));
  const paymentsByMethod = groupByLabel(
    activeSales.flatMap((sale) => sale.sale_payments || []),
    (payment) => paymentMethodLabel(payment.payment_method),
    (payment) => toSafeNumber(payment.amount),
  );
  const paymentStatusCounts = groupByLabel(activeSales, (sale) => {
    if (sale.payment_status === "paid") return "Pagadas";
    if (sale.payment_status === "partial") return "Parciales";
    return "Pendientes";
  }, () => 1);
  const pendingSales = activeSales.filter(
    (sale) => sale.payment_status === "pending" || sale.payment_status === "partial",
  );
  const pendingByCustomer = groupByLabel(
    pendingSales,
    (sale) => sale.customer_name || "Cliente sin nombre",
    (sale) => toSafeNumber(sale.balance_due),
  );
  const inventoryMovements = (inventoryMovementRows || []) as unknown as InventoryMovementRow[];
  const inventoryCounts = (inventoryCountRows || []) as unknown as InventoryCountRow[];
  const inventoryEntries = inventoryMovements.filter((movement) => toSafeNumber(movement.quantity) > 0);
  const inventoryExits = inventoryMovements.filter((movement) => toSafeNumber(movement.quantity) < 0);
  const wasteMovements = inventoryMovements.filter((movement) => movement.movement_type === "waste");
  const adjustmentPositive = inventoryMovements.filter(
    (movement) => movement.movement_type === "adjustment" && toSafeNumber(movement.quantity) > 0,
  );
  const adjustmentNegative = inventoryMovements.filter(
    (movement) => movement.movement_type === "adjustment" && toSafeNumber(movement.quantity) < 0,
  );
  const cashSessions = (cashSessionRows || []) as unknown as CashSessionRow[];
  const cashMovements = (cashMovementRows || []) as unknown as CashMovementRow[];
  const closedCashSessions = cashSessions.filter((session) => session.status === "closed");
  const openCashSessions = cashSessions.filter((session) => session.status === "open");
  const lastClosedCashSession = closedCashSessions[0] || null;
  const totalCashDifference = closedCashSessions.reduce(
    (total, session) => total + toSafeNumber(session.total_difference_amount),
    0,
  );
  const manualIncome = cashMovements
    .filter((movement) => movement.direction === "in")
    .reduce((total, movement) => total + toSafeNumber(movement.amount), 0);
  const manualOutcome = cashMovements
    .filter((movement) => movement.direction === "out")
    .reduce((total, movement) => total + toSafeNumber(movement.amount), 0);
  const ownerWithdrawals = cashMovements
    .filter((movement) => movement.movement_type === "owner_withdrawal")
    .reduce((total, movement) => total + toSafeNumber(movement.amount), 0);
  const supplierPayments = cashMovements
    .filter((movement) => movement.movement_type === "supplier_payment")
    .reduce((total, movement) => total + toSafeNumber(movement.amount), 0);
  const pendingBuckets = pendingSales.reduce(
    (acc, sale) => {
      const age = daysBetween(saleDayKey(sale), toBogotaDateKey(new Date()));
      const balance = toSafeNumber(sale.balance_due);

      if (age <= 1) acc.today += balance;
      else if (age <= 7) acc.week += balance;
      else if (age <= 15) acc.fortnight += balance;
      else acc.older += balance;

      return acc;
    },
    { fortnight: 0, older: 0, today: 0, week: 0 },
  );
  const productSalesByName = groupByLabel(productItems, (item) => item.item_name || "Producto sin nombre", (item) => toSafeNumber(item.total_amount));
  const comboSalesByName = groupByLabel(comboItems, (item) => item.item_name || "Combo sin nombre", (item) => toSafeNumber(item.total_amount));
  const soldProductNames = new Set(productItems.map((item) => item.item_name).filter(Boolean));
  const neverSoldProducts = activeProducts.filter((product) => !soldProductNames.has(product.name));
  const smartAlerts: RankItem[] = [
    ...(lowStockVariants.length ? [{ label: "Hay productos con stock bajo.", tone: "warning" as SemanticTone, value: `${lowStockVariants.length}` }] : []),
    ...(outOfStockVariants.length ? [{ label: "Hay productos agotados.", tone: "negative" as SemanticTone, value: `${outOfStockVariants.length}` }] : []),
    ...(pendingSales.length ? [{ label: "Tienes ventas pendientes por cobrar.", tone: "warning" as SemanticTone, value: formatter.format(salesSummary.pending) }] : []),
    ...(productsWithoutCost ? [{ label: "Hay productos sin costo registrado. La utilidad puede no ser precisa.", tone: "warning" as SemanticTone, value: `${productsWithoutCost}` }] : []),
    ...(closedCashSessions.some((session) => toSafeNumber(session.total_difference_amount) !== 0)
      ? [{ label: "Tu caja tuvo diferencias en cierres recientes.", tone: "negative" as SemanticTone, value: formatter.format(totalCashDifference) }]
      : []),
    ...(comboStock.some((combo) => combo.status === "active" && combo.possible === 0)
      ? [{ label: "Hay combos que no se pueden vender por falta de stock.", tone: "warning" as SemanticTone, value: `${comboStock.filter((combo) => combo.status === "active" && combo.possible === 0).length}` }]
      : []),
  ];

  const filters = {
    channel,
    from: range.from,
    paymentMethod,
    period: range.period,
    to: range.to,
  };

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <div className="w-full max-w-none space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
                Inteligencia del negocio
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
                Reportes
              </h1>
              <p className="mt-3 max-w-4xl text-base leading-7 text-[#475569]">
                Analiza ventas, utilidad, caja, inventario y pagos para tomar mejores decisiones.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <ExcelDownloadButton activeTab={activeTab} />
              <Link
                href="/app/ventas/nueva"
                className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-3 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
              >
                Registrar venta
              </Link>
            </div>
          </div>
        </section>

        <FiltersBar channel={channel} paymentMethod={paymentMethod} range={range} />
        <TabsNav activeTab={activeTab} filters={filters} />

        {activeTab === "resumen" && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard label="Ventas totales" value={formatter.format(salesSummary.sales)} tone="info" trend={comparePercent(salesSummary.sales, previousSummary.sales)} />
              <ReportMetricCard label="Utilidad bruta estimada" value={formatter.format(salesSummary.profit)} tone={toneForNumber(salesSummary.profit)} trend={comparePercent(salesSummary.profit, previousSummary.profit)} />
              <ReportMetricCard label="Margen promedio" value={percent(marginAverage)} tone={marginAverage !== null && marginAverage >= 30 ? "positive" : marginAverage !== null && marginAverage < 15 ? "negative" : "neutral"} />
              <ReportMetricCard label="Ticket promedio" value={formatter.format(ticketAverage)} tone="brand" trend={comparePercent(ticketAverage, previousTicketAverage)} />
              <ReportMetricCard label="Número de ventas" value={saleCount.toLocaleString("es-CO")} tone="info" />
              <ReportMetricCard label="Productos vendidos" value={productsSold.toLocaleString("es-CO")} tone="neutral" />
              <ReportMetricCard label="Combos vendidos" value={combosSold.toLocaleString("es-CO")} tone="neutral" />
              <ReportMetricCard label="Pendiente por cobrar" value={formatter.format(salesSummary.pending)} tone={salesSummary.pending > 0 ? "warning" : "positive"} />
              <ReportMetricCard label="Valor estimado del inventario" value={formatter.format(inventoryValue)} tone="brand" />
              <ReportMetricCard label="Stock bajo" value={lowStockVariants.length.toLocaleString("es-CO")} tone={lowStockVariants.length ? "warning" : "positive"} />
              <ReportMetricCard label="Agotados" value={outOfStockVariants.length.toLocaleString("es-CO")} tone={outOfStockVariants.length ? "negative" : "positive"} />
              <ReportMetricCard label="Diferencia último cierre" value={formatter.format(toSafeNumber(lastClosedCashSession?.total_difference_amount))} tone={toneForNumber(toSafeNumber(lastClosedCashSession?.total_difference_amount), true)} />
            </section>
            <ReportSection title="Comparación del periodo" description="Margenia compara el periodo actual contra un periodo anterior del mismo tamaño.">
              {previousSales.length ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <ReportMetricCard label="Ventas vs anterior" value={trendLabel(comparePercent(salesSummary.sales, previousSummary.sales))} tone={trendTone(comparePercent(salesSummary.sales, previousSummary.sales))} />
                  <ReportMetricCard label="Utilidad vs anterior" value={trendLabel(comparePercent(salesSummary.profit, previousSummary.profit))} tone={trendTone(comparePercent(salesSummary.profit, previousSummary.profit))} />
                  <ReportMetricCard label="Ticket vs anterior" value={trendLabel(comparePercent(ticketAverage, previousTicketAverage))} tone={trendTone(comparePercent(ticketAverage, previousTicketAverage))} />
                </div>
              ) : (
                <ReportEmptyState title="No hay datos suficientes para comparar todavía." text="Cuando tengas ventas en dos periodos comparables, Margenia mostrará la variación aquí." />
              )}
            </ReportSection>
            <SmartAlertsPanel alerts={smartAlerts} />
          </div>
        )}

        {activeTab === "ventas" && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard label="Total vendido" value={formatter.format(salesSummary.sales)} tone="info" />
              <ReportMetricCard label="Número de ventas" value={saleCount.toLocaleString("es-CO")} tone="info" />
              <ReportMetricCard label="Ticket promedio" value={formatter.format(ticketAverage)} tone="brand" />
              <ReportMetricCard label="Venta más alta" value={formatter.format(highestSale)} tone="positive" />
              <ReportMetricCard label="Venta más baja" value={formatter.format(Number.isFinite(lowestSale) ? lowestSale : 0)} tone="neutral" />
              <ReportMetricCard label="Mejor día" value={bestDay ? bestDay.label : "Sin datos"} detail={bestDay ? formatter.format(bestDay.value) : undefined} tone="positive" />
              <ReportMetricCard label="Días con movimiento" value={daysWithMovement.toLocaleString("es-CO")} tone="positive" />
              <ReportMetricCard label="Días sin ventas" value={Math.max(range.days - daysWithMovement, 0).toLocaleString("es-CO")} tone={range.days - daysWithMovement > 0 ? "warning" : "positive"} />
              <ReportMetricCard label="Ventas anuladas" value={voidedSales.length.toLocaleString("es-CO")} tone={voidedSales.length ? "negative" : "neutral"} />
            </section>
            <div className="grid gap-6 xl:grid-cols-2">
              <ReportSection title="Ventas por día">
                <MiniBarChart items={salesByDay.map((item) => ({ ...item, tone: "info" }))} formatter={(value) => formatter.format(value)} />
              </ReportSection>
              <ReportSection title="Ventas por canal">
                <MiniBarChart items={salesByChannel.map((item) => ({ ...item, tone: "brand" }))} formatter={(value) => formatter.format(value)} />
              </ReportSection>
              <ReportSection title="Ventas por método de pago">
                <MiniBarChart items={paymentsByMethod.map((item) => ({ ...item, tone: "positive" }))} formatter={(value) => formatter.format(value)} />
              </ReportSection>
              <ReportSection title="Estado de pago">
                <MiniBarChart items={paymentStatusCounts.map((item) => ({ ...item, tone: item.label === "Pagadas" ? "positive" : item.label === "Pendientes" ? "warning" : "brand" }))} />
              </ReportSection>
            </div>
            <ReportSection title="Últimas ventas">
              <TopItemsTable
                emptyText="Aún no hay ventas en este periodo."
                items={activeSales.slice(0, 8).map((sale) => ({
                  detail: `${formatDateLabel(saleDayKey(sale))} · ${sale.customer_name || "Cliente sin nombre"} · ${channelLabel(sale.channel)}`,
                  label: sale.sale_code || "Venta",
                  tone: sale.payment_status === "paid" ? "positive" : "warning",
                  value: formatter.format(toSafeNumber(sale.total_amount)),
                }))}
              />
            </ReportSection>
          </div>
        )}

        {activeTab === "rentabilidad" && (
          <div className="space-y-6">
            {productsWithoutCost > 0 && (
              <div className="rounded-[1.5rem] border border-[#FDE68A] bg-[#FFFBEB] p-4 text-sm font-bold text-[#92400E]">
                Hay productos sin costo registrado. La utilidad puede no ser precisa.
              </div>
            )}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard label="Utilidad bruta total" value={formatter.format(salesSummary.profit)} tone={toneForNumber(salesSummary.profit)} />
              <ReportMetricCard label="Margen bruto promedio" value={percent(marginAverage)} tone={marginAverage !== null && marginAverage >= 30 ? "positive" : "warning"} />
              <ReportMetricCard label="Costo total vendido" value={formatter.format(salesSummary.cost)} tone="neutral" />
              <ReportMetricCard label="Descuentos aplicados" value={formatter.format(salesSummary.discount)} tone={salesSummary.discount ? "warning" : "neutral"} />
            </section>
            <div className="grid gap-6 xl:grid-cols-2">
              <ReportSection title="Productos con mayor utilidad">
                <TopItemsTable emptyText="Registra ventas para ver productos rentables." items={getTopItems(activeSales, "product", formatter).sort((a, b) => b.detail!.localeCompare(a.detail!))} />
              </ReportSection>
              <ReportSection title="Combos más rentables">
                <TopItemsTable emptyText="Registra ventas de combos para medir rentabilidad." items={getTopItems(activeSales, "combo", formatter)} />
              </ReportSection>
              <ReportSection title="Utilidad por canal">
                <MiniBarChart items={groupByLabel(activeSales, (sale) => channelLabel(sale.channel), (sale) => toSafeNumber(sale.gross_profit)).map((item) => ({ ...item, tone: toneForNumber(item.value) }))} formatter={(value) => formatter.format(value)} />
              </ReportSection>
              <ReportSection title="Utilidad por método de pago">
                <MiniBarChart items={groupByLabel(activeSales.flatMap((sale) => (sale.sale_payments || []).map((payment) => ({ payment, sale }))), (row) => paymentMethodLabel(row.payment.payment_method), (row) => toSafeNumber(row.sale.gross_profit)).map((item) => ({ ...item, tone: toneForNumber(item.value) }))} formatter={(value) => formatter.format(value)} />
              </ReportSection>
            </div>
          </div>
        )}

        {activeTab === "caja" && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard label="Total esperado en caja" value={formatter.format(toSafeNumber(lastClosedCashSession?.expected_total_amount))} tone="info" />
              <ReportMetricCard label="Total contado" value={formatter.format(toSafeNumber(lastClosedCashSession?.counted_total_amount))} tone="brand" />
              <ReportMetricCard label="Diferencia total" value={formatter.format(totalCashDifference)} tone={toneForNumber(totalCashDifference, true)} />
              <ReportMetricCard label="Diferencia en efectivo" value={formatter.format(toSafeNumber(lastClosedCashSession?.counted_cash_amount) - toSafeNumber(lastClosedCashSession?.expected_cash_amount))} tone={toneForNumber(toSafeNumber(lastClosedCashSession?.counted_cash_amount) - toSafeNumber(lastClosedCashSession?.expected_cash_amount), true)} />
              <ReportMetricCard label="Cajas abiertas" value={openCashSessions.length.toLocaleString("es-CO")} tone={openCashSessions.length ? "positive" : "neutral"} />
              <ReportMetricCard label="Cajas cerradas" value={closedCashSessions.length.toLocaleString("es-CO")} tone="neutral" />
              <ReportMetricCard label="Ingresos manuales" value={formatter.format(manualIncome)} tone="positive" />
              <ReportMetricCard label="Salidas manuales" value={formatter.format(manualOutcome)} tone={manualOutcome ? "negative" : "neutral"} />
            </section>
            <div className="grid gap-6 xl:grid-cols-2">
              <ReportSection title="Historial de cierres">
                <TopItemsTable
                  emptyText="Abre y cierra caja para ver reportes operativos."
                  items={closedCashSessions.slice(0, 8).map((session) => ({
                    detail: session.closed_at ? formatDateLabel(toBogotaDateKey(new Date(session.closed_at))) : "Sin fecha de cierre",
                    label: "Cierre de caja",
                    tone: toneForNumber(toSafeNumber(session.total_difference_amount), true),
                    value: formatter.format(toSafeNumber(session.total_difference_amount)),
                  }))}
                />
              </ReportSection>
              <ReportSection title="Movimientos manuales">
                <MiniBarChart
                  items={[
                    { label: "Ingresos manuales", tone: "positive", value: manualIncome },
                    { label: "Salidas manuales", tone: "negative", value: manualOutcome },
                    { label: "Retiros del dueño", tone: "warning", value: ownerWithdrawals },
                    { label: "Pagos a proveedores", tone: "warning", value: supplierPayments },
                  ]}
                  formatter={(value) => formatter.format(value)}
                />
              </ReportSection>
            </div>
          </div>
        )}

        {activeTab === "inventario" && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard label="Valor estimado" value={formatter.format(inventoryValue)} tone="brand" />
              <ReportMetricCard label="Productos en stock" value={(trackedVariants.length - outOfStockVariants.length).toLocaleString("es-CO")} tone="positive" />
              <ReportMetricCard label="Agotados" value={outOfStockVariants.length.toLocaleString("es-CO")} tone={outOfStockVariants.length ? "negative" : "positive"} />
              <ReportMetricCard label="Stock bajo" value={lowStockVariants.length.toLocaleString("es-CO")} tone={lowStockVariants.length ? "warning" : "positive"} />
              <ReportMetricCard label="Sin seguimiento" value={variants.filter((variant) => !variant.trackInventory).length.toLocaleString("es-CO")} tone="neutral" />
              <ReportMetricCard label="Entradas" value={inventoryEntries.length.toLocaleString("es-CO")} tone="positive" />
              <ReportMetricCard label="Salidas manuales" value={inventoryExits.length.toLocaleString("es-CO")} tone={inventoryExits.length ? "negative" : "neutral"} />
              <ReportMetricCard label="Conteos físicos" value={inventoryCounts.length.toLocaleString("es-CO")} tone="info" />
            </section>
            <div className="grid gap-6 xl:grid-cols-2">
              <ReportSection title="Productos con stock bajo">
                <TopItemsTable emptyText="No hay productos con stock bajo." items={lowStockVariants.slice(0, 8).map((variant) => ({ detail: variant.name || "Presentación estándar", label: variant.productName, tone: "warning", value: `${toSafeNumber(variant.current_stock).toLocaleString("es-CO")} disp.` }))} />
              </ReportSection>
              <ReportSection title="Productos agotados">
                <TopItemsTable emptyText="No hay productos agotados." items={outOfStockVariants.slice(0, 8).map((variant) => ({ detail: variant.name || "Presentación estándar", label: variant.productName, tone: "negative", value: "Agotado" }))} />
              </ReportSection>
              <ReportSection title="Movimientos de inventario">
                <MiniBarChart
                  items={[
                    { label: "Entradas", tone: "positive", value: inventoryEntries.length },
                    { label: "Salidas", tone: "negative", value: inventoryExits.length },
                    { label: "Mermas / pérdidas", tone: "negative", value: wasteMovements.length },
                    { label: "Ajustes positivos", tone: "positive", value: adjustmentPositive.length },
                    { label: "Ajustes negativos", tone: "negative", value: adjustmentNegative.length },
                  ]}
                />
              </ReportSection>
              <ReportSection title="Diferencias de conteos físicos">
                <MiniBarChart
                  items={inventoryCounts.map((count, index) => ({
                    label: `Conteo ${index + 1}`,
                    tone: "warning",
                    value: Math.abs((count.inventory_count_items || []).reduce((total, item) => total + toSafeNumber(item.difference_quantity), 0)),
                  }))}
                />
              </ReportSection>
            </div>
          </div>
        )}

        {activeTab === "productos" && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard label="Productos activos" value={activeProducts.length.toLocaleString("es-CO")} tone="positive" />
              <ReportMetricCard label="Productos archivados" value={archivedProducts.length.toLocaleString("es-CO")} tone="neutral" />
              <ReportMetricCard label="Combos activos" value={activeCombos.length.toLocaleString("es-CO")} tone="positive" />
              <ReportMetricCard label="Combos archivados" value={archivedCombos.length.toLocaleString("es-CO")} tone="neutral" />
              <ReportMetricCard label="Sin precio" value={productsWithoutPrice.toLocaleString("es-CO")} tone={productsWithoutPrice ? "warning" : "positive"} />
              <ReportMetricCard label="Sin costo" value={productsWithoutCost.toLocaleString("es-CO")} tone={productsWithoutCost ? "warning" : "positive"} />
              <ReportMetricCard label="Sin stock" value={outOfStockVariants.length.toLocaleString("es-CO")} tone={outOfStockVariants.length ? "negative" : "positive"} />
              <ReportMetricCard label="Margen bajo" value={lowMarginVariants.length.toLocaleString("es-CO")} tone={lowMarginVariants.length ? "negative" : "positive"} />
            </section>
            <div className="grid gap-6 xl:grid-cols-2">
              <ReportSection title="Productos más vendidos">
                <TopItemsTable emptyText="Aún no hay ventas por producto." items={productSalesByName.slice(0, 8).map((item) => ({ label: item.label, tone: "info", value: formatter.format(item.value) }))} />
              </ReportSection>
              <ReportSection title="Combos más vendidos">
                <TopItemsTable emptyText="Aún no hay ventas por combo." items={comboSalesByName.slice(0, 8).map((item) => ({ label: item.label, tone: "brand", value: formatter.format(item.value) }))} />
              </ReportSection>
              <ReportSection title="Productos nunca vendidos">
                <TopItemsTable emptyText="Todos tus productos activos tuvieron movimiento en este periodo." items={neverSoldProducts.slice(0, 8).map((product) => ({ label: product.name, tone: "neutral", value: "Sin ventas" }))} />
              </ReportSection>
              <ReportSection title="Combos bloqueados por stock">
                <TopItemsTable emptyText="No hay combos bloqueados por stock." items={comboStock.filter((combo) => combo.status === "active" && combo.possible === 0).slice(0, 8).map((combo) => ({ label: combo.name, tone: "warning", value: "Sin stock" }))} />
              </ReportSection>
            </div>
          </div>
        )}

        {activeTab === "pagos" && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard label="Total pendiente" value={formatter.format(salesSummary.pending)} tone={salesSummary.pending ? "warning" : "positive"} />
              <ReportMetricCard label="Ventas pendientes" value={pendingSales.filter((sale) => sale.payment_status === "pending").length.toLocaleString("es-CO")} tone="warning" />
              <ReportMetricCard label="Ventas parciales" value={pendingSales.filter((sale) => sale.payment_status === "partial").length.toLocaleString("es-CO")} tone="brand" />
              <ReportMetricCard label="Promedio de deuda" value={formatter.format(pendingSales.length ? salesSummary.pending / pendingSales.length : 0)} tone="neutral" />
            </section>
            <div className="grid gap-6 xl:grid-cols-2">
              <ReportSection title="Ventas pendientes por cliente">
                <TopItemsTable emptyText="No tienes pagos pendientes en este periodo." items={pendingByCustomer.slice(0, 8).map((item) => ({ label: item.label, tone: "warning", value: formatter.format(item.value) }))} />
              </ReportSection>
              <ReportSection title="Ventas pendientes por canal">
                <MiniBarChart items={groupByLabel(pendingSales, (sale) => channelLabel(sale.channel), (sale) => toSafeNumber(sale.balance_due)).map((item) => ({ ...item, tone: "warning" }))} formatter={(value) => formatter.format(value)} />
              </ReportSection>
              <ReportSection title="Deuda por antigüedad">
                <MiniBarChart
                  items={[
                    { label: "Hoy", tone: "info", value: pendingBuckets.today },
                    { label: "1 a 7 días", tone: "warning", value: pendingBuckets.week },
                    { label: "8 a 15 días", tone: "warning", value: pendingBuckets.fortnight },
                    { label: "Más de 15 días", tone: "negative", value: pendingBuckets.older },
                  ]}
                  formatter={(value) => formatter.format(value)}
                />
              </ReportSection>
              <ReportSection title="Ventas pendientes recientes">
                <TopItemsTable
                  emptyText="No tienes pagos pendientes en este periodo."
                  items={pendingSales.slice(0, 8).map((sale) => ({
                    detail: `${formatDateLabel(saleDayKey(sale))} · ${channelLabel(sale.channel)}`,
                    label: sale.customer_name || "Cliente sin nombre",
                    tone: sale.payment_status === "partial" ? "brand" : "warning",
                    value: formatter.format(toSafeNumber(sale.balance_due)),
                  }))}
                />
              </ReportSection>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function SmartAlertsPanel({ alerts }: { alerts: RankItem[] }) {
  return (
    <ReportSection
      title="Alertas inteligentes"
      description="Se generan solo con datos reales de tu negocio. No usamos IA externa ni recomendaciones inventadas."
    >
      <TopItemsTable
        emptyText="No hay alertas relevantes para este periodo."
        items={alerts.length ? alerts : [{ label: "Tu operación se ve estable en este periodo.", tone: "positive", value: "OK" }]}
      />
    </ReportSection>
  );
}
