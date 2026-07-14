import type { ReactNode } from "react";
import { ActionHelp } from "@/components/ui/action-help";
import type { HelpContent } from "@/lib/help-content";

type MetricVariant = "cash" | "inventory" | "profit" | "sales";
type MetricSize = "compact" | "featured" | "standard";

const variantStyles: Record<MetricVariant, { accent: string; bars: string[]; icon: string; line: string; value: string }> = {
  cash: {
    accent: "border-indigo-300/20 bg-indigo-300/10 text-indigo-200",
    bars: ["h-4 bg-indigo-300/20", "h-7 bg-blue-300/35", "h-5 bg-cyan-300/25", "h-9 bg-indigo-300/50"],
    icon: "border-indigo-300/20 bg-indigo-300/10 text-indigo-200",
    line: "via-indigo-300/70",
    value: "text-indigo-100",
  },
  inventory: {
    accent: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    bars: ["h-5 bg-cyan-300/20", "h-3 bg-blue-300/30", "h-8 bg-cyan-300/45", "h-6 bg-blue-300/35"],
    icon: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    line: "via-cyan-300/70",
    value: "text-cyan-100",
  },
  profit: {
    accent: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    bars: ["h-4 bg-emerald-300/20", "h-7 bg-cyan-300/25", "h-10 bg-emerald-300/45", "h-6 bg-teal-300/35"],
    icon: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    line: "via-emerald-300/70",
    value: "text-emerald-100",
  },
  sales: {
    accent: "border-cyan-200/20 bg-white/10 text-cyan-100",
    bars: ["h-8 bg-white/15", "h-14 bg-cyan-200/30", "h-11 bg-blue-200/25", "h-20 bg-cyan-100/45"],
    icon: "border-white/15 bg-white/10 text-white",
    line: "via-cyan-200/80",
    value: "text-white",
  },
};

export function MetricCard({
  badge = "Sin datos",
  className = "",
  detail,
  help,
  icon,
  size = "standard",
  title,
  value = "—",
  variant = "sales",
}: {
  badge?: string;
  className?: string;
  detail: string;
  help?: HelpContent;
  icon: ReactNode;
  size?: MetricSize;
  title: string;
  value?: string | number;
  variant?: MetricVariant;
}) {
  const styles = variantStyles[variant];
  const featured = size === "featured";
  const compact = size === "compact";

  return (
    <article className={`relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition duration-200 hover:border-white/20 hover:bg-white/[0.065] ${featured ? "min-h-[320px] bg-[linear-gradient(145deg,rgba(37,99,235,0.35),rgba(6,182,212,0.12)_60%,rgba(255,255,255,0.04))] sm:p-7" : compact ? "min-h-[166px]" : "min-h-[190px] sm:p-6"} ${className}`}>
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${styles.line} to-transparent`} />
      <div aria-hidden="true" className={`pointer-events-none absolute bottom-5 right-5 flex items-end gap-1.5 ${featured ? "h-24 opacity-90" : "h-12 opacity-55"}`}>{styles.bars.map((bar, index) => <span key={index} className={`${featured ? "w-3" : "w-2"} rounded-full ${bar}`} />)}</div>

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className={`grid h-11 w-11 place-items-center rounded-xl border ${styles.icon}`}>{icon}</div>
        <span className={`rounded-full border px-2.5 py-1 text-[0.64rem] font-black uppercase tracking-[0.08em] ${styles.accent}`}>{badge}</span>
      </div>
      <div className={`relative z-10 flex items-center gap-2 ${featured ? "mt-10" : "mt-6"}`}>
        <p className="text-sm font-black text-slate-400">{title}</p>
        {help && <ActionHelp help={help} />}
      </div>
      <p className={`relative z-10 mt-2 font-black tracking-normal ${featured ? "max-w-[80%] text-5xl sm:text-6xl" : compact ? "max-w-[78%] text-3xl" : "max-w-[82%] text-4xl"} ${styles.value}`}>{value}</p>
      <p className={`relative z-10 mt-3 max-w-[75%] text-sm font-semibold leading-5 ${featured ? "text-slate-300" : "text-slate-500"}`}>{detail}</p>
    </article>
  );
}
