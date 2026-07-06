import Link from "next/link";
import { redirect } from "next/navigation";
import { ComboRowActions } from "@/components/combos/combo-row-actions";
import { ProductAnalyticsEvent } from "@/components/products/product-analytics";
import { SemanticBadge, ToneCard, semanticToneStyles, type SemanticTone } from "@/components/ui/semantic";
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

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">
      <ProductAnalyticsEvent eventName="combo_module_view" />
      <div className="w-full max-w-none space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
                Combos
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
                Combos y kits
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#475569]">
                Crea paquetes rentables combinando productos de tu catálogo.
              </p>
            </div>
            {hasProducts ? (
              <Link
                href="/app/combos/nuevo"
                className="rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-center text-base font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
              >
                Nuevo combo
              </Link>
            ) : (
              <Link
                href="/app/productos/nuevo"
                className="rounded-full bg-white px-6 py-4 text-center text-base font-black text-[#2563EB] ring-1 ring-[#BFDBFE]"
              >
                Primero agrega productos
              </Link>
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Combos activos", activeCombos.length, "positive"],
            ["Combos archivados", archivedCombos.length, "neutral"],
            ["Mejor margen estimado", `${bestMargin.toFixed(1)}%`, comboMarginTone(bestMargin)],
            ["Con stock disponible", combosWithStock, combosWithStock > 0 ? "positive" : "warning"],
          ].map(([label, value, tone]) => (
            <ToneCard
              key={label}
              tone={tone as SemanticTone}
            >
              <p className="text-sm font-black text-[#475569]">{label}</p>
              <p className="mt-3 text-3xl font-black text-[#0F172A]">{value}</p>
            </ToneCard>
          ))}
        </section>

        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,190px))]">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por combo o categoría"
              className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
            />
            <select name="status" defaultValue={status} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="active">Activos</option>
              <option value="archived">Archivados</option>
              <option value="all">Todos</option>
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
              <option value="margin">Mayor margen</option>
              <option value="stock">Menor disponibilidad</option>
            </select>
            <input type="hidden" name="page" value="1" />
            <button className="rounded-full bg-[#0F172A] px-5 py-3 text-sm font-black text-white lg:col-start-4">
              Aplicar
            </button>
          </form>
        </section>

        {error ? (
          <section className="rounded-[2rem] border border-[#FECACA] bg-[#FEE2E2] p-6 text-[#991B1B]">
            <h2 className="text-xl font-black">No pudimos cargar combos</h2>
            <p className="mt-2 text-sm font-bold">
              Revisa que la migración 005_combos.sql exista en Supabase.
            </p>
          </section>
        ) : !hasProducts ? (
          <section className="rounded-[2rem] border border-dashed border-[#BFDBFE] bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-[#0F172A]">Primero agrega productos</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#475569]">
              Para crear un combo necesitas tener productos activos en tu catálogo.
            </p>
            <Link
              href="/app/productos/nuevo"
              className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-center text-sm font-black text-white"
            >
              Ir a productos
            </Link>
          </section>
        ) : !comboList.length ? (
          <section className="rounded-[2rem] border border-dashed border-[#BFDBFE] bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-[#0F172A]">Crea tu primer combo</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#475569]">
              Combina productos de tu catálogo y Margenia calculará costo, precio
              sugerido y margen.
            </p>
            <Link
              href="/app/combos/nuevo"
              className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-center text-sm font-black text-white"
            >
              Crear combo
            </Link>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-sm">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs uppercase tracking-[0.12em] text-[#475569]">
                  <tr>
                    {["Combo", "Productos incluidos", "Costo", "Precio", "Margen", "Stock posible", "Estado", "Acciones"].map((header) => (
                      <th key={header} className="px-5 py-4 font-black">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {comboList.map((combo) => {
                    const stats = comboStats(combo);
                    const statusValue = combo.status === "archived" ? "archived" : "active";

                    return (
                      <tr key={combo.id} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-black text-[#0F172A]">{combo.name}</p>
                          <p className="mt-1 text-xs text-[#475569]">
                            {combo.category || "Sin categoría"}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-bold text-[#0F172A]">
                          {stats.itemCount} productos
                        </td>
                        <td className="px-5 py-4 font-bold text-[#0F172A]">
                          {formatter.format(stats.baseCost)}
                        </td>
                        <td className="px-5 py-4 font-bold text-[#0F172A]">
                          {formatter.format(toSafeNumber(combo.sale_price))}
                        </td>
                        <td className={`px-5 py-4 font-black ${semanticToneStyles[comboMarginTone(stats.margin)].text}`}>
                          {stats.margin.toFixed(1)}%
                        </td>
                        <td className="px-5 py-4">
                          <SemanticBadge tone={comboStockTone(stats.stock)}>
                          {comboStockLabel(stats.stock)}
                          </SemanticBadge>
                        </td>
                        <td className="px-5 py-4">
                          <SemanticBadge tone={comboStatusTone(combo.status)}>
                            {comboStatusLabel(combo.status)}
                          </SemanticBadge>
                        </td>
                        <td className="px-5 py-4">
                          <ComboRowActions
                            comboId={combo.id}
                            editHref={`/app/combos/${combo.id}/editar`}
                            status={statusValue}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {comboList.map((combo) => {
                const stats = comboStats(combo);
                const statusValue = combo.status === "archived" ? "archived" : "active";

                return (
                  <article
                    key={combo.id}
                    className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4 shadow-sm"
                  >
                    <p className="text-lg font-black text-[#0F172A]">{combo.name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#475569]">
                      <span>{stats.itemCount} productos</span>
                      <SemanticBadge tone={comboStockTone(stats.stock)} className="px-2 py-0.5 text-[10px]">
                        {comboStockLabel(stats.stock)}
                      </SemanticBadge>
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <p>
                        <span className="block text-[#475569]">Precio</span>
                        <strong>{formatter.format(toSafeNumber(combo.sale_price))}</strong>
                      </p>
                      <p>
                        <span className="block text-[#475569]">Margen</span>
                        <strong className={semanticToneStyles[comboMarginTone(stats.margin)].text}>{stats.margin.toFixed(1)}%</strong>
                      </p>
                    </div>
                    <ComboRowActions
                      comboId={combo.id}
                      editHref={`/app/combos/${combo.id}/editar`}
                      status={statusValue}
                      variant="block"
                    />
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex flex-col items-center justify-between gap-3 rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4 sm:flex-row">
          <Link
            href={{ pathname: "/app/combos", query: { ...params, page: Math.max(page - 1, 1) } }}
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
            href={{ pathname: "/app/combos", query: { ...params, page: Math.min(page + 1, totalPages) } }}
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
