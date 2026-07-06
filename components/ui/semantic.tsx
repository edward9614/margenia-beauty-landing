import type { ReactNode } from "react";

export type SemanticTone =
  | "brand"
  | "info"
  | "negative"
  | "neutral"
  | "positive"
  | "warning";

export const semanticToneStyles: Record<
  SemanticTone,
  {
    badge: string;
    border: string;
    icon: string;
    meter: string;
    soft: string;
    text: string;
  }
> = {
  brand: {
    badge: "bg-[#E0F7FA] text-[#0E7490] ring-[#A5F3FC]",
    border: "border-l-[#06B6D4]",
    icon: "bg-[#E0F7FA] text-[#0891B2] ring-[#A5F3FC]",
    meter: "bg-gradient-to-r from-[#2563EB] to-[#06B6D4]",
    soft: "bg-[#ECFEFF]",
    text: "text-[#0E7490]",
  },
  info: {
    badge: "bg-[#EFF6FF] text-[#1D4ED8] ring-[#BFDBFE]",
    border: "border-l-[#2563EB]",
    icon: "bg-[#EFF6FF] text-[#2563EB] ring-[#BFDBFE]",
    meter: "bg-[#2563EB]",
    soft: "bg-[#EFF6FF]",
    text: "text-[#1D4ED8]",
  },
  negative: {
    badge: "bg-[#FEF2F2] text-[#B91C1C] ring-[#FECACA]",
    border: "border-l-[#EF4444]",
    icon: "bg-[#FEE2E2] text-[#B91C1C] ring-[#FECACA]",
    meter: "bg-[#EF4444]",
    soft: "bg-[#FEF2F2]",
    text: "text-[#B91C1C]",
  },
  neutral: {
    badge: "bg-[#F8FAFC] text-[#475569] ring-[#E2E8F0]",
    border: "border-l-[#64748B]",
    icon: "bg-[#F1F5F9] text-[#475569] ring-[#E2E8F0]",
    meter: "bg-[#64748B]",
    soft: "bg-[#F8FAFC]",
    text: "text-[#334155]",
  },
  positive: {
    badge: "bg-[#F0FDF4] text-[#166534] ring-[#BBF7D0]",
    border: "border-l-[#16A34A]",
    icon: "bg-[#DCFCE7] text-[#166534] ring-[#BBF7D0]",
    meter: "bg-[#16A34A]",
    soft: "bg-[#F0FDF4]",
    text: "text-[#166534]",
  },
  warning: {
    badge: "bg-[#FFFBEB] text-[#92400E] ring-[#FDE68A]",
    border: "border-l-[#F59E0B]",
    icon: "bg-[#FEF3C7] text-[#B45309] ring-[#FDE68A]",
    meter: "bg-[#F59E0B]",
    soft: "bg-[#FFFBEB]",
    text: "text-[#B45309]",
  },
};

export function SemanticBadge({
  children,
  className = "",
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: SemanticTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${semanticToneStyles[tone].badge} ${className}`}
    >
      {children}
    </span>
  );
}

export function ToneCard({
  children,
  className = "",
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: SemanticTone;
}) {
  return (
    <article
      className={`rounded-[1.5rem] border border-[#E2E8F0] border-l-4 ${semanticToneStyles[tone].border} bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </article>
  );
}

export function UsageProgressBar({
  className = "",
  percentage,
  tone = "info",
}: {
  className?: string;
  percentage: number;
  tone?: SemanticTone;
}) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-[#E2E8F0] ${className}`}>
      <span
        className={`block h-full rounded-full ${semanticToneStyles[tone].meter} transition-all duration-500`}
        style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
      />
    </div>
  );
}
