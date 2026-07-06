import Link from "next/link";
import { redirect } from "next/navigation";
import { loadInventoryVariants } from "@/app/(dashboard)/app/inventario/actions";
import { ProductAnalyticsEvent } from "@/components/products/product-analytics";
import { ActionHelp } from "@/components/ui/action-help";
import { SemanticBadge, ToneCard, type SemanticTone } from "@/components/ui/semantic";
import { TableHeaderHelp } from "@/components/ui/table-header-help";
import {
  inventoryStatus,
  inventoryThreshold,
  inventoryUnitLabel,
  inventoryValue,
  type InventoryVariant,
} from "@/lib/inventory";
import { inventoryHelp } from "@/lib/help-content";
import { moneyFormatter, toSafeNumber } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams | undefined, key: string, fallback = "") {
  const value = params?.[key];
  return typeof value === "string" ? value : fallback;
}

function matchesFilter(variant: InventoryVariant, filter: string) {
  const status = inventoryStatus(variant);

  if (filter === "low") return status.status === "low_stock";
  if (filter === "out") return status.status === "out_of_stock";
  if (filter === "with_stock") return toSafeNumber(variant.current_stock) > 0;
  if (filter === "measured") return variant.inventory_mode === "measured";
  return true;
}

function alertLabel(variant: InventoryVariant) {
  const threshold = inventoryThreshold(variant);

  if (threshold <= 0) {
    return "Alerta sin configurar";
  }

  return `${threshold.toLocaleString("es-CO")} ${inventoryUnitLabel(variant.inventory_unit)}`;
}

function inventoryTone(tone: "danger" | "neutral" | "success" | "warning"): SemanticTone {
  if (tone === "danger") return "negative";
  if (tone === "success") return "positive";
  return tone;
}

const tableHeaders = [
  {
    help: inventoryHelp.currentStock,
    label: "Stock actual",
  },
  { label: "Unidad" },
  {
    help: inventoryHelp.lowStockAlert,
    label: "Alerta de stock bajo",
  },
  {
    help: {
      content: "Estado calculado según el stock actual y la alerta que configures para cada producto.",
      title: "Estado",
    },
    label: "Estado",
  },
  {
    help: inventoryHelp.value,
    label: "Valor estimado",
  },
  { label: "Acciones" },
];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = getParam(params, "q").trim().toLowerCase();
  const filter = getParam(params, "filter", "all");
  const location = getParam(params, "location", "all");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) redirect("/app/onboarding");

  const variants = await loadInventoryVariants(supabase, business.id);
  const { data: monthMovements } = await supabase
    .from("inventory_movements")
    .select("id")
    .eq("business_id", business.id)
    .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
  const locations = Array.from(
    new Set(
      variants
        .map((variant) => variant.inventory_location)
        .filter((item): item is string => Boolean(item)),
    ),
  );
  const filtered = variants.filter((variant) => {
    const haystack = `${variant.product_name} ${variant.name || ""} ${variant.sku || ""}`.toLowerCase();
    return (
      (!q || haystack.includes(q)) &&
      matchesFilter(variant, filter) &&
      (location === "all" || variant.inventory_location === location)
    );
  });
  const formatter = moneyFormatter(business.currency || "COP");
  const totalValue = variants.reduce((total, variant) => total + inventoryValue(variant), 0);
  const lowStock = variants.filter((variant) => inventoryStatus(variant).status === "low_stock").length;
  const outStock = variants.filter((variant) => inventoryStatus(variant).status === "out_of_stock").length;

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <ProductAnalyticsEvent eventName={filter === "low" ? "low_stock_viewed" : "inventory_module_view"} />
      <div className="w-full max-w-none space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
                Inventario
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
                Inventario
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#475569]">
                Controla existencias, entradas, salidas, ajustes y stock bajo.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center justify-center gap-2">
                <Link
                  href="/app/inventario/ajuste"
                  className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-4 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/20"
                >
                  Registrar movimiento
                </Link>
                <ActionHelp help={inventoryHelp.movement} />
              </div>
              <div className="flex items-center justify-center gap-2">
                <Link
                  href="/app/inventario/conteo"
                  className="rounded-full border border-[#BFDBFE] bg-white px-6 py-4 text-center text-sm font-black text-[#2563EB]"
                >
                  Conteo físico
                </Link>
                <ActionHelp help={inventoryHelp.count} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Valor estimado del inventario", formatter.format(totalValue), "brand"],
            ["Productos con stock bajo", lowStock, lowStock > 0 ? "warning" : "neutral"],
            ["Productos agotados", outStock, outStock > 0 ? "negative" : "neutral"],
            ["Movimientos del mes", monthMovements?.length || 0, "info"],
          ].map(([label, value, tone]) => (
            <ToneCard key={label} tone={tone as SemanticTone}>
              <p className="text-sm font-black text-[#475569]">{label}</p>
              <p className="mt-3 text-2xl font-black text-[#0F172A]">{value}</p>
            </ToneCard>
          ))}
        </section>

        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_repeat(2,minmax(150px,190px))_auto]">
            <input
              name="q"
              defaultValue={getParam(params, "q")}
              placeholder="Buscar por producto, variante o SKU"
              className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
            />
            <select name="filter" defaultValue={filter} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="all">Todos</option>
              <option value="low">Stock bajo</option>
              <option value="out">Agotados</option>
              <option value="with_stock">Con inventario</option>
              <option value="measured">Por medida</option>
            </select>
            <select name="location" defaultValue={location} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="all">Todas las ubicaciones</option>
              {locations.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button className="rounded-2xl bg-[#0F172A] px-5 py-3 text-sm font-black text-white">
              Filtrar
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-sm">
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">
                <tr>
                  <th className="px-5 py-4">Producto</th>
                  <th className="px-5 py-4">Variante</th>
                  {tableHeaders.map((header) => (
                    <th key={header.label} className="px-5 py-4">
                      <TableHeaderHelp help={header.help} label={header.label} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map((variant) => {
                  const status = inventoryStatus(variant);

                  return (
                    <tr key={variant.id}>
                      <td className="px-5 py-4 font-black text-[#0F172A]">{variant.product_name}</td>
                      <td className="px-5 py-4 text-[#475569]">{variant.name || "Presentación estándar"}</td>
                      <td className="px-5 py-4 font-black text-[#0F172A]">{toSafeNumber(variant.current_stock).toLocaleString("es-CO")}</td>
                      <td className="px-5 py-4">{inventoryUnitLabel(variant.inventory_unit)}</td>
                      <td className="px-5 py-4 text-[#475569]">{alertLabel(variant)}</td>
                      <td className="px-5 py-4">
                        <SemanticBadge tone={inventoryTone(status.tone)}>{status.label}</SemanticBadge>
                      </td>
                      <td className="px-5 py-4">{formatter.format(inventoryValue(variant))}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-2">
                            <Link href={`/app/inventario/${variant.id}`} className="font-black text-[#2563EB]">Ver</Link>
                            <ActionHelp
                              help={{
                                content: "Abre el detalle del producto para revisar stock, movimientos, ubicación y configuración.",
                                title: "Ver detalle",
                              }}
                            />
                          </span>
                          <Link href={`/app/inventario/${variant.id}#alerta-stock`} className="font-black text-[#0891B2]">
                            Configurar alerta
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 p-4 lg:hidden">
            {filtered.map((variant) => {
              const status = inventoryStatus(variant);

              return (
                <article key={variant.id} className="rounded-[1.5rem] border border-[#E2E8F0] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#0F172A]">{variant.product_name}</p>
                      <p className="text-sm font-bold text-[#475569]">{variant.name || "Presentación estándar"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-2">
                        <Link href={`/app/inventario/${variant.id}`} className="font-black text-[#2563EB]">Ver</Link>
                        <ActionHelp
                          help={{
                            content: "Abre el detalle del producto para revisar stock, movimientos, ubicación y configuración.",
                            title: "Ver detalle",
                          }}
                        />
                      </span>
                      <Link href={`/app/inventario/${variant.id}#alerta-stock`} className="text-xs font-black text-[#0891B2]">
                        Configurar alerta
                      </Link>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <p><span className="block font-bold text-[#64748B]">Stock</span>{toSafeNumber(variant.current_stock)} {inventoryUnitLabel(variant.inventory_unit)}</p>
                    <p>
                      <span className="block font-bold text-[#64748B]">Estado</span>
                      <SemanticBadge tone={inventoryTone(status.tone)} className="mt-1">
                        {status.label}
                      </SemanticBadge>
                    </p>
                    <p><span className="block font-bold text-[#64748B]">Valor</span>{formatter.format(inventoryValue(variant))}</p>
                    <p><span className="block font-bold text-[#64748B]">Alerta</span>{alertLabel(variant)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
