import Link from "next/link";
import type { PerformanceDateRange, PerformancePeriod } from "@/lib/dashboard/performance";

const quickPeriods: { label: string; value: PerformancePeriod }[] = [
  { label: "Hoy", value: "today" },
  { label: "Últimos 7 días", value: "last_7_days" },
  { label: "Mes actual", value: "current_month" },
  { label: "Mes anterior", value: "previous_month" },
  { label: "Personalizado", value: "custom" },
];

function periodHref(period: PerformancePeriod) {
  return period === "current_month" ? "/app" : `/app?period=${period}`;
}

export function PerformanceDateFilter({ range }: { range: PerformanceDateRange }) {
  const isCustom = range.period === "custom";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {quickPeriods.map((period) => (
          <Link
            key={period.value}
            href={periodHref(period.value)}
            className={`rounded-full px-3 py-2 text-xs font-black transition ${
              range.period === period.value
                ? "bg-[#0F172A] text-white shadow-sm"
                : "border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
            }`}
          >
            {period.label}
          </Link>
        ))}
      </div>

      {isCustom && (
        <form method="get" action="/app" className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="period" value="custom" />
          <label className="grid gap-1 text-xs font-black text-[#475569]">
            Desde
            <input
              type="date"
              name="from"
              defaultValue={range.from}
              className="rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-[#475569]">
            Hasta
            <input
              type="date"
              name="to"
              defaultValue={range.to}
              className="rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
            />
          </label>
          <button
            type="submit"
            className="self-end rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-500/20"
          >
            Aplicar
          </button>
        </form>
      )}

      {range.error && (
        <p className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-black text-[#B91C1C]">
          {range.error}
        </p>
      )}
    </div>
  );
}
