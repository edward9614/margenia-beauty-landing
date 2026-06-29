import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InventorySettingsForm } from "@/components/inventory/inventory-settings-form";
import {
  inventoryStatus,
  inventoryUnitLabel,
  inventoryValue,
  movementTypeLabel,
  statusClass,
  type InventoryMovementRow,
  type InventoryVariant,
} from "@/lib/inventory";
import { moneyFormatter, toSafeNumber } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = await params;
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

  const [{ data: variantRow }, { data: movements }, { data: sales }, { data: counts }] =
    await Promise.all([
      supabase
        .from("product_variants")
        .select(
          "id,product_id,name,sku,purchase_cost,current_stock,low_stock_threshold,inventory_location,last_counted_at,inventory_mode,inventory_unit,default_sale_unit,status,products!inner(id,name,status,track_inventory,unit)",
        )
        .eq("business_id", business.id)
        .eq("id", variantId)
        .maybeSingle(),
      supabase
        .from("inventory_movements")
        .select("id,movement_code,movement_type,quantity,stock_unit,total_cost,reason,balance_after,source,notes,created_at")
        .eq("business_id", business.id)
        .eq("variant_id", variantId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("sale_items")
        .select("id,item_name,quantity,quantity_unit,total_amount,created_at,sales(sale_code,sale_date,status)")
        .eq("business_id", business.id)
        .eq("variant_id", variantId)
        .limit(10),
      supabase
        .from("inventory_count_items")
        .select("id,counted_stock,difference_quantity,stock_unit,total_difference_cost,created_at,inventory_counts(count_code,counted_at,status)")
        .eq("business_id", business.id)
        .eq("variant_id", variantId)
        .limit(10),
    ]);

  if (!variantRow) notFound();

  const rawVariant = variantRow as unknown as InventoryVariant & {
    products?: { name: string; status: string | null; track_inventory: boolean | null; unit: string | null };
  };
  const variant: InventoryVariant = {
    ...rawVariant,
    product_name: rawVariant.products?.name || "Producto",
    product_status: rawVariant.products?.status || "active",
    track_inventory: rawVariant.products?.track_inventory ?? true,
    unit: rawVariant.products?.unit || "Unidad",
  };
  const formatter = moneyFormatter(business.currency || "COP");
  const status = inventoryStatus(variant);
  const movementRows = (movements || []) as unknown as InventoryMovementRow[];

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7">
          <Link href="/app/inventario" className="text-sm font-black text-[#2563EB]">
            ← Volver a inventario
          </Link>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
                Detalle de inventario
              </p>
              <h1 className="mt-2 text-3xl font-black text-[#0F172A]">{variant.product_name}</h1>
              <p className="mt-2 text-sm font-bold text-[#475569]">
                {variant.name || "Presentación estándar"} · SKU {variant.sku || "sin SKU"}
              </p>
            </div>
            <Link href="/app/inventario/ajuste" className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-6 py-4 text-sm font-black text-white">
              Registrar movimiento
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Stock actual", `${toSafeNumber(variant.current_stock)} ${inventoryUnitLabel(variant.inventory_unit)}`],
            [
              "Alerta stock bajo",
              status.hasLowStockAlertConfigured
                ? `${toSafeNumber(variant.low_stock_threshold)} ${inventoryUnitLabel(variant.inventory_unit)}`
                : "Alerta sin configurar",
            ],
            ["Costo actual", formatter.format(toSafeNumber(variant.purchase_cost))],
            ["Valor estimado", formatter.format(inventoryValue(variant))],
          ].map(([label, value]) => (
            <article key={label} className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-[#475569]">{label}</p>
              <p className="mt-3 text-2xl font-black text-[#0F172A]">{value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-[#0F172A]">Historial de movimientos</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(status.tone)}`}>
                  {status.label}
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {movementRows.length ? (
                  movementRows.map((movement) => (
                    <div key={movement.id} className="flex items-start justify-between gap-4 rounded-2xl bg-[#F8FAFC] p-4">
                      <div>
                        <p className="font-black text-[#0F172A]">{movementTypeLabel(movement.movement_type)}</p>
                        <p className="text-sm font-bold text-[#475569]">
                          {new Date(movement.created_at).toLocaleString("es-CO")} · {movement.reason || movement.source || "Sin motivo"}
                        </p>
                      </div>
                      <p className="font-black text-[#0F172A]">
                        {toSafeNumber(movement.quantity)} {inventoryUnitLabel(movement.stock_unit)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-[#F8FAFC] p-4 text-sm font-bold text-[#475569]">
                    Sin movimientos registrados.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-[#0F172A]">Ventas relacionadas</h2>
              <p className="mt-3 text-sm font-bold text-[#475569]">
                {sales?.length ? `${sales.length} ventas recientes relacionadas.` : "Sin ventas recientes para esta presentación."}
              </p>
            </article>

            <article className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-[#0F172A]">Conteos relacionados</h2>
              <p className="mt-3 text-sm font-bold text-[#475569]">
                {counts?.length ? `${counts.length} conteos recientes relacionados.` : "Sin conteos físicos todavía."}
              </p>
            </article>
          </div>

          <InventorySettingsForm
            inventoryLocation={variant.inventory_location || ""}
            lowStockThreshold={String(variant.low_stock_threshold || "")}
            unitLabel={variant.inventory_mode === "measured" ? inventoryUnitLabel(variant.inventory_unit) : "unidades"}
            variantId={variant.id}
          />
        </section>
      </div>
    </main>
  );
}
