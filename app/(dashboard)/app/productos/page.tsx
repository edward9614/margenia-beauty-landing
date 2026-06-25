import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductAnalyticsEvent } from "@/components/products/product-analytics";
import { createClient } from "@/lib/supabase/server";
import {
  calculateVariantProfit,
  moneyFormatter,
  type ProductRow,
  type ProductVariantRow,
} from "@/lib/products/product-utils";

const pageSize = 20;

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams | undefined, key: string, fallback = "") {
  const value = params?.[key];
  return typeof value === "string" ? value : fallback;
}

function productInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "P";
}

type StockTone = "danger" | "neutral" | "success" | "warning";

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
    return { label: "Agotado", tone: "danger" as StockTone };
  }

  if (totalStock <= minimumStock) {
    return { label: "Stock bajo", tone: "warning" as StockTone };
  }

  return { label: "Normal", tone: "success" as StockTone };
}

function statusClass(tone: StockTone) {
  if (tone === "danger") {
    return "bg-[#FEE2E2] text-[#991B1B]";
  }

  if (tone === "warning") {
    return "bg-[#FEF3C7] text-[#92400E]";
  }

  if (tone === "success") {
    return "bg-[#DCFCE7] text-[#166534]";
  }

  return "bg-[#F8FAFC] text-[#475569] ring-1 ring-[#E2E8F0]";
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
      minCost === maxCost ? formatter.format(maxCost) : `${formatter.format(minCost)} - ${formatter.format(maxCost)}`,
    priceLabel:
      minPrice === maxPrice ? formatter.format(maxPrice) : `${formatter.format(minPrice)} - ${formatter.format(maxPrice)}`,
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
    .select("id,track_inventory,product_variants(current_stock,minimum_stock,status)")
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
      "id,name,brand,category,unit,product_type,track_inventory,status,created_at,product_variants(id,name,sku,purchase_cost,packaging_cost,commission_percent,desired_margin_percent,sale_price,current_stock,minimum_stock,status)",
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
    .select("id,track_inventory,status,product_variants(id,purchase_cost,current_stock,minimum_stock,status)")
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

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">
      <ProductAnalyticsEvent eventName="product_module_view" />
      <div className="w-full max-w-none space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
                Catálogo
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
                Productos
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#475569]">
                Organiza productos, variantes, costos, precios y existencias desde
                un solo lugar.
              </p>
            </div>
            <Link
              href="/app/productos/nuevo"
              className="rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-center text-base font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
            >
              Nuevo producto
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Productos activos", activeProducts.length],
            ["Variantes activas", activeVariants.length],
            ["Stock bajo", stockLowCount],
            ["Valor inventario al costo", formatter.format(inventoryCostValue)],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-black text-[#475569]">{label}</p>
              <p className="mt-3 text-3xl font-black text-[#0F172A]">{value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(150px,190px))]">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por producto, variante, SKU o marca"
              className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
            />
            <select name="status" defaultValue={status} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="active">Activos</option>
              <option value="archived">Archivados</option>
              <option value="all">Todos</option>
            </select>
            <select name="stock" defaultValue={stock} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="all">Todo stock</option>
              <option value="normal">Normal</option>
              <option value="low">Stock bajo</option>
              <option value="out">Agotado</option>
              <option value="no_control">Sin control</option>
            </select>
            <select name="category" defaultValue={category} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="all">Todas las categorías</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="recent">Más recientes</option>
              <option value="name">Nombre A-Z</option>
              <option value="stock">Menor stock</option>
              <option value="value">Mayor valor</option>
              <option value="margin">Mayor margen</option>
            </select>
            <input type="hidden" name="page" value="1" />
            <button className="rounded-full bg-[#0F172A] px-5 py-3 text-sm font-black text-white lg:col-start-5">
              Aplicar
            </button>
          </form>
        </section>

        {error ? (
          <section className="rounded-[2rem] border border-[#FECACA] bg-[#FEE2E2] p-6 text-[#991B1B]">
            <h2 className="text-xl font-black">No pudimos cargar productos</h2>
            <p className="mt-2 text-sm font-bold">
              Revisa que la migración 002_products_catalog.sql exista en Supabase.
            </p>
          </section>
        ) : !sortedProducts.length ? (
          <section className="rounded-[2rem] border border-dashed border-[#BFDBFE] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-28 w-28 place-items-center rounded-[2rem] bg-[#EFF6FF]">
              <div className="h-14 w-14 rounded-2xl border-4 border-[#2563EB] bg-white" />
            </div>
            <h2 className="mt-6 text-2xl font-black text-[#0F172A]">
              {q || status !== "active" || stock !== "all" || category !== "all"
                ? "No encontramos productos"
                : "Crea tu primer producto"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#475569]">
              {q || status !== "active" || stock !== "all" || category !== "all"
                ? "Prueba cambiar los filtros o busca con otro término."
                : "Agrega costos, precios y existencias para comenzar a entender la rentabilidad de tu negocio."}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/app/productos/nuevo"
                className="rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-center text-sm font-black text-white"
              >
                Crear producto
              </Link>
              <Link
                href="/app/productos"
                className="rounded-full bg-white px-6 py-4 text-center text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE]"
              >
                Limpiar filtros
              </Link>
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-sm">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs uppercase tracking-[0.12em] text-[#475569]">
                  <tr>
                    {[
                      "Producto",
                      "Variante(s)",
                      "Categoría",
                      "Costo",
                      "Precio",
                      "Margen",
                      "Existencias",
                      "Estado",
                      "Acciones",
                    ].map((header) => (
                      <th key={header} className="px-5 py-4 font-black">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {sortedProducts.map((product) => {
                    const stats = productStats(product, currency);
                    const stock = stockStatus(product);
                    return (
                      <tr key={product.id} className="align-top">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EFF6FF] text-sm font-black text-[#2563EB]">
                              {productInitial(product.name)}
                            </div>
                            <div>
                              <p className="font-black text-[#0F172A]">{product.name}</p>
                              {product.brand && (
                                <p className="mt-1 text-xs font-bold text-[#475569]">
                                  {product.brand}
                                </p>
                              )}
                              {product.product_variants?.[0]?.sku && (
                                <p className="mt-1 text-xs text-[#64748B]">
                                  SKU {product.product_variants[0].sku}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-[#0F172A]">
                          {stats.variantCount === 1
                            ? product.product_variants?.[0]?.name
                            : `${stats.variantCount} variantes`}
                        </td>
                        <td className="px-5 py-4 text-[#475569]">
                          {product.category || "Sin categoría"}
                        </td>
                        <td className="px-5 py-4 font-bold text-[#0F172A]">
                          {stats.costLabel}
                        </td>
                        <td className="px-5 py-4 font-bold text-[#0F172A]">
                          {stats.priceLabel}
                        </td>
                        <td className="px-5 py-4 font-bold text-[#0F172A]">
                          {stats.avgMargin.toFixed(1)}%
                        </td>
                        <td className="px-5 py-4 text-[#475569]">
                          {product.track_inventory
                            ? `${stats.totalStock} ${product.unit}`
                            : "Sin control de stock"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(stock.tone)}`}>
                            {product.status === "archived" ? "Archivado" : stock.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/app/productos/${product.id}/editar`}
                            className="rounded-full bg-[#EFF6FF] px-4 py-2 text-xs font-black text-[#2563EB] ring-1 ring-[#BFDBFE]"
                          >
                            Editar
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {sortedProducts.map((product) => {
                const stats = productStats(product, currency);
                const stock = stockStatus(product);
                return (
                  <article
                    key={product.id}
                    className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-black text-[#0F172A]">{product.name}</p>
                        <p className="mt-1 text-sm text-[#475569]">
                          {product.brand || "Sin marca"} · {product.category || "Sin categoría"}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(stock.tone)}`}>
                        {product.status === "archived" ? "Archivado" : stock.label}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <p>
                        <span className="block text-[#475569]">Variantes</span>
                        <strong>{stats.variantCount}</strong>
                      </p>
                      <p>
                        <span className="block text-[#475569]">Precio</span>
                        <strong>{stats.priceLabel}</strong>
                      </p>
                      <p>
                        <span className="block text-[#475569]">Existencias</span>
                        <strong>
                          {product.track_inventory ? stats.totalStock : "Sin control"}
                        </strong>
                      </p>
                      <p>
                        <span className="block text-[#475569]">Margen</span>
                        <strong>{stats.avgMargin.toFixed(1)}%</strong>
                      </p>
                    </div>
                    <Link
                      href={`/app/productos/${product.id}/editar`}
                      className="mt-4 block rounded-full bg-[#EFF6FF] px-4 py-3 text-center text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE]"
                    >
                      Editar
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex flex-col items-center justify-between gap-3 rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4 sm:flex-row">
          <Link
            href={{
              pathname: "/app/productos",
              query: { ...params, page: Math.max(page - 1, 1) },
            }}
            className={`rounded-full px-5 py-3 text-sm font-black ring-1 ring-[#BFDBFE] ${
              page <= 1
                ? "pointer-events-none bg-[#F8FAFC] text-[#94A3B8]"
                : "bg-white text-[#2563EB]"
            }`}
          >
            Anterior
          </Link>
          <p className="text-sm font-black text-[#475569]">
            Página {page} de {totalPages}
          </p>
          <Link
            href={{
              pathname: "/app/productos",
              query: { ...params, page: Math.min(page + 1, totalPages) },
            }}
            className={`rounded-full px-5 py-3 text-sm font-black ring-1 ring-[#BFDBFE] ${
              page >= totalPages
                ? "pointer-events-none bg-[#F8FAFC] text-[#94A3B8]"
                : "bg-white text-[#2563EB]"
            }`}
          >
            Siguiente
          </Link>
        </div>
      </div>
    </main>
  );
}
