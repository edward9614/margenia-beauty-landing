import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ProductAnalyticsEvent } from "@/components/products/product-analytics";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductRowActions } from "@/components/products/product-row-actions";
import {
  AppPageHeader,
  BentoCard,
  BentoGrid,
  DashboardShell,
  HeroSummaryCard,
  MetricChip,
  dashboardPrimaryActionClass,
  dashboardSecondaryActionClass,
} from "@/components/ui/dashboard-primitives";
import type { SemanticTone } from "@/components/ui/semantic";
import { createClient } from "@/lib/supabase/server";
import {
  calculateVariantProfit,
  moneyFormatter,
  type ProductRow,
  type ProductVariantRow,
} from "@/lib/products/product-utils";
import { formatMeasuredQuantity, getUnitSymbol } from "@/lib/measurements";

const pageSize = 20;

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams | undefined, key: string, fallback = "") {
  const value = params?.[key];
  return typeof value === "string" ? value : fallback;
}

function productInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "P";
}

type StockTone = "negative" | "neutral" | "positive" | "warning";

type ProductVariantWithTrackInventory = ProductVariantRow & {
  track_inventory?: boolean | null;
};

function stockStatus(product: ProductRow) {
  if (!product.track_inventory) {
    return { label: "Sin control", tone: "neutral" as StockTone };
  }

  const activeVariants = (product.product_variants || []).filter(
    (variant) => variant.status === "active",
  );
  const totalStock = activeVariants.reduce(
    (total: number, variant) => total + Number(variant.current_stock || 0),
    0,
  );
  const minimumStock = activeVariants.reduce(
    (total: number, variant) => total + Number(variant.minimum_stock || 0),
    0,
  );

  if (totalStock === 0) {
    return { label: "Agotado", tone: "negative" as StockTone };
  }

  if (totalStock <= minimumStock) {
    return { label: "Stock bajo", tone: "warning" as StockTone };
  }

  return { label: "Normal", tone: "positive" as StockTone };
}

function marginTone(margin: number): SemanticTone {
  if (margin < 0) return "negative";
  if (margin < 20) return "warning";
  return "positive";
}

const darkToneStyles: Record<SemanticTone, { badge: string; text: string }> = {
  brand: { badge: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100", text: "text-cyan-200" },
  info: { badge: "border-blue-300/20 bg-blue-300/10 text-blue-100", text: "text-blue-200" },
  negative: { badge: "border-rose-300/20 bg-rose-300/10 text-rose-100", text: "text-rose-200" },
  neutral: { badge: "border-white/10 bg-white/[0.06] text-slate-300", text: "text-slate-300" },
  positive: { badge: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100", text: "text-emerald-200" },
  warning: { badge: "border-amber-300/20 bg-amber-300/10 text-amber-100", text: "text-amber-200" },
};

function DarkStatusBadge({ children, tone }: { children: ReactNode; tone: SemanticTone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${darkToneStyles[tone].badge}`}>
      {children}
    </span>
  );
}

function productStats(product: ProductRow, currency: string) {
  const formatter = moneyFormatter(currency);
  const variants = product.product_variants || [];
  const activeVariants = variants.filter((variant) => variant.status === "active");
  const visibleVariants = activeVariants.length ? activeVariants : variants;
  const stocks = visibleVariants.map((variant) => Number(variant.current_stock || 0));
  const prices = visibleVariants.map((variant) => Number(variant.sale_price || 0));
  const costs = visibleVariants.map((variant) => Number(variant.purchase_cost || 0));
  const margins = visibleVariants.map((variant) =>
    calculateVariantProfit({
      commissionPercent: Number(variant.commission_percent || 0),
      desiredMarginPercent: Number(variant.desired_margin_percent || 0),
      packagingCost: Number(variant.packaging_cost || 0),
      purchaseCost: Number(variant.purchase_cost || 0),
      salePrice: Number(variant.sale_price || 0),
    }).actualMargin,
  );
  const totalStock = stocks.reduce((total: number, value: number) => total + value, 0);
  const firstVariant = visibleVariants[0];
  const isMeasured = firstVariant?.inventory_mode === "measured";
  const stockUnit = isMeasured ? firstVariant?.inventory_unit || "unit" : product.unit || "unidad";
  const saleUnit = isMeasured ? firstVariant?.default_sale_unit || "unit" : product.unit || "unidad";
  const costUnit = isMeasured ? firstVariant?.inventory_unit || "unit" : product.unit || "unidad";
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = Math.max(...prices, 0);
  const minCost = costs.length ? Math.min(...costs) : 0;
  const maxCost = Math.max(...costs, 0);
  const avgMargin = margins.length
    ? margins.reduce((total: number, value: number) => total + value, 0) / margins.length
    : 0;

  return {
    avgMargin,
    costLabel:
      minCost === maxCost
        ? `${formatter.format(maxCost)} / ${getUnitSymbol(costUnit)}`
        : `${formatter.format(minCost)} - ${formatter.format(maxCost)}`,
    isMeasured,
    priceLabel:
      minPrice === maxPrice
        ? `${formatter.format(maxPrice)} / ${getUnitSymbol(saleUnit)}`
        : `${formatter.format(minPrice)} - ${formatter.format(maxPrice)}`,
    stockLabel: isMeasured
      ? formatMeasuredQuantity(totalStock, stockUnit)
      : `${totalStock} ${product.unit || "unidad"}`,
    totalStock,
    variantCount: visibleVariants.length,
  };
}

async function getBusiness(supabase: Awaited<ReturnType<typeof createClient>>) {
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

  return business;
}

async function getMatchingProductIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  query: string,
) {
  if (!query) {
    return [];
  }

  const { data } = await supabase
    .from("product_variants")
    .select("product_id")
    .eq("business_id", businessId)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`);

  return Array.from(
    new Set(((data || []) as { product_id: string }[]).map((item) => item.product_id)),
  );
}

async function getStockFilteredProductIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  stock: string,
) {
  if (!stock || stock === "all") {
    return null;
  }

  if (stock === "no_control") {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("business_id", businessId)
      .eq("track_inventory", false);

    return ((data || []) as { id: string }[]).map((item) => item.id);
  }

  const { data: products } = await supabase
    .from("products")
    .select("id,track_inventory,product_variants(current_stock,minimum_stock,status,inventory_mode,inventory_unit)")
    .eq("business_id", businessId)
    .eq("track_inventory", true);

  return ((products || []) as ProductRow[])
    .filter((product) => {
      const status = stockStatus(product).label;
      return (
        (stock === "normal" && status === "Normal") ||
        (stock === "low" && status === "Stock bajo") ||
        (stock === "out" && status === "Agotado")
      );
    })
    .map((product) => product.id);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = getParam(params, "q").trim();
  const status = getParam(params, "status", "active");
  const stock = getParam(params, "stock", "all");
  const category = getParam(params, "category", "all");
  const sort = getParam(params, "sort", "recent");
  const page = Math.max(Number(getParam(params, "page", "1")) || 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createClient();
  const business = await getBusiness(supabase);
  const currency = business.currency || "COP";
  const formatter = moneyFormatter(currency);

  const { data: categoryRows } = await supabase
    .from("products")
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

  const matchingIds = await getMatchingProductIds(supabase, business.id, q);
  const stockIds = await getStockFilteredProductIds(supabase, business.id, stock);

  let query = supabase
    .from("products")
    .select(
      "id,name,brand,category,unit,product_type,track_inventory,status,created_at,product_variants(id,name,sku,purchase_cost,packaging_cost,commission_percent,desired_margin_percent,sale_price,current_stock,minimum_stock,inventory_mode,inventory_unit,default_sale_unit,status)",
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
    const productOr = [`name.ilike.%${escaped}%`, `brand.ilike.%${escaped}%`];

    if (matchingIds.length) {
      productOr.push(`id.in.(${matchingIds.join(",")})`);
    }

    query = query.or(productOr.join(","));
  }

  if (stockIds) {
    if (!stockIds.length) {
      query = query.in("id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      query = query.in("id", stockIds);
    }
  }

  if (sort === "name") {
    query = query.order("name", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { count, data: products, error } = await query.range(from, to);
  const productList = (products || []) as ProductRow[];
  const sortedProducts = [...productList].sort((a, b) => {
    const aStats = productStats(a, currency);
    const bStats = productStats(b, currency);

    if (sort === "stock") {
      return aStats.totalStock - bStats.totalStock;
    }

    if (sort === "value") {
      const aValue = (a.product_variants || []).reduce(
        (total: number, variant: ProductVariantRow) =>
          total + Number(variant.current_stock || 0) * Number(variant.purchase_cost || 0),
        0,
      );
      const bValue = (b.product_variants || []).reduce(
        (total: number, variant: ProductVariantRow) =>
          total + Number(variant.current_stock || 0) * Number(variant.purchase_cost || 0),
        0,
      );

      return bValue - aValue;
    }

    if (sort === "margin") {
      return bStats.avgMargin - aStats.avgMargin;
    }

    return 0;
  });

  const { data: metricProducts } = await supabase
    .from("products")
    .select("id,track_inventory,status,product_variants(id,purchase_cost,current_stock,minimum_stock,inventory_mode,inventory_unit,status)")
    .eq("business_id", business.id);

  const metricProductList = (metricProducts || []) as ProductRow[];
  const activeProducts = metricProductList.filter(
    (product) => product.status === "active",
  );
  const activeVariants = activeProducts.flatMap((product) =>
    (product.product_variants || [])
      .filter((variant) => variant.status === "active")
      .map((variant) => ({
        ...variant,
        track_inventory: product.track_inventory,
      })),
  );
  const stockLowCount = activeVariants.filter(
    (variant: ProductVariantWithTrackInventory) =>
      variant.track_inventory &&
      Number(variant.current_stock || 0) > 0 &&
      Number(variant.current_stock || 0) <= Number(variant.minimum_stock || 0),
  ).length;
  const inventoryCostValue = activeVariants.reduce(
    (total: number, variant: ProductVariantWithTrackInventory) =>
      total + Number(variant.current_stock || 0) * Number(variant.purchase_cost || 0),
    0,
  );
  const totalPages = Math.max(Math.ceil((count || 0) / pageSize), 1);
  const hasFilters = Boolean(
    q || status !== "active" || stock !== "all" || category !== "all" || sort !== "recent",
  );

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <ProductAnalyticsEvent eventName="product_module_view" />
      <DashboardShell>
        <AppPageHeader
          eyebrow="Catálogo"
          title="Productos"
          description="Organiza productos, variantes, costos, precios y existencias desde un solo lugar."
          actions={<Link href="/app/productos/nuevo" className={dashboardPrimaryActionClass}>Nuevo producto</Link>}
        />

        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <BentoGrid className="lg:grid-cols-12">
            <div className="lg:col-span-5">
              <HeroSummaryCard
                label="Catálogo activo"
                value={String(activeProducts.length)}
                description="Productos listos para vender y operar dentro de Margenia."
              >
                <MetricChip label="Variantes" value={String(activeVariants.length)} tone="brand" />
                <MetricChip label="Stock bajo" value={String(stockLowCount)} tone={stockLowCount ? "warning" : "success"} />
                <MetricChip label="Moneda" value={currency} tone="default" />
              </HeroSummaryCard>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
              <BentoCard tone="brand">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-cyan-200/70">Variantes activas</p>
                <p className="mt-4 text-4xl font-black text-white">{activeVariants.length}</p>
                <p className="mt-2 text-sm font-semibold text-slate-400">Presentaciones disponibles para vender</p>
              </BentoCard>
              <BentoCard tone={stockLowCount ? "warning" : "success"}>
                <p className="text-xs font-black uppercase tracking-[0.13em] text-slate-400">Stock bajo</p>
                <p className={`mt-4 text-4xl font-black ${stockLowCount ? "text-amber-200" : "text-emerald-200"}`}>{stockLowCount}</p>
                <p className="mt-2 text-sm font-semibold text-slate-400">Variantes que necesitan atención</p>
              </BentoCard>
              <BentoCard className="sm:col-span-2" tone="violet">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.13em] text-violet-200/70">Valor del inventario al costo</p>
                    <p className="mt-3 text-3xl font-black text-white sm:text-4xl">{formatter.format(inventoryCostValue)}</p>
                  </div>
                  <p className="max-w-xs text-sm font-semibold leading-6 text-slate-400">Capital estimado registrado en existencias activas.</p>
                </div>
              </BentoCard>
            </div>
          </BentoGrid>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Control operativo</p>
              <h2 className="mt-1 text-xl font-black text-white">Explora tu catálogo</h2>
            </div>
            <p className="text-xs font-bold text-slate-500">{count || 0} {(count || 0) === 1 ? "producto en esta vista" : "productos en esta vista"}</p>
          </div>

          <ProductFilters categories={categories} category={category} query={q} sort={sort} status={status} stock={stock} />

          {error ? (
            <section className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-6 text-rose-100">
              <h2 className="text-xl font-black">No pudimos cargar productos</h2>
              <p className="mt-2 text-sm font-semibold text-rose-100/70">Revisa que la migración 002_products_catalog.sql exista en Supabase.</p>
            </section>
          ) : !sortedProducts.length ? (
            <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v9m8-4.5-8 4.5m-8-4.5 8 4.5m0 9v-9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
              </div>
              <h2 className="mt-4 text-xl font-black text-white">{hasFilters ? "No encontramos productos" : "Tu catálogo empieza aquí"}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-400">
                {hasFilters ? "Prueba otros filtros o limpia la búsqueda para ampliar los resultados." : "Crea tu primer producto y conecta precios, existencias y rentabilidad desde una sola ficha."}
              </p>
              <Link href={hasFilters ? "/app/productos" : "/app/productos/nuevo"} className={`${dashboardPrimaryActionClass} mt-5`}>
                {hasFilters ? "Quitar filtros" : "Crear producto"}
              </Link>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead className="border-b border-white/[0.08] bg-black/15 text-[0.68rem] font-black uppercase tracking-[0.1em] text-slate-500">
                    <tr>{["Producto", "Variante(s)", "Categoría", "Costo", "Precio", "Margen", "Existencias", "Estado", "Acciones"].map((header) => <th key={header} className="px-4 py-4">{header}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {sortedProducts.map((product) => {
                      const stats = productStats(product, currency);
                      const stockState = stockStatus(product);
                      const statusTone = product.status === "archived" ? "neutral" : stockState.tone;
                      const productMarginTone = marginTone(stats.avgMargin);
                      return (
                        <tr key={product.id} className="align-middle transition duration-200 hover:bg-white/[0.045]">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-black text-white shadow-lg shadow-cyan-950/25">{productInitial(product.name)}</span>
                              <div className="min-w-0">
                                <Link href={`/app/productos/${product.id}/editar`} className="block max-w-[190px] truncate font-black text-white transition hover:text-cyan-200">{product.name}</Link>
                                <p className="mt-1 max-w-[190px] truncate text-xs font-semibold text-slate-500">{product.brand || product.product_variants?.[0]?.sku || "Sin marca ni SKU"}</p>
                                {stats.isMeasured && <DarkStatusBadge tone="brand">Por medida</DarkStatusBadge>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4"><p className="max-w-[150px] truncate font-bold text-slate-200">{stats.variantCount === 1 ? product.product_variants?.[0]?.name || "Principal" : `${stats.variantCount} variantes`}</p></td>
                          <td className="px-4 py-4"><span className="inline-flex rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold text-slate-400">{product.category || "Sin categoría"}</span></td>
                          <td className="px-4 py-4 font-bold text-slate-400">{stats.costLabel}</td>
                          <td className="px-4 py-4 font-black text-cyan-100">{stats.priceLabel}</td>
                          <td className="px-4 py-4"><DarkStatusBadge tone={productMarginTone}>{stats.avgMargin.toFixed(1)}%</DarkStatusBadge></td>
                          <td className={`px-4 py-4 font-black ${product.track_inventory ? darkToneStyles[statusTone].text : "text-slate-500"}`}>{product.track_inventory ? stats.stockLabel : "Sin control"}</td>
                          <td className="px-4 py-4"><DarkStatusBadge tone={statusTone}>{product.status === "archived" ? "Archivado" : stockState.label}</DarkStatusBadge></td>
                          <td className="px-4 py-4"><ProductRowActions appearance="dark" editHref={`/app/productos/${product.id}/editar`} hasStock={stats.totalStock > 0} productId={product.id} status={product.status === "archived" ? "archived" : "active"} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 xl:hidden">
                {sortedProducts.map((product) => {
                  const stats = productStats(product, currency);
                  const stockState = stockStatus(product);
                  const statusTone = product.status === "archived" ? "neutral" : stockState.tone;
                  const productMarginTone = marginTone(stats.avgMargin);
                  return (
                    <article key={product.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition duration-200 hover:border-cyan-300/25 hover:bg-white/[0.055]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-black text-white">{productInitial(product.name)}</span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/app/productos/${product.id}/editar`} className="block truncate text-base font-black text-white">{product.name}</Link>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-500">{product.brand || "Sin marca"} · {product.category || "Sin categoría"}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">{stats.isMeasured && <DarkStatusBadge tone="brand">Por medida</DarkStatusBadge>}<DarkStatusBadge tone={statusTone}>{product.status === "archived" ? "Archivado" : stockState.label}</DarkStatusBadge></div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07]">
                        <ProductMobileMetric label="Costo" value={stats.costLabel} />
                        <ProductMobileMetric label="Precio" value={stats.priceLabel} valueClass="text-cyan-100" />
                        <ProductMobileMetric label="Existencias" value={product.track_inventory ? stats.stockLabel : "Sin control"} valueClass={darkToneStyles[statusTone].text} />
                        <ProductMobileMetric label="Margen" value={`${stats.avgMargin.toFixed(1)}%`} valueClass={darkToneStyles[productMarginTone].text} />
                      </div>
                      <p className="mt-3 text-xs font-semibold text-slate-500">{stats.variantCount === 1 ? product.product_variants?.[0]?.name || "Variante principal" : `${stats.variantCount} variantes activas`}</p>
                      <ProductRowActions appearance="dark" editHref={`/app/productos/${product.id}/editar`} hasStock={stats.totalStock > 0} productId={product.id} status={product.status === "archived" ? "archived" : "active"} variant="block" />
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {!error && sortedProducts.length > 0 && (
            <nav className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row" aria-label="Paginación de productos">
              <Link href={{ pathname: "/app/productos", query: { ...params, page: Math.max(page - 1, 1) } }} className={`${dashboardSecondaryActionClass} w-full sm:w-auto ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>Anterior</Link>
              <p className="text-sm font-black text-slate-500">Página {page} de {totalPages}</p>
              <Link href={{ pathname: "/app/productos", query: { ...params, page: Math.min(page + 1, totalPages) } }} className={`${dashboardSecondaryActionClass} w-full sm:w-auto ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}>Siguiente</Link>
            </nav>
          )}
        </div>
      </DashboardShell>
    </main>
  );
}

function ProductMobileMetric({ label, value, valueClass = "text-slate-100" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="min-w-0 bg-[#081524] px-3 py-3">
      <p className="text-[0.64rem] font-black uppercase tracking-[0.09em] text-slate-600">{label}</p>
      <p className={`mt-1 truncate text-sm font-black ${valueClass}`}>{value}</p>
    </div>
  );
}
