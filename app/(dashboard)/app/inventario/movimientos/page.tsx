import Link from "next/link";
import { redirect } from "next/navigation";
import { SemanticBadge, semanticToneStyles, type SemanticTone } from "@/components/ui/semantic";
import {
  inventoryUnitLabel,
  movementTypeLabel,
  type InventoryMovementRow,
} from "@/lib/inventory";
import { moneyFormatter, toSafeNumber } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams | undefined, key: string, fallback = "") {
  const value = params?.[key];
  return typeof value === "string" ? value : fallback;
}

function movementTone(movement: InventoryMovementRow): SemanticTone {
  if (movement.movement_type === "purchase" || movement.movement_type === "return" || movement.movement_type === "sale_void") {
    return "positive";
  }

  if (movement.movement_type === "waste" || movement.movement_type === "sale") {
    return "negative";
  }

  if (movement.source === "count") {
    return "info";
  }

  if (movement.movement_type === "adjustment") {
    const quantity = toSafeNumber(movement.quantity);
    if (quantity > 0) return "positive";
    if (quantity < 0) return "negative";
    return "warning";
  }

  return "neutral";
}

function movementSourceLabel(source: string | null | undefined) {
  if (source === "sale") return "Venta";
  if (source === "sale_void") return "Anulación";
  if (source === "count") return "Conteo";
  if (source === "manual") return "Manual";
  return "Manual";
}

export default async function InventoryMovementsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = getParam(params, "q").trim().toLowerCase();
  const date = getParam(params, "date");
  const type = getParam(params, "type", "all");
  const source = getParam(params, "source", "all");
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

  let query = supabase
    .from("inventory_movements")
    .select(
      "id,movement_code,movement_type,quantity,stock_unit,total_cost,reference_type,reference_id,reason,balance_after,source,notes,created_at,product_variants(name,sku,products(name))",
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (type !== "all") query = query.eq("movement_type", type);
  if (source !== "all") query = query.eq("source", source);
  if (date) {
    const dateStart = new Date(`${date}T00:00:00`);
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);
    query = query.gte("created_at", dateStart.toISOString()).lt("created_at", dateEnd.toISOString());
  }

  const { data: movements } = await query;
  const rows = ((movements || []) as unknown as InventoryMovementRow[]).filter((movement) => {
    if (!q) return true;

    return `${movement.product_variants?.products?.name || ""} ${movement.product_variants?.name || ""} ${movement.product_variants?.sku || ""}`
      .toLowerCase()
      .includes(q);
  });
  const formatter = moneyFormatter(business.currency || "COP");

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
                Inventario
              </p>
              <h1 className="mt-2 text-3xl font-black text-[#0F172A]">Movimientos</h1>
              <p className="mt-2 text-sm font-bold text-[#475569]">
                Consulta entradas, salidas, ventas, anulaciones, mermas y conteos.
              </p>
            </div>
            <Link href="/app/inventario/ajuste" className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-4 text-sm font-black text-white">
              Registrar movimiento
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_auto]">
            <input
              name="q"
              defaultValue={getParam(params, "q")}
              placeholder="Buscar producto, variante o SKU"
              className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm"
            />
            <select name="type" defaultValue={type} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="all">Todos los tipos</option>
              <option value="purchase">Entrada</option>
              <option value="adjustment">Ajuste</option>
              <option value="return">Devolución</option>
              <option value="waste">Merma</option>
              <option value="sale">Venta</option>
              <option value="sale_void">Anulación</option>
            </select>
            <select name="source" defaultValue={source} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <option value="all">Todos los orígenes</option>
              <option value="manual">Manual</option>
              <option value="sale">Venta</option>
              <option value="sale_void">Anulación</option>
              <option value="count">Conteo</option>
            </select>
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm"
            />
            <button className="rounded-2xl bg-[#0F172A] px-5 py-3 text-sm font-black text-white">Filtrar</button>
          </form>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">
                <tr>
                  {["Fecha", "Producto", "Tipo", "Cantidad", "Stock después", "Motivo", "Referencia", "Costo"].map((header) => (
                    <th key={header} className="px-5 py-4">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {rows.map((movement) => {
                  const tone = movementTone(movement);
                  const styles = semanticToneStyles[tone];

                  return (
                    <tr key={movement.id} className={`border-l-4 ${styles.border} align-top`}>
                      <td className="px-5 py-4 text-[#475569]">{new Date(movement.created_at).toLocaleString("es-CO")}</td>
                      <td className="px-5 py-4 font-black text-[#0F172A]">
                        {movement.product_variants?.products?.name || "Producto"} · {movement.product_variants?.name || "Presentación"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <SemanticBadge tone={tone}>
                            {movementTypeLabel(movement.movement_type)}
                          </SemanticBadge>
                          <span className="text-xs font-bold text-[#64748B]">{movementSourceLabel(movement.source)}</span>
                        </div>
                      </td>
                      <td className={`px-5 py-4 font-black ${styles.text}`}>{toSafeNumber(movement.quantity).toLocaleString("es-CO")} {inventoryUnitLabel(movement.stock_unit)}</td>
                      <td className="px-5 py-4">{movement.balance_after ?? "—"}</td>
                      <td className="px-5 py-4">{movement.reason || movement.notes || "Sin motivo"}</td>
                      <td className="px-5 py-4">{movement.reference_type || "Manual"}</td>
                      <td className="px-5 py-4">{formatter.format(toSafeNumber(movement.total_cost))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <div className="p-8 text-center">
              <h2 className="text-2xl font-black text-[#0F172A]">Sin movimientos todavía</h2>
              <p className="mt-2 text-sm font-bold text-[#475569]">Aquí aparecerá el historial de inventario.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
