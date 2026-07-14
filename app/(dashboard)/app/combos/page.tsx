import Link from "next/link";
import { redirect } from "next/navigation";
import { ComboFilters } from "@/components/combos/combo-filters";
import { ComboRowActions } from "@/components/combos/combo-row-actions";
import {
  ComboMetricCard,
  ComboMobileMetric,
  ComboStatusBadge,
  comboDarkTone,
} from "@/components/combos/combo-dashboard-ui";
import { ProductAnalyticsEvent } from "@/components/products/product-analytics";
import {
  AppPageHeader,
  DashboardShell,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import type { SemanticTone } from "@/components/ui/semantic";
import {
  calculateAvailableComboStock,
  calculateComboBaseCost,
  calculateComboProfit,
  comboMoneyFormatter,
  comboStatusLabel,
  comboStockLabel,
  type ComboCatalogVariant,
  type ComboFormItemInput,
  type ComboItemRow,
  type ComboRow,
} from "@/lib/combos";
import { createClient } from "@/lib/supabase/server";
import { toSafeNumber } from "@/lib/products/product-utils";

const pageSize = 20;

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams | undefined, key: string, fallback = "") {
  const value = params?.[key];
  return typeof value === "string" ? value : fallback;
}

function comboItems(combo: ComboRow) {
  return (combo.combo_items || []).filter((item) => item.status === "active");
}

function comboVariants(combo: ComboRow) {
  return comboItems(combo)
    .map((item) => item.product_variants)
    .filter((variant): variant is NonNullable<ComboItemRow["product_variants"]> =>
      Boolean(variant),
    )
    .map((variant) => ({
      ...variant,
      product_name: variant.products?.name || "Producto",
      product_status: variant.products?.status || "active",
      track_inventory: variant.products?.track_inventory ?? true,
      unit: variant.products?.unit || "Unidad",
    })) as ComboCatalogVariant[];
}

function comboFormItems(combo: ComboRow): ComboFormItemInput[] {
  return comboItems(combo).map((item, index) => ({
    id: item.id,
    position: item.position ?? index,
    productId: item.product_id,
    quantity: String(item.quantity ?? 1),
    quantityInInventoryUnit: String(item.quantity_in_inventory_unit ?? item.quantity ?? 1),
    quantityUnit: (item.quantity_unit || "unit") as ComboFormItemInput["quantityUnit"],
    status: "active",
    variantId: item.variant_id,
  }));
}

function comboStats(combo: ComboRow) {
  const items = comboFormItems(combo);
  const variants = comboVariants(combo);
  const baseCost = calculateComboBaseCost(items, variants);
  const profit = calculateComboProfit({
    baseCost,
    commissionPercent: toSafeNumber(combo.commission_percent),
    packagingCost: toSafeNumber(combo.packaging_cost),
    salePrice: toSafeNumber(combo.sale_price),
    taxPercent: toSafeNumber(combo.tax_percent),
  });
  const stock = calculateAvailableComboStock(items, variants);

  return {
    baseCost,
    itemCount: items.length,
    margin: profit.marginPercent,
    profit: profit.profit,
    stock,
  };
}

function comboMarginTone(margin: number): SemanticTone {
  if (margin < 0) return "negative";
  if (margin < 25) return "warning";
  return "positive";
}

function comboStockTone(stock: number | null): SemanticTone {
  if (stock === null) return "neutral";
  if (stock <= 0) return "negative";
  if (stock <= 3) return "warning";
  return "positive";
}

function comboStatusTone(status: string | null | undefined): SemanticTone {
  return status === "archived" ? "neutral" : "positive";
}

export default async function CombosPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = getParam(params, "q").trim();
  const status = getParam(params, "status", "active");
  const category = getParam(params, "category", "all");
  const sort = getParam(params, "sort", "recent");
  const page = Math.max(Number(getParam(params, "page", "1")) || 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) {
    redirect("/app/onboarding");
  }

  const currency = business.currency || "COP";
  const formatter = comboMoneyFormatter(currency);
  const { data: activeVariantRows } = await supabase
    .from("product_variants")
    .select("id,products!inner(status)")
    .eq("business_id", business.id)
    .eq("status", "active")
    .eq("products.status", "active")
    .limit(1);
  const hasProducts = Boolean(activeVariantRows?.length);
  const { data: categoryRows } = await supabase
    .from("combos")
    .select("category")
    .eq("business_id", business.id)
    .not("category", "is", null);
  const categories = Array.from(
    new Set(
      ((categoryRows || []) as { category: string | null }[])
        .map((row) => row.category)
        .filter((item): item is string => Boolean(item)),
    ),
  );

  let query = supabase
    .from("combos")
    .select(
      "id,name,description,category,sale_price,packaging_cost,commission_percent,desired_margin_percent,tax_percent,status,created_at,combo_items(id,product_id,variant_id,quantity,quantity_unit,quantity_in_inventory_unit,position,status,product_variants(id,product_id,name,purchase_cost,sale_price,current_stock,inventory_mode,inventory_unit,default_sale_unit,status,products(id,name,status,track_inventory,unit)))",
      { count: "exact" },
    )
    .eq("business_id", business.id);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (category !== "all") {
    query = query.eq("category", category);
  }

  if (q) {
    const escaped = q.replaceAll(",", " ");
    query = query.or(`name.ilike.%${escaped}%,category.ilike.%${escaped}%`);
  }

  if (sort === "name") {
    query = query.order("name", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { count, data: combos, error } = await query.range(from, to);
  const comboList = ((combos || []) as unknown as ComboRow[]).sort((a, b) => {
    const aStats = comboStats(a);
    const bStats = comboStats(b);

    if (sort === "margin") {
      return bStats.margin - aStats.margin;
    }

    if (sort === "stock") {
      return (aStats.stock ?? Number.MAX_SAFE_INTEGER) - (bStats.stock ?? Number.MAX_SAFE_INTEGER);
    }

    return 0;
  });
  const { data: metricCombos } = await supabase
    .from("combos")
    .select(
      "id,name,sale_price,packaging_cost,commission_percent,tax_percent,status,combo_items(id,product_id,variant_id,quantity,quantity_unit,quantity_in_inventory_unit,position,status,product_variants(id,product_id,name,purchase_cost,sale_price,current_stock,inventory_mode,inventory_unit,default_sale_unit,status,products(id,name,status,track_inventory,unit)))",
    )
    .eq("business_id", business.id);
  const metricList = (metricCombos || []) as unknown as ComboRow[];
  const activeCombos = metricList.filter((combo) => combo.status === "active");
  const archivedCombos = metricList.filter((combo) => combo.status === "archived");
  const activeStats = activeCombos.map(comboStats);
  const bestMargin = activeStats.length
    ? Math.max(...activeStats.map((item) => item.margin))
    : 0;
  const combosWithStock = activeStats.filter((item) => item.stock === null || item.stock > 0).length;
  const totalPages = Math.max(Math.ceil((count || 0) / pageSize), 1);
  const hasFilters = Boolean(q || status !== "active" || category !== "all" || sort !== "recent");

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <ProductAnalyticsEvent eventName="combo_module_view" />
      <DashboardShell>
        <AppPageHeader
          eyebrow="Combos"
          title="Combos y kits"
          description="Crea paquetes rentables combinando productos de tu catálogo."
          actions={hasProducts ? <Link href="/app/combos/nuevo" className={dashboardPrimaryActionClass}>Nuevo combo</Link> : <Link href="/app/productos/nuevo" className={dashboardSecondaryActionClass}>Primero agrega productos</Link>}
        />

        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ComboMetricCard label="Combos activos" value={String(activeCombos.length)} description="Kits disponibles en tu catálogo" icon="active" tone="positive" />
            <ComboMetricCard label="Combos archivados" value={String(archivedCombos.length)} description="Historial fuera del catálogo activo" icon="archived" tone="neutral" />
            <ComboMetricCard label="Mejor margen estimado" value={`${bestMargin.toFixed(1)}%`} description="Mayor rentabilidad entre combos activos" icon="margin" tone={comboMarginTone(bestMargin)} />
            <ComboMetricCard label="Con stock disponible" value={String(combosWithStock)} description="Combos que puedes vender ahora" icon="stock" tone={combosWithStock > 0 ? "positive" : "warning"} />
          </section>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Control comercial</p><h2 className="mt-1 text-xl font-black text-white">Catálogo de combos</h2></div>
            <p className="text-xs font-bold text-slate-500">{comboList.length} combos en esta página</p>
          </div>
          <ComboFilters categories={categories} category={category} query={q} sort={sort} status={status} />

          {error ? (
            <section className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-6 text-rose-100"><h2 className="text-xl font-black">No pudimos cargar combos</h2><p className="mt-2 text-sm font-semibold text-rose-100/70">Revisa que la migración 005_combos.sql exista en Supabase.</p></section>
          ) : !hasProducts ? (
            <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-12 text-center"><h2 className="text-xl font-black text-white">Primero agrega productos</h2><p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-400">Para crear un combo necesitas productos activos en tu catálogo.</p><Link href="/app/productos/nuevo" className={`${dashboardPrimaryActionClass} mt-5`}>Ir a productos</Link></section>
          ) : !comboList.length ? (
            <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M5 7.5 12 4l7 3.5-7 3.5-7-3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m5 12 7 3.5 7-3.5M5 16.5l7 3.5 7-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></div>
              <h2 className="mt-4 text-xl font-black text-white">{hasFilters ? "No encontramos combos" : "Aún no has creado combos"}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-400">{hasFilters ? "Prueba otros filtros o limpia la búsqueda para ampliar los resultados." : "Crea kits y paquetes con productos de tu catálogo para vender más y mejorar tu ticket promedio."}</p>
              <Link href={hasFilters ? "/app/combos" : "/app/combos/nuevo"} className={`${dashboardPrimaryActionClass} mt-5`}>{hasFilters ? "Quitar filtros" : "Nuevo combo"}</Link>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <thead className="border-b border-white/[0.08] bg-black/15 text-[0.68rem] font-black uppercase tracking-[0.1em] text-slate-500"><tr>{["Combo", "Productos incluidos", "Costo", "Precio", "Margen", "Stock posible", "Estado", "Acciones"].map((header) => <th key={header} className="px-4 py-4">{header}</th>)}</tr></thead>
                  <tbody className="divide-y divide-white/[0.06]">{comboList.map((combo) => {
                    const stats = comboStats(combo);
                    const marginTone = comboMarginTone(stats.margin);
                    const statusValue = combo.status === "archived" ? "archived" : "active";
                    return <tr key={combo.id} className="align-top transition duration-200 hover:bg-white/[0.045]">
                      <td className="px-4 py-4"><Link href={`/app/combos/${combo.id}/editar`} className="font-black text-white transition hover:text-cyan-200">{combo.name}</Link><p className="mt-1 text-xs font-semibold text-slate-500">{combo.category || "Sin categoría"}</p></td>
                      <td className="px-4 py-4 font-bold text-slate-300">{stats.itemCount} productos</td>
                      <td className="px-4 py-4 font-bold text-slate-400">{formatter.format(stats.baseCost)}</td>
                      <td className="px-4 py-4 font-black text-cyan-100">{formatter.format(toSafeNumber(combo.sale_price))}</td>
                      <td className={`px-4 py-4 font-black ${comboDarkTone[marginTone].text}`}>{stats.margin.toFixed(1)}%</td>
                      <td className="px-4 py-4"><ComboStatusBadge tone={comboStockTone(stats.stock)}>{comboStockLabel(stats.stock)}</ComboStatusBadge></td>
                      <td className="px-4 py-4"><ComboStatusBadge tone={comboStatusTone(combo.status)}>{comboStatusLabel(combo.status)}</ComboStatusBadge></td>
                      <td className="px-4 py-4"><ComboRowActions appearance="dark" comboId={combo.id} editHref={`/app/combos/${combo.id}/editar`} status={statusValue} /></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 xl:hidden">{comboList.map((combo) => {
                const stats = comboStats(combo);
                const marginTone = comboMarginTone(stats.margin);
                const statusValue = combo.status === "archived" ? "archived" : "active";
                return <article key={combo.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.055]">
                  <div className="flex items-start justify-between gap-3"><div><Link href={`/app/combos/${combo.id}/editar`} className="font-black text-white">{combo.name}</Link><p className="mt-1 text-sm font-semibold text-slate-500">{combo.category || "Sin categoría"} · {stats.itemCount} productos</p></div><ComboStatusBadge tone={comboStatusTone(combo.status)}>{comboStatusLabel(combo.status)}</ComboStatusBadge></div>
                  <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07]"><ComboMobileMetric label="Precio" value={formatter.format(toSafeNumber(combo.sale_price))} tone="brand" /><ComboMobileMetric label="Margen" value={`${stats.margin.toFixed(1)}%`} tone={marginTone} /><ComboMobileMetric label="Stock posible" value={comboStockLabel(stats.stock)} tone={comboStockTone(stats.stock)} /><ComboMobileMetric label="Costo" value={formatter.format(stats.baseCost)} /></div>
                  <ComboRowActions appearance="dark" comboId={combo.id} editHref={`/app/combos/${combo.id}/editar`} status={statusValue} variant="block" />
                </article>;
              })}</div>
            </section>
          )}

          {comboList.length > 0 && <nav className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row" aria-label="Paginación de combos"><Link href={{ pathname: "/app/combos", query: { ...params, page: Math.max(page - 1, 1) } }} className={`${dashboardSecondaryActionClass} w-full sm:w-auto ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>Anterior</Link><span className="text-sm font-black text-slate-500">Página {page} de {totalPages}</span><Link href={{ pathname: "/app/combos", query: { ...params, page: Math.min(page + 1, totalPages) } }} className={`${dashboardSecondaryActionClass} w-full sm:w-auto ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}>Siguiente</Link></nav>}
        </div>
      </DashboardShell>
    </main>
  );
}
