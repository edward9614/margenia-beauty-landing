import type { ReactNode } from "react";
import { ActionHelp } from "@/components/ui/action-help";
import type { HelpContent } from "@/lib/help-content";

type MetricVariant = "cash" | "inventory" | "profit" | "sales";

const variantStyles: Record<
  MetricVariant,
  {
    accent: string;
    background: string;
    glow: string;
    icon: string;
    miniBars: string[];
    text: string;
  }
> = {
  cash: {
    accent: "bg-white/14 text-white ring-white/20",
    background: "bg-[linear-gradient(135deg,#0F172A_0%,#1D4ED8_100%)]",
    glow: "bg-cyan-300/20",
    icon: "bg-white/14 text-white ring-white/20",
    miniBars: ["h-5 bg-white/30", "h-8 bg-white/45", "h-4 bg-white/25", "h-10 bg-white/60"],
    text: "text-white",
  },
  inventory: {
    accent: "bg-white/70 text-[#0369A1] ring-[#BAE6FD]",
    background: "bg-[linear-gradient(135deg,#ECFEFF_0%,#DBEAFE_100%)]",
    glow: "bg-[#06B6D4]/16",
    icon: "bg-white/75 text-[#2563EB] ring-[#BFDBFE]",
    miniBars: ["h-7 bg-[#93C5FD]", "h-4 bg-[#67E8F9]", "h-10 bg-[#2563EB]/60", "h-6 bg-[#0EA5E9]/50"],
    text: "text-[#0F172A]",
  },
  profit: {
    accent: "bg-white/70 text-[#3730A3] ring-[#C4B5FD]",
    background: "bg-[linear-gradient(135deg,#EFF6FF_0%,#EDE9FE_100%)]",
    glow: "bg-[#7C3AED]/14",
    icon: "bg-white/75 text-[#4F46E5] ring-[#C4B5FD]",
    miniBars: ["h-4 bg-[#A5B4FC]", "h-8 bg-[#7C3AED]/55", "h-11 bg-[#4F46E5]/70", "h-7 bg-[#06B6D4]/45"],
    text: "text-[#0F172A]",
  },
  sales: {
    accent: "bg-white/18 text-white ring-white/25",
    background: "bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)]",
    glow: "bg-white/18",
    icon: "bg-white/18 text-white ring-white/25",
    miniBars: ["h-6 bg-white/35", "h-10 bg-white/55", "h-8 bg-white/40", "h-12 bg-white/70"],
    text: "text-white",
  },
};

export function MetricCard({
  badge = "Sin datos",
  detail,
  help,
  icon,
  title,
  value = "—",
  variant = "sales",
}: {
  badge?: string;
  detail: string;
  help?: HelpContent;
  icon: ReactNode;
  title: string;
  value?: string | number;
  variant?: MetricVariant;
}) {
  const styles = variantStyles[variant];
  const isDark = variant === "cash" || variant === "sales";

  return (
    <article className={`relative min-h-[184px] overflow-hidden rounded-[1.75rem] p-5 shadow-lg shadow-[#0F172A]/8 ${styles.background}`}>
      <div className={`pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full blur-2xl ${styles.glow}`} />
      <div className="pointer-events-none absolute bottom-4 right-5 flex h-16 items-end gap-1.5 opacity-80" aria-hidden="true">
        {styles.miniBars.map((barClass, index) => (
          <span key={index} className={`w-2.5 rounded-full ${barClass}`} />
        ))}
      </div>

      <div className="relative flex items-start justify-between gap-4">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 ${styles.icon}`}>
          {icon}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ring-1 ${styles.accent}`}>
          {badge}
        </span>
      </div>

      <div className="relative mt-6 flex items-center gap-2">
        <p className={`text-sm font-black ${isDark ? "text-white/82" : "text-[#475569]"}`}>{title}</p>
        {help && <ActionHelp help={help} />}
      </div>
      <p className={`relative mt-2 text-4xl font-black tracking-tight sm:text-[2.55rem] ${styles.text}`}>{value}</p>
      <p className={`relative mt-3 max-w-[13rem] text-sm font-bold leading-5 ${isDark ? "text-white/78" : "text-[#475569]"}`}>
        {detail}
      </p>
    </article>
  );
}
