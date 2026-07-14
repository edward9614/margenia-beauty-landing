import Link from "next/link";
import type { ReactNode } from "react";

export type DashboardTone = "brand" | "danger" | "default" | "success" | "violet" | "warning";

const toneStyles: Record<DashboardTone, string> = {
  brand: "border-cyan-300/20 bg-cyan-400/[0.08]",
  danger: "border-rose-300/20 bg-rose-400/[0.08]",
  default: "border-white/10 bg-white/[0.045]",
  success: "border-emerald-300/20 bg-emerald-400/[0.08]",
  violet: "border-violet-300/20 bg-violet-400/[0.08]",
  warning: "border-amber-300/20 bg-amber-400/[0.08]",
};

const chipToneStyles: Record<DashboardTone, string> = {
  brand: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
  danger: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  default: "border-white/10 bg-white/[0.05] text-slate-100",
  success: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  violet: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-100",
};

export const dashboardPrimaryActionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 py-2.5 text-center text-sm font-black text-white shadow-lg shadow-cyan-950/30 ring-1 ring-white/15 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-cyan-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 active:translate-y-0";

export const dashboardSecondaryActionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 py-2.5 text-center text-sm font-black text-slate-100 backdrop-blur transition duration-200 hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export const dashboardFieldClass =
  "min-h-11 w-full rounded-xl border border-white/10 bg-[#0A1728]/90 px-3.5 py-2.5 text-base font-bold text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-400/10";

export function DashboardShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(145deg,#06101d_0%,#091827_48%,#07111f_100%)] text-slate-100 shadow-[0_24px_70px_rgba(15,23,42,0.16)] ${className}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-35 [background-image:linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] [background-size:36px_36px]" />
      {children}
    </div>
  );
}

export function AppPageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-6 border-b border-white/[0.07] px-5 py-7 sm:px-7 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-9">
      <div className="max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-400 sm:text-base">{description}</p>
      </div>
      {actions && <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div>}
    </header>
  );
}

export function BentoGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`grid gap-3 sm:gap-4 ${className}`}>{children}</section>;
}

export function BentoCard({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: DashboardTone;
}) {
  return (
    <article className={`rounded-2xl border p-5 backdrop-blur-sm transition duration-200 hover:border-white/20 hover:bg-white/[0.065] sm:p-6 ${toneStyles[tone]} ${className}`}>
      {children}
    </article>
  );
}

export function HeroSummaryCard({
  children,
  description,
  label,
  value,
}: {
  children?: ReactNode;
  description: string;
  label: string;
  value: string;
}) {
  return (
    <BentoCard className="relative overflow-hidden sm:p-7" tone="brand">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">{label}</p>
      <p className="mt-4 text-5xl font-black tracking-normal text-white sm:text-6xl">{value}</p>
      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-400">{description}</p>
      {children && <div className="mt-7 grid gap-2 sm:grid-cols-3">{children}</div>}
    </BentoCard>
  );
}

export function MetricChip({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: DashboardTone;
  value: string;
}) {
  return (
    <div className={`min-w-0 rounded-xl border px-3.5 py-3 ${chipToneStyles[tone]}`}>
      <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.1em] opacity-65">{label}</p>
      <p className="mt-1 truncate text-base font-black text-white">{value}</p>
    </div>
  );
}

export function SegmentTabs({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: { active: boolean; href: string; label: string }[];
}) {
  return (
    <nav className="inline-flex w-full gap-1 rounded-xl border border-white/10 bg-black/20 p-1 sm:w-auto" aria-label={ariaLabel}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-black transition duration-200 sm:flex-none ${item.active ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function DashboardEmptyState({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-12 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1v6m-3-3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </div>
      <h2 className="mt-4 text-xl font-black text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-400">{description}</p>
      {actionHref && actionLabel && <Link href={actionHref} className={`${dashboardPrimaryActionClass} mt-5`}>{actionLabel}</Link>}
    </section>
  );
}
