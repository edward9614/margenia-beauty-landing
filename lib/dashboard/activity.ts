import type { SupabaseClient } from "@supabase/supabase-js";

export type RecentActivityType =
  | "combo_created"
  | "inventory_count"
  | "inventory_movement"
  | "product_created"
  | "sale_created"
  | "sale_voided";

export type RecentActivityItem = {
  id: string;
  type: RecentActivityType;
  title: string;
  description: string;
  amount?: number;
  date: string;
  href?: string;
  badge?: string;
};

type SaleActivityRow = {
  id: string;
  sale_code: string | null;
  status: string | null;
  total_amount: number | string | null;
  gross_profit: number | string | null;
  payment_status: string | null;
  sale_date: string;
  created_at: string;
  voided_at: string | null;
};

type InventoryMovementActivityRow = {
  id: string;
  movement_code: string | null;
  movement_type: string;
  quantity: number | string | null;
  stock_unit: string | null;
  source: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
  variant_id: string | null;
  product_variants?: {
    name: string | null;
    products?: { name: string | null } | null;
  } | null;
};

type InventoryCountActivityRow = {
  id: string;
  count_code: string;
  counted_at: string;
  created_at: string;
  notes: string | null;
};

type CatalogActivityRow = {
  id: string;
  name: string;
  status: string | null;
  created_at: string;
  updated_at: string;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function quantityLabel(quantity: number | string | null, unit: string | null) {
  const value = toNumber(quantity);
  const formatted = value.toLocaleString("es-CO", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

  return `${formatted} ${unit || "unidades"}`.trim();
}

function movementTitle(type: string) {
  if (type === "purchase") return "Entrada de inventario";
  if (type === "return") return "Devolución registrada";
  if (type === "waste") return "Merma registrada";
  if (type === "sale_void") return "Anulación de venta";
  if (type === "sale") return "Movimiento por venta";
  return "Ajuste de inventario";
}

function productLabel(movement: InventoryMovementActivityRow) {
  const product = movement.product_variants?.products?.name;
  const variant = movement.product_variants?.name;

  if (product && variant) return `${product} · ${variant}`;
  return product || variant || "Movimiento de inventario";
}

function sortByDateDesc(items: RecentActivityItem[]) {
  return [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getRecentActivity({
  businessId,
  limit = 8,
  supabase,
}: {
  businessId: string;
  limit?: number;
  supabase: SupabaseClient;
}): Promise<RecentActivityItem[]> {
  const [
    completedSalesResult,
    voidedSalesResult,
    movementsResult,
    countsResult,
    productsResult,
    combosResult,
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("id,sale_code,status,total_amount,gross_profit,payment_status,sale_date,created_at,voided_at")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("sales")
      .select("id,sale_code,status,total_amount,gross_profit,payment_status,sale_date,created_at,voided_at")
      .eq("business_id", businessId)
      .eq("status", "voided")
      .order("voided_at", { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from("inventory_movements")
      .select("id,movement_code,movement_type,quantity,stock_unit,source,reason,notes,created_at,variant_id,product_variants(name,products(name))")
      .eq("business_id", businessId)
      .or("source.is.null,source.eq.manual")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("inventory_counts")
      .select("id,count_code,counted_at,created_at,notes")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("products")
      .select("id,name,status,created_at,updated_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("combos")
      .select("id,name,status,created_at,updated_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const completedSales = (completedSalesResult.data || []) as SaleActivityRow[];
  const voidedSales = (voidedSalesResult.data || []) as SaleActivityRow[];
  const movements = (movementsResult.data || []) as unknown as InventoryMovementActivityRow[];
  const counts = (countsResult.data || []) as InventoryCountActivityRow[];
  const products = (productsResult.data || []) as CatalogActivityRow[];
  const combos = (combosResult.data || []) as CatalogActivityRow[];
  const saleItems = completedSales.map<RecentActivityItem>((sale) => ({
    amount: toNumber(sale.total_amount),
    badge: "Venta",
    date: sale.created_at || sale.sale_date,
    description: `Venta ${sale.sale_code || "sin código"} por ${toNumber(sale.total_amount).toLocaleString("es-CO", {
      currency: "COP",
      maximumFractionDigits: 0,
      style: "currency",
    })}`,
    href: `/app/ventas/${sale.id}`,
    id: `sale_created:${sale.id}`,
    title: "Venta registrada",
    type: "sale_created",
  }));
  const voidedItems = voidedSales.map<RecentActivityItem>((sale) => ({
    badge: "Anulación",
    date: sale.voided_at || sale.created_at || sale.sale_date,
    description: `Se anuló la venta ${sale.sale_code || "sin código"}`,
    href: `/app/ventas/${sale.id}`,
    id: `sale_voided:${sale.id}`,
    title: "Venta anulada",
    type: "sale_voided",
  }));
  const movementItems = movements.map<RecentActivityItem>((movement) => ({
    badge: "Inventario",
    date: movement.created_at,
    description: `${productLabel(movement)} · ${quantityLabel(movement.quantity, movement.stock_unit)}`,
    href: movement.variant_id ? `/app/inventario/${movement.variant_id}` : undefined,
    id: `inventory_movement:${movement.id}`,
    title: movementTitle(movement.movement_type),
    type: "inventory_movement",
  }));
  const countItems = counts.map<RecentActivityItem>((count) => ({
    badge: "Conteo",
    date: count.counted_at || count.created_at,
    description: `Conteo ${count.count_code}`,
    href: "/app/inventario/conteo",
    id: `inventory_count:${count.id}`,
    title: "Conteo físico realizado",
    type: "inventory_count",
  }));
  const productItems = products.map<RecentActivityItem>((product) => ({
    badge: "Producto",
    date: product.created_at,
    description: `${product.name} se agregó al catálogo`,
    href: `/app/productos/${product.id}/editar`,
    id: `product_created:${product.id}`,
    title: "Producto creado",
    type: "product_created",
  }));
  const comboItems = combos.map<RecentActivityItem>((combo) => ({
    badge: "Combo",
    date: combo.created_at,
    description: `${combo.name} se agregó a combos`,
    href: `/app/combos/${combo.id}/editar`,
    id: `combo_created:${combo.id}`,
    title: "Combo creado",
    type: "combo_created",
  }));

  return sortByDateDesc([
    ...saleItems,
    ...voidedItems,
    ...movementItems,
    ...countItems,
    ...productItems,
    ...comboItems,
  ]).slice(0, limit);
}
