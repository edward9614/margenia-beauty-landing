"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { PerformanceDateRange, PerformancePeriod } from "@/lib/dashboard/performance";

const periods: { label: string; value: PerformancePeriod }[] = [
  { label: "Hoy", value: "today" },
  { label: "Últimos 7 días", value: "last_7_days" },
  { label: "Mes actual", value: "current_month" },
  { label: "Mes anterior", value: "previous_month" },
  { label: "Personalizado", value: "custom" },
];

export function PerformanceDateFilter({ range }: { range: PerformanceDateRange }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<PerformancePeriod>(range.period);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  function replaceParams(next: {
    from?: string;
    period?: PerformancePeriod;
    to?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextPeriod = next.period || period;

    params.set("period", nextPeriod);

    if (nextPeriod === "current_month") {
      params.delete("period");
    }

    if (nextPeriod === "custom") {
      params.set("from", next.from || from);
      params.set("to", next.to || to);
    } else {
      params.delete("from");
      params.delete("to");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handlePeriodChange(value: PerformancePeriod) {
    setPeriod(value);
    replaceParams({ period: value });
  }

  function applyCustomRange() {
    replaceParams({ from, period: "custom", to });
  }

  return (
    <div className="flex w-full min-w-0 flex-wrap items-end gap-3 lg:w-auto">
      <label className="grid w-full gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#64748B] sm:w-[220px]">
        Periodo
        <select
          aria-label="Seleccionar periodo"
          value={period}
          onChange={(event) => handlePeriodChange(event.target.value as PerformancePeriod)}
          className="h-12 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 text-sm font-black normal-case tracking-normal text-[#0F172A] shadow-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
        >
          {periods.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      {period === "custom" && (
        <>
          <label className="grid w-full gap-1.5 text-xs font-black text-[#475569] sm:w-[170px]">
            Desde
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
            />
          </label>
          <label className="grid w-full gap-1.5 text-xs font-black text-[#475569] sm:w-[170px]">
            Hasta
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60"
            />
          </label>
          <button
            type="button"
            onClick={applyCustomRange}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 sm:w-auto sm:min-w-[120px]"
          >
            Aplicar
          </button>
        </>
      )}

      {range.error && (
        <p className="w-full rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-black text-[#B91C1C]">
          {range.error}
        </p>
      )}
    </div>
  );
}
