import type { ReactNode } from "react";
import { BentoCard } from "@/components/ui/dashboard-primitives";
import type { SemanticTone } from "@/components/ui/semantic";

export const comboDarkTone: Record<SemanticTone, { badge: string; text: string }> = {
  brand: { badge: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100", text: "text-cyan-200" },
  info: { badge: "border-blue-300/20 bg-blue-300/10 text-blue-100", text: "text-blue-200" },
  negative: { badge: "border-rose-300/20 bg-rose-300/10 text-rose-100", text: "text-rose-200" },
  neutral: { badge: "border-white/10 bg-white/[0.06] text-slate-300", text: "text-slate-300" },
  positive: { badge: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100", text: "text-emerald-200" },
  warning: { badge: "border-amber-300/20 bg-amber-300/10 text-amber-100", text: "text-amber-200" },
};

export function ComboStatusBadge({ children, tone }: { children: ReactNode; tone: SemanticTone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${comboDarkTone[tone].badge}`}>
      {children}
    </span>
  );
}

type ComboMetricIcon = "active" | "archived" | "margin" | "stock";

function ComboMetricGlyph({ icon }: { icon: ComboMetricIcon }) {
  const paths: Record<ComboMetricIcon, ReactNode> = {
    active: <><path d="M5 7.5 12 4l7 3.5-7 3.5-7-3.5Z" /><path d="m5 12 7 3.5 7-3.5M5 16.5l7 3.5 7-3.5" /></>,
    archived: <><path d="M4 6h16v4H4zM6 10v10h12V10" /><path d="M10 14h4" /></>,
    margin: <><path d="m4 16 5-5 4 3 7-8" /><path d="M15 6h5v5" /></>,
    stock: <><path d="M5 7.5 12 4l7 3.5v9L12 20l-7-3.5v-9Z" /><path d="m5 7.5 7 3.5 7-3.5M12 11v9" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[icon]}
    </svg>
  );
}

export function ComboMetricCard({
  description,
  icon,
  label,
  tone,
  value,
}: {
  description: string;
  icon: ComboMetricIcon;
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
          <p className={`mt-3 truncate text-2xl font-black sm:text-3xl ${comboDarkTone[tone].text}`}>{value}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{description}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${comboDarkTone[tone].badge}`}>
          <ComboMetricGlyph icon={icon} />
        </span>
      </div>
    </BentoCard>
  );
}

export function ComboMobileMetric({ label, tone = "neutral", value }: { label: string; tone?: SemanticTone; value: string }) {
  return (
    <div className="min-w-0 bg-[#081524] px-3 py-3">
      <p className="text-[0.64rem] font-black uppercase tracking-[0.09em] text-slate-600">{label}</p>
      <p className={`mt-1 truncate text-sm font-black ${comboDarkTone[tone].text}`}>{value}</p>
    </div>
  );
}
