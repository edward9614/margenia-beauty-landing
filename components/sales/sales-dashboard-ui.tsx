import type { ReactNode } from "react";
import { BentoCard } from "@/components/ui/dashboard-primitives";
import type { SemanticTone } from "@/components/ui/semantic";

export const salesDarkTone: Record<SemanticTone, { badge: string; text: string }> = {
  brand: { badge: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100", text: "text-cyan-200" },
  info: { badge: "border-blue-300/20 bg-blue-300/10 text-blue-100", text: "text-blue-200" },
  negative: { badge: "border-rose-300/20 bg-rose-300/10 text-rose-100", text: "text-rose-200" },
  neutral: { badge: "border-white/10 bg-white/[0.06] text-slate-300", text: "text-slate-300" },
  positive: { badge: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100", text: "text-emerald-200" },
  warning: { badge: "border-amber-300/20 bg-amber-300/10 text-amber-100", text: "text-amber-200" },
};

export function SalesStatusBadge({ children, tone }: { children: ReactNode; tone: SemanticTone }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${salesDarkTone[tone].badge}`}>{children}</span>;
}

type MetricIcon = "income" | "pending" | "profit" | "sales";

function MetricGlyph({ icon }: { icon: MetricIcon }) {
  const paths: Record<MetricIcon, ReactNode> = {
    income: <><path d="M4 17h16M7 14V9m5 5V5m5 9v-3" /><path d="m6 7 4-3 3 2 5-4" /></>,
    pending: <><path d="M4 7h16v11H4z" /><path d="M16 11h4v4h-4a2 2 0 0 1 0-4Z" /><path d="M7 7V5h9v2" /></>,
    profit: <><path d="m4 16 5-5 4 3 7-8" /><path d="M15 6h5v5" /></>,
    sales: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6m-6 4h6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[icon]}</svg>;
}

export function SalesMetricCard({
  description,
  icon,
  label,
  tone,
  value,
}: {
  description: string;
  icon: MetricIcon;
  label: string;
  tone: SemanticTone;
  value: string;
}) {
  const dashboardTone = tone === "negative" ? "danger" : tone === "positive" ? "success" : tone === "warning" ? "warning" : tone === "brand" || tone === "info" ? "brand" : "default";
  return (
    <BentoCard tone={dashboardTone}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className={`mt-3 truncate text-2xl font-black sm:text-3xl ${salesDarkTone[tone].text}`}>{value}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{description}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${salesDarkTone[tone].badge}`}><MetricGlyph icon={icon} /></span>
      </div>
    </BentoCard>
  );
}

export function SaleMobileMetric({ label, tone = "neutral", value }: { label: string; tone?: SemanticTone; value: string }) {
  return <div className="min-w-0 bg-[#081524] px-3 py-3"><p className="text-[0.64rem] font-black uppercase tracking-[0.09em] text-slate-600">{label}</p><p className={`mt-1 truncate text-sm font-black ${salesDarkTone[tone].text}`}>{value}</p></div>;
}
