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
import { createClient } from "@/lib/supabase/server";

const metrics = [
  {
    detail: "Aún no hay ventas registradas en la beta.",
    icon: <SalesIcon className="h-5 w-5" />,
    title: "Ventas",
  },
  {
    detail: "La utilidad aparecerá cuando existan movimientos reales.",
    icon: <ProfitIcon className="h-5 w-5" />,
    title: "Utilidad real",
  },
  {
    detail: "El control de stock se activará en próximos módulos.",
    icon: <BoxIcon className="h-5 w-5" />,
    title: "Inventario",
  },
  {
    detail: "Caja mostrará ingresos, gastos y saldo cuando esté disponible.",
    icon: <WalletIcon className="h-5 w-5" />,
    title: "Caja",
  },
];

export default async function AppHomePage() {
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

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="w-full max-w-none space-y-6">
        <DashboardHeader businessName={business.name} displayName={displayName} />

        <div className="grid min-w-0 grid-cols-12 gap-6">
          <div className="col-span-12 min-w-0 space-y-6 xl:col-span-8">
            <ActivationProgressCard />
            <QuickActions />

            <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.title}
                  detail={metric.detail}
                  icon={metric.icon}
                  title={metric.title}
                />
              ))}
            </section>

            <BusinessPerformancePanel currency={business.currency || "COP"} />
            <RecentActivity />
          </div>

          <aside className="col-span-12 min-w-0 space-y-6 xl:col-span-4">
            <SetupChecklist />
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
