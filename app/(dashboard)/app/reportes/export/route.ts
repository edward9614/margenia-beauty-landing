import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { toSafeNumber } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

type CellPrimitive = Date | number | string | null;
type SheetRow = Record<string, CellPrimitive>;

type SheetColumn = {
  header: string;
  key: string;
  numFmt?: string;
  width?: number;
};

type SaleItemRow = {
  combo_id: string | null;
  gross_margin_percent: number | string | null;
  gross_profit: number | string | null;
  item_name: string | null;
  item_type: string | null;
  quantity: number | string | null;
  quantity_unit: string | null;
  sku: string | null;
  total_amount: number | string | null;
  total_cost: number | string | null;
  unit_price: number | string | null;
  variant_id: string | null;
  variant_name: string | null;
};

type SalePaymentRow = {
  amount: number | string | null;
  paid_at: string | null;
  payment_method: string | null;
  reference: string | null;
};

type SaleRow = {
  balance_due: number | string | null;
  channel: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  discount_amount: number | string | null;
  gross_margin_percent: number | string | null;
  gross_profit: number | string | null;
  paid_amount: number | string | null;
  payment_status: string | null;
  sale_code: string | null;
  sale_date: string;
  sale_items?: SaleItemRow[] | null;
  sale_payments?: SalePaymentRow[] | null;
  shipping_amount: number | string | null;
  status: string | null;
  subtotal_amount: number | string | null;
  tax_amount: number | string | null;
  total_amount: number | string | null;
  total_cost: number | string | null;
};

type ProductVariantRow = {
  current_stock: number | string | null;
  default_sale_unit: string | null;
  id: string;
  inventory_location: string | null;
  inventory_unit: string | null;
  low_stock_threshold: number | string | null;
  minimum_stock: number | string | null;
  name: string | null;
  purchase_cost: number | string | null;
  sale_price: number | string | null;
  sku: string | null;
  status: string | null;
};

type ProductRow = {
  brand: string | null;
  category: string | null;
  id: string;
  name: string;
  product_variants?: ProductVariantRow[] | null;
  status: string | null;
  track_inventory: boolean | null;
};

type ComboRow = {
  category: string | null;
  combo_items?: {
    product_variants?: {
      current_stock: number | string | null;
      products?: { status: string | null; track_inventory: boolean | null } | null;
      status: string | null;
    } | null;
    quantity_in_inventory_unit: number | string | null;
    status: string | null;
  }[] | null;
  name: string;
  sale_price: number | string | null;
  status: string | null;
};

type InventoryMovementRow = {
  created_at: string | null;
  movement_code: string | null;
  movement_type: string | null;
  product_variants?: {
    name: string | null;
    sku: string | null;
    products?: { name: string | null } | null;
  } | null;
  quantity: number | string | null;
  reason: string | null;
  source: string | null;
  stock_unit: string | null;
  total_cost: number | string | null;
  unit_cost: number | string | null;
};

type InventoryCountRow = {
  count_code: string | null;
  counted_at: string | null;
  inventory_count_items?: {
    counted_stock: number | string | null;
    difference_quantity: number | string | null;
    product_name: string | null;
    stock_unit: string | null;
    system_stock: number | string | null;
    total_difference_cost: number | string | null;
    variant_name: string | null;
  }[] | null;
  status: string | null;
};

type CashSessionRow = {
  closed_at: string | null;
  counted_cash_amount: number | string | null;
  counted_total_amount: number | string | null;
  expected_cash_amount: number | string | null;
  expected_total_amount: number | string | null;
  opened_at: string | null;
  opening_cash_amount: number | string | null;
  session_code: string | null;
  status: string | null;
  total_difference_amount: number | string | null;
};

type CashMovementRow = {
  amount: number | string | null;
  category: string | null;
  description: string | null;
  direction: string | null;
  movement_code: string | null;
  movement_type: string | null;
  occurred_at: string | null;
  payment_method: string | null;
};

type CashCountRow = {
  counted_amount: number | string | null;
  created_at: string | null;
  difference_amount: number | string | null;
  expected_amount: number | string | null;
  payment_method: string | null;
};

type ReportData = {
  activeSales: SaleRow[];
  business: { currency: string | null; id: string; name: string | null };
  cashCounts: CashCountRow[];
  cashMovements: CashMovementRow[];
  cashSessions: CashSessionRow[];
  channel: string;
  combos: ComboRow[];
  inventoryCounts: InventoryCountRow[];
  inventoryMovements: InventoryMovementRow[];
  paymentMethod: string;
  products: ProductRow[];
  range: ReportRange;
  sales: SaleRow[];
  tab: ReportTab;
};

type ReportRange = {
  days: number;
  endDate: string;
  endIso: string;
  period: ReportPeriod;
  startDate: string;
  startIso: string;
};

const tabs: ReportTab[] = [
  "resumen",
  "ventas",
  "rentabilidad",
  "caja",
  "inventario",
  "productos",
  "pagos",
];

const periodOptions: ReportPeriod[] = [
  "today",
  "last_7_days",
  "current_month",
  "previous_month",
  "last_30_days",
  "custom",
];

const channelLabels: Record<string, string> = {
  all: "Todos",
  feria: "Feria",
  instagram: "Instagram",
  local: "Local",
  online_store: "Tienda online",
  otro: "Otro",
  whatsapp: "WhatsApp",
};

const paymentMethodLabels: Record<string, string> = {
  all: "Todos",
  card: "Tarjeta",
  cash: "Efectivo",
  daviplata: "Daviplata",
  nequi: "Nequi",
  other: "Otro",
  transfer: "Transferencia",
};

const paymentStatusLabels: Record<string, string> = {
  paid: "Pagada",
  partial: "Parcial",
  pending: "Pendiente",
};

const saleStatusLabels: Record<string, string> = {
  completed: "Completada",
  voided: "Anulada",
};

const moneyFormat = '"$"#,##0';
const percentFormat = '0.0"%"';
const numberFormat = "#,##0.00";
const dateTimeFormat = "yyyy-mm-dd hh:mm";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Bogota",
  year: "numeric",
});

function toBogotaDateKey(value: Date) {
  const parts = dateFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
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

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
    period,
    startDate,
    startIso: toStartIso(startDate),
  };
}

function getReportRange(searchParams: URLSearchParams) {
  const rawPeriod = searchParams.get("period") || "current_month";
  const period = periodOptions.includes(rawPeriod as ReportPeriod)
    ? (rawPeriod as ReportPeriod)
    : "current_month";
  const today = toBogotaDateKey(new Date());

  if (period === "today") return buildRange(period, today, today);
  if (period === "last_7_days") return buildRange(period, addDays(today, -6), today);
  if (period === "last_30_days") return buildRange(period, addDays(today, -29), today);
  if (period === "previous_month") {
    const previous = previousMonthRange(today);
    return buildRange(period, previous.startDate, previous.endDate);
  }

  if (period === "custom") {
    const rawFrom = searchParams.get("from") || startOfMonth(today);
    const rawTo = searchParams.get("to") || today;
    const from = isDateKey(rawFrom) ? rawFrom : startOfMonth(today);
    const to = isDateKey(rawTo) && rawTo >= from ? rawTo : today;

    return buildRange(period, from, to);
  }

  return buildRange(period, startOfMonth(today), today);
}

function labelFromMap(map: Record<string, string>, value: string | null | undefined, fallback: string) {
  return value ? map[value] || fallback : fallback;
}

function asDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function saleDayKey(sale: SaleRow) {
  return toBogotaDateKey(new Date(sale.sale_date));
}

function margin(total: number, profit: number) {
  return total > 0 ? (profit / total) * 100 : 0;
}

function sumSales(rows: SaleRow[]) {
  return rows.reduce(
    (summary, sale) => {
      summary.sales += toSafeNumber(sale.total_amount);
      summary.profit += toSafeNumber(sale.gross_profit);
      summary.cost += toSafeNumber(sale.total_cost);
      summary.pending += toSafeNumber(sale.balance_due);
      return summary;
    },
    { cost: 0, pending: 0, profit: 0, sales: 0 },
  );
}

function groupBy<T>(rows: T[], labelFor: (row: T) => string, valueFor: (row: T) => number) {
  const grouped = rows.reduce<Record<string, number>>((acc, row) => {
    const label = labelFor(row);
    acc[label] = (acc[label] || 0) + valueFor(row);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function flattenVariants(products: ProductRow[]) {
  return products.flatMap((product) =>
    (product.product_variants || []).map((variant) => ({
      ...variant,
      brand: product.brand,
      category: product.category,
      productName: product.name,
      productStatus: product.status,
      trackInventory: product.track_inventory !== false,
    })),
  );
}

function comboStockPossible(combo: ComboRow) {
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

function hasDataForTab(data: ReportData) {
  if (data.tab === "resumen") {
    return (
      data.sales.length > 0 ||
      data.products.length > 0 ||
      data.combos.length > 0 ||
      data.cashSessions.length > 0 ||
      data.inventoryMovements.length > 0
    );
  }
  if (data.tab === "ventas" || data.tab === "rentabilidad") return data.sales.length > 0;
  if (data.tab === "caja") return data.cashSessions.length > 0 || data.cashMovements.length > 0;
  if (data.tab === "inventario") return data.products.length > 0 || data.inventoryMovements.length > 0;
  if (data.tab === "productos") return data.products.length > 0 || data.combos.length > 0;
  if (data.tab === "pagos") return data.activeSales.some((sale) => toSafeNumber(sale.balance_due) > 0);

  return false;
}

function makeFilename(tab: ReportTab, range: ReportRange) {
  return `margenia-${tab}-${range.startDate}-${range.endDate}.xlsx`;
}

function addTableSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: SheetColumn[],
  rows: SheetRow[],
) {
  const worksheet = workbook.addWorksheet(name.slice(0, 31));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    style: column.numFmt ? { numFmt: column.numFmt } : undefined,
    width: column.width || Math.min(Math.max(column.header.length + 6, 14), 32),
  }));
  worksheet.addRows(rows);

  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    fgColor: { argb: "FF0F172A" },
    pattern: "solid",
    type: "pattern",
  };
  header.alignment = { vertical: "middle" };

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        bottom: { color: { argb: "FFE2E8F0" }, style: "thin" },
      };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });

  columns.forEach((column, index) => {
    const worksheetColumn = worksheet.getColumn(index + 1);
    const maxLength = rows.reduce((max, row) => {
      const value = row[column.key];
      if (value instanceof Date) return Math.max(max, 18);
      return Math.max(max, String(value ?? "").length + 4);
    }, column.header.length + 4);
    worksheetColumn.width = Math.min(Math.max(column.width || maxLength, 12), 36);
  });

  return worksheet;
}

function addMetadataSheet(workbook: ExcelJS.Workbook, data: ReportData) {
  const reportLabel = {
    caja: "Caja",
    inventario: "Inventario",
    pagos: "Pagos pendientes",
    productos: "Productos y combos",
    rentabilidad: "Rentabilidad",
    resumen: "Resumen",
    ventas: "Ventas",
  }[data.tab];

  addTableSheet(
    workbook,
    "Información",
    [
      { header: "Campo", key: "field", width: 28 },
      { header: "Valor", key: "value", width: 44 },
    ],
    [
      { field: "Negocio", value: data.business.name || "Tu negocio" },
      { field: "Reporte", value: reportLabel },
      { field: "Periodo", value: `${data.range.startDate} a ${data.range.endDate}` },
      { field: "Canal", value: labelFromMap(channelLabels, data.channel, "Todos") },
      { field: "Método de pago", value: labelFromMap(paymentMethodLabels, data.paymentMethod, "Todos") },
      { field: "Fecha de descarga", value: new Date() },
    ],
  );
}

function buildSummarySheets(workbook: ExcelJS.Workbook, data: ReportData) {
  const variants = flattenVariants(data.products);
  const trackedVariants = variants.filter((variant) => variant.trackInventory && variant.status === "active");
  const lowStock = trackedVariants.filter((variant) => {
    const threshold = toSafeNumber(variant.low_stock_threshold || variant.minimum_stock);
    const stock = toSafeNumber(variant.current_stock);
    return threshold > 0 && stock > 0 && stock <= threshold;
  });
  const outOfStock = trackedVariants.filter((variant) => toSafeNumber(variant.current_stock) <= 0);
  const inventoryValue = trackedVariants.reduce(
    (total, variant) => total + toSafeNumber(variant.current_stock) * toSafeNumber(variant.purchase_cost),
    0,
  );
  const summary = sumSales(data.activeSales);
  const ticketAverage = data.activeSales.length ? summary.sales / data.activeSales.length : 0;
  const pendingSales = data.activeSales.filter((sale) => toSafeNumber(sale.balance_due) > 0);
  const closedCash = data.cashSessions.filter((session) => session.status === "closed");
  const cashDifference = closedCash.reduce(
    (total, session) => total + toSafeNumber(session.total_difference_amount),
    0,
  );
  const alerts = [
    ...(lowStock.length ? [{ alert: "Productos con stock bajo", value: lowStock.length }] : []),
    ...(outOfStock.length ? [{ alert: "Productos agotados", value: outOfStock.length }] : []),
    ...(pendingSales.length ? [{ alert: "Pagos pendientes", value: summary.pending }] : []),
    ...(variants.some((variant) => toSafeNumber(variant.purchase_cost) <= 0)
      ? [{ alert: "Productos sin costo registrado", value: variants.filter((variant) => toSafeNumber(variant.purchase_cost) <= 0).length }]
      : []),
    ...(cashDifference !== 0 ? [{ alert: "Diferencias en caja", value: cashDifference }] : []),
  ];

  addTableSheet(
    workbook,
    "Resumen general",
    [
      { header: "Métrica", key: "metric", width: 34 },
      { header: "Valor", key: "value", numFmt: moneyFormat, width: 20 },
    ],
    [
      { metric: "Ventas totales", value: summary.sales },
      { metric: "Utilidad bruta estimada", value: summary.profit },
      { metric: "Margen promedio %", value: margin(summary.sales, summary.profit) },
      { metric: "Ticket promedio", value: ticketAverage },
      { metric: "Pagos pendientes", value: summary.pending },
      { metric: "Valor estimado de inventario", value: inventoryValue },
      { metric: "Diferencia total de caja", value: cashDifference },
    ],
  );
  addTableSheet(
    workbook,
    "KPIs",
    [
      { header: "KPI", key: "kpi", width: 32 },
      { header: "Valor", key: "value", width: 20 },
    ],
    [
      { kpi: "Número de ventas", value: data.activeSales.length },
      { kpi: "Productos activos", value: data.products.filter((product) => product.status === "active").length },
      { kpi: "Combos activos", value: data.combos.filter((combo) => combo.status === "active").length },
      { kpi: "Stock bajo", value: lowStock.length },
      { kpi: "Agotados", value: outOfStock.length },
      { kpi: "Ventas pendientes/parciales", value: pendingSales.length },
    ],
  );
  addTableSheet(
    workbook,
    "Alertas",
    [
      { header: "Alerta", key: "alert", width: 44 },
      { header: "Valor", key: "value", width: 18 },
    ],
    alerts.length ? alerts : [{ alert: "Sin alertas relevantes para este periodo", value: 0 }],
  );
}

function buildSalesSheets(workbook: ExcelJS.Workbook, data: ReportData) {
  const saleItems = data.activeSales.flatMap((sale) => sale.sale_items || []);
  const productItems = saleItems.filter((item) => item.item_type === "product");
  const comboItems = saleItems.filter((item) => item.item_type === "combo");
  const summary = sumSales(data.activeSales);

  addTableSheet(
    workbook,
    "Resumen de ventas",
    [
      { header: "Métrica", key: "metric", width: 30 },
      { header: "Valor", key: "value", numFmt: moneyFormat, width: 18 },
    ],
    [
      { metric: "Total vendido", value: summary.sales },
      { metric: "Número de ventas", value: data.activeSales.length },
      { metric: "Ticket promedio", value: data.activeSales.length ? summary.sales / data.activeSales.length : 0 },
      { metric: "Utilidad bruta", value: summary.profit },
      { metric: "Pendiente por cobrar", value: summary.pending },
    ],
  );
  addTableSheet(
    workbook,
    "Ventas detalladas",
    [
      { header: "Fecha", key: "date", numFmt: dateTimeFormat, width: 20 },
      { header: "Código de venta", key: "code", width: 18 },
      { header: "Cliente", key: "customer", width: 24 },
      { header: "Canal", key: "channel", width: 16 },
      { header: "Estado de pago", key: "paymentStatus", width: 18 },
      { header: "Estado de venta", key: "status", width: 18 },
      { header: "Subtotal", key: "subtotal", numFmt: moneyFormat },
      { header: "Descuento", key: "discount", numFmt: moneyFormat },
      { header: "Impuestos", key: "tax", numFmt: moneyFormat },
      { header: "Envío", key: "shipping", numFmt: moneyFormat },
      { header: "Total", key: "total", numFmt: moneyFormat },
      { header: "Pagado", key: "paid", numFmt: moneyFormat },
      { header: "Pendiente", key: "pending", numFmt: moneyFormat },
      { header: "Costo", key: "cost", numFmt: moneyFormat },
      { header: "Utilidad", key: "profit", numFmt: moneyFormat },
      { header: "Margen", key: "margin", numFmt: percentFormat },
    ],
    data.sales.map((sale) => ({
      channel: labelFromMap(channelLabels, sale.channel, "Sin canal"),
      code: sale.sale_code || "Venta",
      cost: toSafeNumber(sale.total_cost),
      customer: sale.customer_name || "Cliente sin nombre",
      date: asDate(sale.sale_date),
      discount: toSafeNumber(sale.discount_amount),
      margin: toSafeNumber(sale.gross_margin_percent),
      paid: toSafeNumber(sale.paid_amount),
      paymentStatus: labelFromMap(paymentStatusLabels, sale.payment_status, "Sin estado"),
      pending: toSafeNumber(sale.balance_due),
      profit: toSafeNumber(sale.gross_profit),
      shipping: toSafeNumber(sale.shipping_amount),
      status: labelFromMap(saleStatusLabels, sale.status, "Sin estado"),
      subtotal: toSafeNumber(sale.subtotal_amount),
      tax: toSafeNumber(sale.tax_amount),
      total: toSafeNumber(sale.total_amount),
    })),
  );
  addTableSheet(workbook, "Productos vendidos", itemColumns(), itemRows(productItems));
  addTableSheet(workbook, "Combos vendidos", itemColumns(), itemRows(comboItems));
  addGroupedSheet(workbook, "Ventas por método de pago", groupBy(data.activeSales.flatMap((sale) => sale.sale_payments || []), (payment) => labelFromMap(paymentMethodLabels, payment.payment_method, "Sin método"), (payment) => toSafeNumber(payment.amount)));
  addGroupedSheet(workbook, "Ventas por canal", groupBy(data.activeSales, (sale) => labelFromMap(channelLabels, sale.channel, "Sin canal"), (sale) => toSafeNumber(sale.total_amount)));
}

function itemColumns(): SheetColumn[] {
  return [
    { header: "Producto / combo", key: "name", width: 28 },
    { header: "Variante", key: "variant", width: 22 },
    { header: "SKU", key: "sku", width: 18 },
    { header: "Cantidad", key: "quantity", numFmt: numberFormat },
    { header: "Unidad", key: "unit", width: 12 },
    { header: "Precio unitario", key: "unitPrice", numFmt: moneyFormat },
    { header: "Total vendido", key: "total", numFmt: moneyFormat },
    { header: "Costo total", key: "cost", numFmt: moneyFormat },
    { header: "Utilidad", key: "profit", numFmt: moneyFormat },
    { header: "Margen %", key: "margin", numFmt: percentFormat },
  ];
}

function itemRows(items: SaleItemRow[]): SheetRow[] {
  return items.map((item) => ({
    cost: toSafeNumber(item.total_cost),
    margin: toSafeNumber(item.gross_margin_percent),
    name: item.item_name || "Sin nombre",
    profit: toSafeNumber(item.gross_profit),
    quantity: toSafeNumber(item.quantity),
    sku: item.sku || "",
    total: toSafeNumber(item.total_amount),
    unit: item.quantity_unit || "",
    unitPrice: toSafeNumber(item.unit_price),
    variant: item.variant_name || "",
  }));
}

function addGroupedSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: { label: string; value: number }[],
) {
  addTableSheet(
    workbook,
    name,
    [
      { header: "Grupo", key: "label", width: 28 },
      { header: "Valor", key: "value", numFmt: moneyFormat, width: 18 },
    ],
    rows,
  );
}

function buildProfitSheets(workbook: ExcelJS.Workbook, data: ReportData) {
  const saleItems = data.activeSales.flatMap((sale) => sale.sale_items || []);
  const productItems = saleItems.filter((item) => item.item_type === "product");
  const comboItems = saleItems.filter((item) => item.item_type === "combo");
  const productsWithoutCost = flattenVariants(data.products).filter((variant) => toSafeNumber(variant.purchase_cost) <= 0);
  const lowProfitSales = data.activeSales.filter((sale) => margin(toSafeNumber(sale.total_amount), toSafeNumber(sale.gross_profit)) < 15);
  const summary = sumSales(data.activeSales);

  addTableSheet(
    workbook,
    "Resumen rentabilidad",
    [
      { header: "Métrica", key: "metric", width: 32 },
      { header: "Valor", key: "value", numFmt: moneyFormat, width: 18 },
    ],
    [
      { metric: "Total vendido", value: summary.sales },
      { metric: "Costo total vendido", value: summary.cost },
      { metric: "Utilidad bruta", value: summary.profit },
      { metric: "Margen bruto %", value: margin(summary.sales, summary.profit) },
      { metric: "Productos sin costo", value: productsWithoutCost.length },
    ],
  );
  addProfitByItemSheet(workbook, "Rentabilidad por producto", productItems);
  addProfitByItemSheet(workbook, "Rentabilidad por combo", comboItems);
  addTableSheet(
    workbook,
    "Ventas con baja utilidad",
    [
      { header: "Fecha", key: "date", numFmt: dateTimeFormat },
      { header: "Código", key: "code" },
      { header: "Cliente", key: "customer", width: 24 },
      { header: "Total", key: "total", numFmt: moneyFormat },
      { header: "Costo", key: "cost", numFmt: moneyFormat },
      { header: "Utilidad", key: "profit", numFmt: moneyFormat },
      { header: "Margen %", key: "margin", numFmt: percentFormat },
      { header: "Alerta", key: "alert", width: 28 },
    ],
    lowProfitSales.map((sale) => ({
      alert: toSafeNumber(sale.gross_profit) <= 0 ? "Utilidad negativa o cero" : "Margen bajo",
      code: sale.sale_code || "Venta",
      cost: toSafeNumber(sale.total_cost),
      customer: sale.customer_name || "Cliente sin nombre",
      date: asDate(sale.sale_date),
      margin: margin(toSafeNumber(sale.total_amount), toSafeNumber(sale.gross_profit)),
      profit: toSafeNumber(sale.gross_profit),
      total: toSafeNumber(sale.total_amount),
    })),
  );
  addTableSheet(
    workbook,
    "Productos sin costo",
    productStockColumns(),
    productsWithoutCost.map(variantStockRow),
  );
}

function addProfitByItemSheet(workbook: ExcelJS.Workbook, name: string, items: SaleItemRow[]) {
  const rows = Object.entries(
    items.reduce<Record<string, { cost: number; profit: number; quantity: number; total: number }>>((acc, item) => {
      const label = item.item_name || "Sin nombre";
      acc[label] ||= { cost: 0, profit: 0, quantity: 0, total: 0 };
      acc[label].quantity += toSafeNumber(item.quantity);
      acc[label].total += toSafeNumber(item.total_amount);
      acc[label].cost += toSafeNumber(item.total_cost);
      acc[label].profit += toSafeNumber(item.gross_profit);
      return acc;
    }, {}),
  )
    .map(([label, values]) => ({
      alert: values.profit <= 0 ? "Revisar utilidad" : margin(values.total, values.profit) < 20 ? "Margen bajo" : "Saludable",
      cost: values.cost,
      label,
      margin: margin(values.total, values.profit),
      profit: values.profit,
      quantity: values.quantity,
      total: values.total,
    }))
    .sort((a, b) => b.profit - a.profit);

  addTableSheet(
    workbook,
    name,
    [
      { header: "Producto / combo", key: "label", width: 30 },
      { header: "Cantidad vendida", key: "quantity", numFmt: numberFormat },
      { header: "Total vendido", key: "total", numFmt: moneyFormat },
      { header: "Costo total", key: "cost", numFmt: moneyFormat },
      { header: "Utilidad bruta", key: "profit", numFmt: moneyFormat },
      { header: "Margen %", key: "margin", numFmt: percentFormat },
      { header: "Alerta", key: "alert", width: 20 },
    ],
    rows,
  );
}

function buildCashSheets(workbook: ExcelJS.Workbook, data: ReportData) {
  const closedSessions = data.cashSessions.filter((session) => session.status === "closed");
  const totalDifference = closedSessions.reduce((total, session) => total + toSafeNumber(session.total_difference_amount), 0);

  addTableSheet(
    workbook,
    "Resumen caja",
    [
      { header: "Métrica", key: "metric", width: 32 },
      { header: "Valor", key: "value", numFmt: moneyFormat },
    ],
    [
      { metric: "Sesiones abiertas", value: data.cashSessions.filter((session) => session.status === "open").length },
      { metric: "Sesiones cerradas", value: closedSessions.length },
      { metric: "Diferencia total", value: totalDifference },
      { metric: "Ingresos manuales", value: data.cashMovements.filter((movement) => movement.direction === "in").reduce((total, movement) => total + toSafeNumber(movement.amount), 0) },
      { metric: "Egresos manuales", value: data.cashMovements.filter((movement) => movement.direction === "out").reduce((total, movement) => total + toSafeNumber(movement.amount), 0) },
    ],
  );
  addTableSheet(
    workbook,
    "Sesiones de caja",
    [
      { header: "Código", key: "code", width: 18 },
      { header: "Apertura", key: "openedAt", numFmt: dateTimeFormat },
      { header: "Cierre", key: "closedAt", numFmt: dateTimeFormat },
      { header: "Estado", key: "status" },
      { header: "Saldo inicial", key: "opening", numFmt: moneyFormat },
      { header: "Esperado", key: "expected", numFmt: moneyFormat },
      { header: "Contado", key: "counted", numFmt: moneyFormat },
      { header: "Diferencia", key: "difference", numFmt: moneyFormat },
      { header: "Usuario", key: "user" },
    ],
    data.cashSessions.map((session) => ({
      closedAt: asDate(session.closed_at || undefined),
      code: session.session_code || "Sesión",
      counted: toSafeNumber(session.counted_total_amount),
      difference: toSafeNumber(session.total_difference_amount),
      expected: toSafeNumber(session.expected_total_amount),
      openedAt: asDate(session.opened_at || undefined),
      opening: toSafeNumber(session.opening_cash_amount),
      status: session.status || "Sin estado",
      user: "",
    })),
  );
  addTableSheet(
    workbook,
    "Movimientos de caja",
    [
      { header: "Fecha", key: "date", numFmt: dateTimeFormat },
      { header: "Código", key: "code" },
      { header: "Dirección", key: "direction" },
      { header: "Tipo", key: "type" },
      { header: "Método", key: "method" },
      { header: "Categoría", key: "category" },
      { header: "Descripción", key: "description", width: 34 },
      { header: "Monto", key: "amount", numFmt: moneyFormat },
    ],
    data.cashMovements.map((movement) => ({
      amount: toSafeNumber(movement.amount),
      category: movement.category || "",
      code: movement.movement_code || "",
      date: asDate(movement.occurred_at || undefined),
      description: movement.description || "",
      direction: movement.direction === "in" ? "Ingreso" : "Egreso",
      method: labelFromMap(paymentMethodLabels, movement.payment_method, "Sin método"),
      type: movement.movement_type || "",
    })),
  );
  addTableSheet(
    workbook,
    "Conteo por método de pago",
    [
      { header: "Método", key: "method" },
      { header: "Esperado", key: "expected", numFmt: moneyFormat },
      { header: "Contado", key: "counted", numFmt: moneyFormat },
      { header: "Diferencia", key: "difference", numFmt: moneyFormat },
    ],
    data.cashCounts.map((count) => ({
      counted: toSafeNumber(count.counted_amount),
      difference: toSafeNumber(count.difference_amount),
      expected: toSafeNumber(count.expected_amount),
      method: labelFromMap(paymentMethodLabels, count.payment_method, "Sin método"),
    })),
  );
  addTableSheet(
    workbook,
    "Diferencias",
    [
      { header: "Código", key: "code" },
      { header: "Fecha de cierre", key: "closedAt", numFmt: dateTimeFormat },
      { header: "Diferencia", key: "difference", numFmt: moneyFormat },
      { header: "Estado", key: "status" },
    ],
    closedSessions
      .filter((session) => toSafeNumber(session.total_difference_amount) !== 0)
      .map((session) => ({
        closedAt: asDate(session.closed_at || undefined),
        code: session.session_code || "Sesión",
        difference: toSafeNumber(session.total_difference_amount),
        status: toSafeNumber(session.total_difference_amount) > 0 ? "Sobra" : "Falta",
      })),
  );
}

function productStockColumns(): SheetColumn[] {
  return [
    { header: "Producto", key: "product", width: 28 },
    { header: "Variante", key: "variant", width: 22 },
    { header: "SKU", key: "sku" },
    { header: "Stock actual", key: "stock", numFmt: numberFormat },
    { header: "Unidad", key: "unit" },
    { header: "Stock mínimo", key: "minimum", numFmt: numberFormat },
    { header: "Estado", key: "state" },
    { header: "Costo unitario", key: "cost", numFmt: moneyFormat },
    { header: "Valor estimado", key: "value", numFmt: moneyFormat },
    { header: "Ubicación", key: "location", width: 20 },
  ];
}

function variantStockRow(variant: ReturnType<typeof flattenVariants>[number]): SheetRow {
  const stock = toSafeNumber(variant.current_stock);
  const threshold = toSafeNumber(variant.low_stock_threshold || variant.minimum_stock);
  const unitCost = toSafeNumber(variant.purchase_cost);

  return {
    cost: unitCost,
    location: variant.inventory_location || "",
    minimum: threshold,
    product: variant.productName,
    sku: variant.sku || "",
    state: stock <= 0 ? "Agotado" : threshold > 0 && stock <= threshold ? "Stock bajo" : "OK",
    stock,
    unit: variant.inventory_unit || variant.default_sale_unit || "unit",
    value: stock * unitCost,
    variant: variant.name || "Presentación estándar",
  };
}

function buildInventorySheets(workbook: ExcelJS.Workbook, data: ReportData) {
  const variants = flattenVariants(data.products);
  const trackedVariants = variants.filter((variant) => variant.trackInventory && variant.status === "active");
  const lowStock = trackedVariants.filter((variant) => {
    const stock = toSafeNumber(variant.current_stock);
    const threshold = toSafeNumber(variant.low_stock_threshold || variant.minimum_stock);
    return threshold > 0 && stock > 0 && stock <= threshold;
  });
  const outOfStock = trackedVariants.filter((variant) => toSafeNumber(variant.current_stock) <= 0);

  addTableSheet(
    workbook,
    "Resumen inventario",
    [
      { header: "Métrica", key: "metric", width: 32 },
      { header: "Valor", key: "value", width: 18 },
    ],
    [
      { metric: "Variantes con inventario", value: trackedVariants.length },
      { metric: "Stock bajo", value: lowStock.length },
      { metric: "Agotados", value: outOfStock.length },
      { metric: "Movimientos", value: data.inventoryMovements.length },
      { metric: "Conteos físicos", value: data.inventoryCounts.length },
    ],
  );
  addTableSheet(workbook, "Stock actual", productStockColumns(), trackedVariants.map(variantStockRow));
  addTableSheet(
    workbook,
    "Movimientos de inventario",
    [
      { header: "Fecha", key: "date", numFmt: dateTimeFormat },
      { header: "Código", key: "code" },
      { header: "Producto", key: "product", width: 28 },
      { header: "Variante", key: "variant", width: 22 },
      { header: "SKU", key: "sku" },
      { header: "Tipo", key: "type" },
      { header: "Fuente", key: "source" },
      { header: "Cantidad", key: "quantity", numFmt: numberFormat },
      { header: "Unidad", key: "unit" },
      { header: "Costo unitario", key: "unitCost", numFmt: moneyFormat },
      { header: "Costo total", key: "totalCost", numFmt: moneyFormat },
      { header: "Razón", key: "reason", width: 24 },
    ],
    data.inventoryMovements.map((movement) => ({
      code: movement.movement_code || "",
      date: asDate(movement.created_at || undefined),
      product: movement.product_variants?.products?.name || "",
      quantity: toSafeNumber(movement.quantity),
      reason: movement.reason || "",
      sku: movement.product_variants?.sku || "",
      source: movement.source || "",
      totalCost: toSafeNumber(movement.total_cost),
      type: movement.movement_type || "",
      unit: movement.stock_unit || "",
      unitCost: toSafeNumber(movement.unit_cost),
      variant: movement.product_variants?.name || "",
    })),
  );
  addTableSheet(workbook, "Stock bajo", productStockColumns(), lowStock.map(variantStockRow));
  addTableSheet(workbook, "Agotados", productStockColumns(), outOfStock.map(variantStockRow));
  addTableSheet(
    workbook,
    "Conteos físicos",
    [
      { header: "Código", key: "code" },
      { header: "Fecha", key: "date", numFmt: dateTimeFormat },
      { header: "Estado", key: "status" },
      { header: "Producto", key: "product", width: 28 },
      { header: "Variante", key: "variant" },
      { header: "Sistema", key: "system", numFmt: numberFormat },
      { header: "Contado", key: "counted", numFmt: numberFormat },
      { header: "Diferencia", key: "difference", numFmt: numberFormat },
      { header: "Unidad", key: "unit" },
      { header: "Diferencia costo", key: "costDifference", numFmt: moneyFormat },
    ],
    data.inventoryCounts.flatMap((count) =>
      (count.inventory_count_items || []).map((item) => ({
        code: count.count_code || "",
        costDifference: toSafeNumber(item.total_difference_cost),
        counted: toSafeNumber(item.counted_stock),
        date: asDate(count.counted_at || undefined),
        difference: toSafeNumber(item.difference_quantity),
        product: item.product_name || "",
        status: count.status || "",
        system: toSafeNumber(item.system_stock),
        unit: item.stock_unit || "",
        variant: item.variant_name || "",
      })),
    ),
  );
}

function buildProductSheets(workbook: ExcelJS.Workbook, data: ReportData) {
  const variants = flattenVariants(data.products);
  const saleItems = data.activeSales.flatMap((sale) => sale.sale_items || []);
  const productItems = saleItems.filter((item) => item.item_type === "product");
  const soldProductNames = new Set(productItems.map((item) => item.item_name).filter(Boolean));
  const comboAvailability = data.combos.map((combo) => ({ combo, possible: comboStockPossible(combo) }));

  addTableSheet(
    workbook,
    "Productos",
    [
      { header: "Producto", key: "product", width: 28 },
      { header: "Marca", key: "brand" },
      { header: "Categoría", key: "category" },
      { header: "Estado producto", key: "productStatus" },
      { header: "Variante", key: "variant", width: 22 },
      { header: "SKU", key: "sku" },
      { header: "Estado variante", key: "variantStatus" },
      { header: "Costo", key: "cost", numFmt: moneyFormat },
      { header: "Precio", key: "price", numFmt: moneyFormat },
      { header: "Stock", key: "stock", numFmt: numberFormat },
      { header: "Ubicación", key: "location" },
    ],
    variants.map((variant) => ({
      brand: variant.brand || "",
      category: variant.category || "",
      cost: toSafeNumber(variant.purchase_cost),
      location: variant.inventory_location || "",
      price: toSafeNumber(variant.sale_price),
      product: variant.productName,
      productStatus: variant.productStatus || "",
      sku: variant.sku || "",
      stock: toSafeNumber(variant.current_stock),
      variant: variant.name || "Presentación estándar",
      variantStatus: variant.status || "",
    })),
  );
  addTableSheet(
    workbook,
    "Combos",
    [
      { header: "Combo", key: "name", width: 28 },
      { header: "Categoría", key: "category" },
      { header: "Estado", key: "status" },
      { header: "Precio", key: "price", numFmt: moneyFormat },
      { header: "Stock posible", key: "possible" },
    ],
    comboAvailability.map(({ combo, possible }) => ({
      category: combo.category || "",
      name: combo.name,
      possible: possible === null ? "Sin límite" : possible,
      price: toSafeNumber(combo.sale_price),
      status: combo.status || "",
    })),
  );
  addGroupedSheet(workbook, "Productos más vendidos", groupBy(productItems, (item) => item.item_name || "Producto sin nombre", (item) => toSafeNumber(item.total_amount)));
  addTableSheet(
    workbook,
    "Productos sin movimiento",
    [
      { header: "Producto", key: "product", width: 28 },
      { header: "Estado", key: "status" },
      { header: "Alerta", key: "alert", width: 28 },
    ],
    data.products
      .filter((product) => product.status === "active" && !soldProductNames.has(product.name))
      .map((product) => ({
        alert: "Sin ventas en el periodo",
        product: product.name,
        status: product.status || "",
      })),
  );
  addTableSheet(
    workbook,
    "Combos sin stock suficiente",
    [
      { header: "Combo", key: "combo", width: 28 },
      { header: "Estado", key: "status" },
      { header: "Stock posible", key: "possible" },
    ],
    comboAvailability
      .filter(({ possible, combo }) => combo.status === "active" && possible === 0)
      .map(({ combo, possible }) => ({
        combo: combo.name,
        possible,
        status: combo.status || "",
      })),
  );
  addProfitByItemSheet(workbook, "Margen por producto", productItems);
}

function buildPendingSheets(workbook: ExcelJS.Workbook, data: ReportData) {
  const pendingSales = data.activeSales.filter((sale) => toSafeNumber(sale.balance_due) > 0);
  const pendingRows = pendingSales.map((sale) => {
    const daysPending = daysBetween(saleDayKey(sale), toBogotaDateKey(new Date()));

    return {
      channel: labelFromMap(channelLabels, sale.channel, "Sin canal"),
      code: sale.sale_code || "Venta",
      customer: sale.customer_name || "Cliente sin nombre",
      date: asDate(sale.sale_date),
      daysPending,
      paid: toSafeNumber(sale.paid_amount),
      pending: toSafeNumber(sale.balance_due),
      phone: sale.customer_phone || "",
      status: labelFromMap(paymentStatusLabels, sale.payment_status, "Sin estado"),
      total: toSafeNumber(sale.total_amount),
    };
  });

  addTableSheet(
    workbook,
    "Resumen pagos pendientes",
    [
      { header: "Métrica", key: "metric", width: 34 },
      { header: "Valor", key: "value", numFmt: moneyFormat },
    ],
    [
      { metric: "Total pendiente", value: pendingRows.reduce((total, row) => total + toSafeNumber(row.pending), 0) },
      { metric: "Ventas pendientes", value: pendingSales.filter((sale) => sale.payment_status === "pending").length },
      { metric: "Ventas parciales", value: pendingSales.filter((sale) => sale.payment_status === "partial").length },
      { metric: "Promedio por venta", value: pendingRows.length ? pendingRows.reduce((total, row) => total + toSafeNumber(row.pending), 0) / pendingRows.length : 0 },
    ],
  );
  addTableSheet(workbook, "Ventas pendientes", pendingColumns(), pendingRows.filter((row) => row.status === "Pendiente"));
  addTableSheet(workbook, "Ventas parciales", pendingColumns(), pendingRows.filter((row) => row.status === "Parcial"));
  addGroupedSheet(workbook, "Deuda por cliente", groupBy(pendingRows, (row) => row.customer, (row) => toSafeNumber(row.pending)));
  addTableSheet(
    workbook,
    "Antigüedad de deuda",
    [
      { header: "Rango", key: "range", width: 24 },
      { header: "Valor pendiente", key: "pending", numFmt: moneyFormat },
    ],
    [
      { pending: pendingRows.filter((row) => row.daysPending <= 1).reduce((total, row) => total + toSafeNumber(row.pending), 0), range: "Hoy" },
      { pending: pendingRows.filter((row) => row.daysPending > 1 && row.daysPending <= 7).reduce((total, row) => total + toSafeNumber(row.pending), 0), range: "1 a 7 días" },
      { pending: pendingRows.filter((row) => row.daysPending > 7 && row.daysPending <= 15).reduce((total, row) => total + toSafeNumber(row.pending), 0), range: "8 a 15 días" },
      { pending: pendingRows.filter((row) => row.daysPending > 15).reduce((total, row) => total + toSafeNumber(row.pending), 0), range: "Más de 15 días" },
    ],
  );
}

function pendingColumns(): SheetColumn[] {
  return [
    { header: "Fecha", key: "date", numFmt: dateTimeFormat },
    { header: "Código de venta", key: "code" },
    { header: "Cliente", key: "customer", width: 24 },
    { header: "Teléfono", key: "phone" },
    { header: "Canal", key: "channel" },
    { header: "Total", key: "total", numFmt: moneyFormat },
    { header: "Pagado", key: "paid", numFmt: moneyFormat },
    { header: "Pendiente", key: "pending", numFmt: moneyFormat },
    { header: "Días pendiente", key: "daysPending" },
    { header: "Estado", key: "status" },
  ];
}

function buildWorkbook(data: ReportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Margenia";
  workbook.created = new Date();
  workbook.modified = new Date();

  addMetadataSheet(workbook, data);

  if (data.tab === "resumen") buildSummarySheets(workbook, data);
  if (data.tab === "ventas") buildSalesSheets(workbook, data);
  if (data.tab === "rentabilidad") buildProfitSheets(workbook, data);
  if (data.tab === "caja") buildCashSheets(workbook, data);
  if (data.tab === "inventario") buildInventorySheets(workbook, data);
  if (data.tab === "productos") buildProductSheets(workbook, data);
  if (data.tab === "pagos") buildPendingSheets(workbook, data);

  return workbook;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Debes iniciar sesión para descargar reportes." }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ message: "No encontramos un negocio activo." }, { status: 404 });
  }

  const tabParam = url.searchParams.get("tab") || "resumen";
  const tab = tabs.includes(tabParam as ReportTab) ? (tabParam as ReportTab) : "resumen";
  const range = getReportRange(url.searchParams);
  const channel = url.searchParams.get("channel") || "all";
  const paymentMethod = url.searchParams.get("payment_method") || "all";

  let salesQuery = supabase
    .from("sales")
    .select(
      "sale_code,sale_date,customer_name,customer_phone,channel,payment_status,status,subtotal_amount,discount_amount,tax_amount,shipping_amount,total_amount,paid_amount,balance_due,total_cost,gross_profit,gross_margin_percent,sale_items(item_type,item_name,variant_name,sku,quantity,quantity_unit,unit_price,total_amount,total_cost,gross_profit,gross_margin_percent,variant_id,combo_id),sale_payments(payment_method,amount,paid_at,reference)",
    )
    .eq("business_id", business.id)
    .gte("sale_date", range.startIso)
    .lte("sale_date", range.endIso)
    .order("sale_date", { ascending: false });

  if (channel !== "all") salesQuery = salesQuery.eq("channel", channel);

  const [
    { data: salesRows, error: salesError },
    { data: productRows, error: productsError },
    { data: comboRows, error: combosError },
    { data: movementRows, error: movementsError },
    { data: countRows, error: countsError },
    { data: cashSessionRows, error: cashSessionsError },
    { data: cashMovementRows, error: cashMovementsError },
    { data: cashCountRows, error: cashCountsError },
  ] = await Promise.all([
    salesQuery,
    supabase
      .from("products")
      .select("id,name,brand,category,status,track_inventory,product_variants(id,name,sku,status,purchase_cost,sale_price,current_stock,minimum_stock,low_stock_threshold,inventory_unit,default_sale_unit,inventory_location)")
      .eq("business_id", business.id),
    supabase
      .from("combos")
      .select("name,category,status,sale_price,combo_items(status,quantity_in_inventory_unit,product_variants(status,current_stock,products(status,track_inventory)))")
      .eq("business_id", business.id),
    supabase
      .from("inventory_movements")
      .select("movement_code,movement_type,quantity,stock_unit,unit_cost,total_cost,source,reason,created_at,product_variants(name,sku,products(name))")
      .eq("business_id", business.id)
      .gte("created_at", range.startIso)
      .lte("created_at", range.endIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("inventory_counts")
      .select("count_code,status,counted_at,inventory_count_items(product_name,variant_name,system_stock,counted_stock,difference_quantity,stock_unit,total_difference_cost)")
      .eq("business_id", business.id)
      .gte("counted_at", range.startIso)
      .lte("counted_at", range.endIso),
    supabase
      .from("cash_sessions")
      .select("session_code,status,opened_at,closed_at,opening_cash_amount,expected_cash_amount,counted_cash_amount,expected_total_amount,counted_total_amount,total_difference_amount")
      .eq("business_id", business.id)
      .or(`opened_at.gte.${range.startIso},closed_at.gte.${range.startIso}`)
      .order("opened_at", { ascending: false }),
    supabase
      .from("cash_movements")
      .select("movement_code,direction,movement_type,payment_method,amount,category,description,occurred_at")
      .eq("business_id", business.id)
      .gte("occurred_at", range.startIso)
      .lte("occurred_at", range.endIso),
    supabase
      .from("cash_session_counts")
      .select("payment_method,expected_amount,counted_amount,difference_amount,created_at")
      .eq("business_id", business.id)
      .gte("created_at", range.startIso)
      .lte("created_at", range.endIso),
  ]);

  const firstError =
    salesError ||
    productsError ||
    combosError ||
    movementsError ||
    countsError ||
    cashSessionsError ||
    cashMovementsError ||
    cashCountsError;

  if (firstError) {
    console.error("Report export error:", firstError.message);
    return NextResponse.json(
      { message: "No pudimos generar el Excel. Intenta nuevamente." },
      { status: 500 },
    );
  }

  const sales = ((salesRows || []) as unknown as SaleRow[]).filter((sale) =>
    paymentMethod === "all"
      ? true
      : (sale.sale_payments || []).some((payment) => payment.payment_method === paymentMethod),
  );
  const activeSales = sales.filter((sale) => sale.status === "completed");
  const data: ReportData = {
    activeSales,
    business,
    cashCounts: (cashCountRows || []) as unknown as CashCountRow[],
    cashMovements: (cashMovementRows || []) as unknown as CashMovementRow[],
    cashSessions: (cashSessionRows || []) as unknown as CashSessionRow[],
    channel,
    combos: (comboRows || []) as unknown as ComboRow[],
    inventoryCounts: (countRows || []) as unknown as InventoryCountRow[],
    inventoryMovements: (movementRows || []) as unknown as InventoryMovementRow[],
    paymentMethod,
    products: (productRows || []) as unknown as ProductRow[],
    range,
    sales,
    tab,
  };

  if (!hasDataForTab(data)) {
    return NextResponse.json(
      { message: "No hay datos para descargar en este periodo." },
      { status: 404 },
    );
  }

  const workbook = buildWorkbook(data);
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = makeFilename(tab, range);

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
