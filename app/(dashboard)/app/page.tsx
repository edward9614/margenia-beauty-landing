import { redirect } from "next/navigation";
import { ActivationProgressCard } from "@/components/dashboard/activation-progress-card";
import { BusinessPerformancePanel } from "@/components/dashboard/business-performance-panel";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  BoxIcon,
  ProfitIcon,
  SalesIcon,
  WalletIcon,
} from "@/components/dashboard/dashboard-icons";
import { MetricCard } from "@/components/dashboard/metric-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import {
  AlertsCard,
  BusinessStatusCard,
  MargeniaInsightCard,
} from "@/components/dashboard/side-panels";
import {
  buildDailyPerformanceSeries,
  getDashboardPerformanceData,
  getPerformanceDateRange,
  type DashboardSaleRow,
} from "@/lib/dashboard/performance";
import { dashboardHelp } from "@/lib/help-content";
import {
  moneyFormatter,
  type ProductRow,
  type ProductVariantRow,
} from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AppHomePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const performanceRange = getPerformanceDateRange(params);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name,business_type,country,currency,primary_channel")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) {
    redirect("/app/onboarding");
  }

  const displayName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : user.email?.split("@")[0] || "emprendedora";
  const { data: productRows } = await supabase
    .from("products")
    .select("id,status,track_inventory,product_variants(id,purchase_cost,current_stock,low_stock_threshold,status)")
    .eq("business_id", business.id);
  const { data: comboRows } = await supabase
    .from("combos")
    .select("id,status")
    .eq("business_id", business.id);
  const { data: saleRows } = await supabase
    .from("sales")
    .select("id,sale_date,status,payment_status,total_amount,balance_due,gross_profit")
    .eq("business_id", business.id)
    .eq("status", "completed")
    .gte("sale_date", performanceRange.startIso)
    .lte("sale_date", performanceRange.endIso)
    .order("sale_date", { ascending: true });
  const { data: inventoryMovementRows } = await supabase
    .from("inventory_movements")
    .select("id")
    .eq("business_id", business.id)
    .limit(1);
  const { data: inventoryCountRows } = await supabase
    .from("inventory_counts")
    .select("id")
    .eq("business_id", business.id)
    .limit(1);
  const typedProductRows = (productRows || []) as ProductRow[];
  const activeProducts = typedProductRows.filter(
    (product) => product.status === "active",
  );
  const activeVariants = activeProducts.flatMap((product) =>
    (product.product_variants || [])
      .filter((variant) => variant.status === "active")
      .map((variant) => ({
        ...variant,
        trackInventory: product.track_inventory,
      })),
  );
  const inventoryValue = activeVariants.reduce(
    (total: number, variant: ProductVariantRow) =>
      total + Number(variant.current_stock || 0) * Number(variant.purchase_cost || 0),
    0,
  );
  const hasProducts = activeProducts.length > 0;
  const hasCombos = Boolean(
    ((comboRows || []) as { id: string; status: string | null }[]).some(
      (combo) => combo.status === "active",
    ),
  );
  const typedSaleRows = (saleRows || []) as {
    id: string;
    payment_status: string | null;
    sale_date: string;
    status: string | null;
    total_amount: number | string | null;
    balance_due: number | string | null;
    gross_profit: number | string | null;
  }[];
  const hasSales = typedSaleRows.length > 0;
  const hasInventoryActivity = Boolean(
    (inventoryMovementRows || []).length || (inventoryCountRows || []).length,
  );
  const hasCatalog = hasProducts || hasCombos;
  const lowStockVariants = activeVariants.filter((variant) => {
    const stock = Number(variant.current_stock || 0);
    const threshold = Number(variant.low_stock_threshold || 0);

    return variant.trackInventory !== false && threshold > 0 && stock > 0 && stock <= threshold;
  });
  const outOfStockVariants = activeVariants.filter(
    (variant) => variant.trackInventory !== false && Number(variant.current_stock || 0) <= 0,
  );
  const salesTotal = typedSaleRows.reduce(
    (total, sale) => total + Number(sale.total_amount || 0),
    0,
  );
  const grossProfitTotal = typedSaleRows.reduce(
    (total, sale) => total + Number(sale.gross_profit || 0),
    0,
  );
  const pendingTotal = typedSaleRows.reduce(
    (total, sale) =>
      sale.payment_status === "partial" || sale.payment_status === "pending"
        ? total + Number(sale.balance_due || 0)
        : total,
    0,
  );
  const performanceRows = typedSaleRows as DashboardSaleRow[];
  const movementPoints = getDashboardPerformanceData(performanceRows);
  const performancePoints = buildDailyPerformanceSeries({
    endDate: performanceRange.endDate,
    rawRows: performanceRows,
    startDate: performanceRange.startDate,
  });
  const formatter = moneyFormatter(business.currency || "COP");
  const metrics = [
    {
      badge: hasSales ? "Real" : "Sin datos",
      detail: hasSales ? "Ventas completadas del periodo seleccionado." : "Sin datos de ventas en este periodo.",
      help: dashboardHelp.sales,
      icon: <SalesIcon className="h-5 w-5" />,
      title: "Ventas",
      value: hasSales ? formatter.format(salesTotal) : undefined,
    },
    {
      badge: hasSales ? "Real" : "Sin datos",
      detail: hasSales
        ? "Utilidad bruta estimada del mes."
        : "Sin datos de utilidad en este periodo.",
      help: dashboardHelp.profit,
      icon: <ProfitIcon className="h-5 w-5" />,
      title: "Utilidad real",
      value: hasSales ? formatter.format(grossProfitTotal) : undefined,
    },
    {
      badge: hasProducts ? "Real" : "Sin datos",
      detail: hasProducts
        ? `${lowStockVariants.length} bajo stock · ${outOfStockVariants.length} agotados · valor al costo: ${formatter.format(inventoryValue)}`
        : "Agrega productos para activar el inventario.",
      help: dashboardHelp.inventory,
      icon: <BoxIcon className="h-5 w-5" />,
      title: "Inventario",
      value: hasProducts ? activeVariants.length : "—",
    },
    {
      badge: hasSales ? "Por cobrar" : undefined,
      detail: hasSales
        ? "Saldo pendiente de ventas del mes."
        : "Sin datos de caja todavía.",
      help: dashboardHelp.pending,
      icon: <WalletIcon className="h-5 w-5" />,
      title: "Caja",
      value: hasSales ? formatter.format(pendingTotal) : undefined,
    },
  ];

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="w-full max-w-none space-y-6">
        <DashboardHeader businessName={business.name} displayName={displayName} />

        <div className="grid min-w-0 grid-cols-12 gap-6">
          <div className="col-span-12 min-w-0 space-y-6 xl:col-span-8">
            <ActivationProgressCard
              hasCombos={hasCombos}
              hasInventory={hasInventoryActivity}
              hasProducts={hasProducts}
              hasSales={hasSales}
            />
            <QuickActions hasCatalog={hasCatalog} hasProducts={hasProducts} />

            <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.title}
                  badge={metric.badge}
                  detail={metric.detail}
                  help={metric.help}
                  icon={metric.icon}
                  title={metric.title}
                  value={metric.value}
                />
              ))}
            </section>

            <BusinessPerformancePanel
              currency={business.currency || "COP"}
      hasCostData={hasSales}
      hasSalesData={hasSales}
      range={performanceRange}
      movementCount={movementPoints.length}
      points={performancePoints}
    />
            <RecentActivity />
          </div>

          <aside className="col-span-12 min-w-0 space-y-6 xl:col-span-4">
            <SetupChecklist
              hasCombos={hasCombos}
              hasInventory={hasInventoryActivity}
              hasProducts={hasProducts}
              hasSales={hasSales}
            />
            <BusinessStatusCard
              business={{
                businessType: business.business_type,
                country: business.country,
                currency: business.currency,
                name: business.name,
                primaryChannel: business.primary_channel,
              }}
            />
            <AlertsCard />
            <MargeniaInsightCard />
          </aside>
        </div>
      </div>
    </main>
  );
}
