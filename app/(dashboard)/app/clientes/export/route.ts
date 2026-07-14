import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import {
  customerFrequencyLabel,
  customerStatusLabel,
  filterCustomers,
  mergeCustomersWithSales,
  safeNumber,
  type CustomerRow,
  type CustomerSaleRow,
  type CustomerSearchFilters,
} from "@/lib/customers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ExportScope = "debts" | "history" | "list";
type Cell = Date | number | string | null;
type ExportRow = Record<string, Cell>;
type Column = { header: string; key: string; numFmt?: string; width?: number };

type ExportSale = CustomerSaleRow & {
  customer_name?: string | null;
  customer_phone?: string | null;
  sale_items?: { item_name: string; quantity: number | string | null; total_amount: number | string | null }[] | null;
  sale_payments?: { amount: number | string | null; paid_at: string; payment_method: string }[] | null;
};

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: Column[], rows: ExportRow[]) {
  const sheet = workbook.addWorksheet(name.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = columns.map((column) => ({ ...column, width: column.width || 18 }));
  rows.forEach((row) => sheet.addRow(row));
  const header = sheet.getRow(1);
  header.height = 28;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  header.alignment = { vertical: "middle" };
  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + Math.min(columns.length, 26))}1` };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: "top", wrapText: true };
      if (rowNumber % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    }
  });
  columns.forEach((column, index) => {
    if (column.numFmt) sheet.getColumn(index + 1).numFmt = column.numFmt;
  });
  return sheet;
}

function addMetadata(
  workbook: ExcelJS.Workbook,
  businessName: string,
  report: string,
  filters: string,
) {
  const sheet = workbook.addWorksheet("Información");
  sheet.columns = [{ width: 25 }, { width: 60 }];
  [
    ["Negocio", businessName],
    ["Reporte", report],
    ["Fecha de descarga", new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeStyle: "short" }).format(new Date())],
    ["Filtros aplicados", filters],
  ].forEach((row) => sheet.addRow(row));
  sheet.getColumn(1).font = { bold: true, color: { argb: "FF1D4ED8" } };
}

function filename(scope: ExportScope) {
  return `margenia-${scope === "history" ? "historial-cliente" : scope === "debts" ? "cuentas-por-cobrar" : "clientes"}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = (url.searchParams.get("scope") || "list") as ExportScope;
  const customerId = url.searchParams.get("customerId") || "";
  if (!(["debts", "history", "list"] as string[]).includes(scope)) {
    return NextResponse.json({ message: "El tipo de exportación no es válido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Tu sesión expiró." }, { status: 401 });
  const { data: business } = await supabase.from("businesses").select("id,name,currency").eq("owner_id", user.id).limit(1).maybeSingle();
  if (!business) return NextResponse.json({ message: "No encontramos el negocio activo." }, { status: 404 });

  const [{ data: customers, error: customerError }, { data: sales, error: salesError }] = await Promise.all([
    supabase.from("customers").select("id,business_id,full_name,document_type,document_number,phone,email,birth_date,gender,address,city,preferred_contact_channel,marketing_opt_in,tags,notes_summary,status,archived_at,created_at,updated_at").eq("business_id", business.id),
    supabase.from("sales").select("id,customer_id,customer_name,customer_phone,sale_code,sale_date,channel,payment_status,status,total_amount,paid_amount,balance_due,gross_profit,sale_items(item_name,quantity,total_amount),sale_payments(amount,paid_at,payment_method)").eq("business_id", business.id),
  ]);
  if (customerError || salesError) {
    return NextResponse.json({ message: "No pudimos consultar los datos para exportar." }, { status: 500 });
  }

  const customerList = (customers || []) as CustomerRow[];
  const saleList = (sales || []) as ExportSale[];
  const metrics = mergeCustomersWithSales(customerList, saleList);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Margenia";
  workbook.created = new Date();
  const currencyFormat = `\"${business.currency || "COP"}\" #,##0.00`;

  if (scope === "history") {
    const customer = metrics.find((item) => item.id === customerId);
    if (!customer) return NextResponse.json({ message: "No encontramos el cliente." }, { status: 404 });
    const customerSales = saleList.filter((sale) => sale.customer_id === customerId);
    addMetadata(workbook, business.name, `Historial de ${customer.full_name}`, "Ficha completa");
    addSheet(workbook, "Perfil", [
      { header: "Campo", key: "field", width: 28 }, { header: "Valor", key: "value", width: 48 },
    ], [
      { field: "Nombre", value: customer.full_name }, { field: "Teléfono", value: customer.phone || "" }, { field: "Email", value: customer.email || "" }, { field: "Documento", value: customer.document_number || "" }, { field: "Ciudad", value: customer.city || "" }, { field: "Total comprado", value: customer.totalSpent }, { field: "Número de compras", value: customer.totalOrders }, { field: "Saldo pendiente", value: customer.pendingBalance }, { field: "Segmento", value: customerFrequencyLabel(customer.frequency) },
    ]);
    addSheet(workbook, "Historial de compras", [
      { header: "Fecha", key: "date", width: 18 }, { header: "Venta", key: "code", width: 18 }, { header: "Productos o combos", key: "items", width: 44 }, { header: "Canal", key: "channel" }, { header: "Estado de pago", key: "payment" }, { header: "Total", key: "total", numFmt: currencyFormat }, { header: "Pagado", key: "paid", numFmt: currencyFormat }, { header: "Pendiente", key: "due", numFmt: currencyFormat },
    ], customerSales.map((sale) => ({ channel: sale.channel || "", code: sale.sale_code, date: new Date(sale.sale_date), due: safeNumber(sale.balance_due), items: (sale.sale_items || []).map((item) => item.item_name).join(", "), paid: safeNumber(sale.paid_amount), payment: sale.payment_status || "", total: safeNumber(sale.total_amount) })));
  } else if (scope === "debts") {
    const debtSales = saleList.filter((sale) => sale.status !== "voided" && safeNumber(sale.balance_due) > 0);
    if (!debtSales.length) return NextResponse.json({ message: "No hay datos para descargar en este periodo." }, { status: 404 });
    addMetadata(workbook, business.name, "Cuentas por cobrar", "Ventas pendientes y parciales");
    addSheet(workbook, "Cuentas por cobrar", [
      { header: "Fecha", key: "date" }, { header: "Venta", key: "code" }, { header: "Cliente", key: "customer", width: 30 }, { header: "Teléfono", key: "phone" }, { header: "Canal", key: "channel" }, { header: "Total", key: "total", numFmt: currencyFormat }, { header: "Pagado", key: "paid", numFmt: currencyFormat }, { header: "Pendiente", key: "due", numFmt: currencyFormat }, { header: "Días pendiente", key: "days" }, { header: "Estado", key: "status" },
    ], debtSales.map((sale) => ({ channel: sale.channel || "", code: sale.sale_code, customer: sale.customer_name || "Sin cliente", date: new Date(sale.sale_date), days: Math.max(Math.floor((Date.now() - new Date(sale.sale_date).getTime()) / 86_400_000), 0), due: safeNumber(sale.balance_due), paid: safeNumber(sale.paid_amount), phone: sale.customer_phone || "", status: sale.payment_status || "", total: safeNumber(sale.total_amount) })));
  } else {
    const filters: CustomerSearchFilters = {
      city: url.searchParams.get("city") || "",
      frequency: url.searchParams.get("frequency") || "all",
      lastPurchase: url.searchParams.get("lastPurchase") || "all",
      maxSpent: url.searchParams.get("maxSpent") ? Number(url.searchParams.get("maxSpent")) : null,
      minSpent: url.searchParams.get("minSpent") ? Number(url.searchParams.get("minSpent")) : null,
      query: url.searchParams.get("q") || "",
      sort: url.searchParams.get("sort") || "recent",
      status: url.searchParams.get("status") || "active",
    };
    const filtered = filterCustomers(metrics, filters);
    if (!filtered.length) return NextResponse.json({ message: "No hay datos para descargar con estos filtros." }, { status: 404 });
    addMetadata(workbook, business.name, "Listado de clientes", `Estado: ${filters.status}; frecuencia: ${filters.frequency}; ciudad: ${filters.city || "todas"}`);
    addSheet(workbook, "Clientes", [
      { header: "Nombre", key: "name", width: 30 }, { header: "Teléfono", key: "phone" }, { header: "Email", key: "email", width: 28 }, { header: "Documento", key: "document" }, { header: "Ciudad", key: "city" }, { header: "Estado", key: "status" }, { header: "Segmento", key: "segment" }, { header: "Compras", key: "orders" }, { header: "Total comprado", key: "spent", numFmt: currencyFormat }, { header: "Ticket promedio", key: "ticket", numFmt: currencyFormat }, { header: "Saldo pendiente", key: "due", numFmt: currencyFormat }, { header: "Última compra", key: "lastPurchase" }, { header: "Etiquetas", key: "tags", width: 30 },
    ], filtered.map((customer) => ({ city: customer.city || "", document: customer.document_number || "", due: customer.pendingBalance, email: customer.email || "", lastPurchase: customer.lastPurchaseAt ? new Date(customer.lastPurchaseAt) : null, name: customer.full_name, orders: customer.totalOrders, phone: customer.phone || "", segment: customerFrequencyLabel(customer.frequency), spent: customer.totalSpent, status: customerStatusLabel(customer.status), tags: (customer.tags || []).join(", "), ticket: customer.averageTicket })));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename(scope)}"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
