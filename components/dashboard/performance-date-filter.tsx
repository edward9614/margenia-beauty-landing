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
      <label className="grid w-full gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-600 sm:w-[190px]">
        Periodo
        <select
          aria-label="Seleccionar periodo"
          value={period}
          onChange={(event) => handlePeriodChange(event.target.value as PerformancePeriod)}
          className="h-11 w-full rounded-xl border border-white/10 bg-[#091827] px-3.5 text-sm font-black normal-case tracking-normal text-slate-200 outline-none transition hover:border-white/20 focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-400/10"
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
          <label className="grid w-full gap-1.5 text-xs font-black text-slate-500 sm:w-[155px]">
            Desde
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#091827] px-3 text-sm text-slate-200 outline-none [color-scheme:dark] focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-400/10"
            />
          </label>
          <label className="grid w-full gap-1.5 text-xs font-black text-slate-500 sm:w-[155px]">
            Hasta
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#091827] px-3 text-sm text-slate-200 outline-none [color-scheme:dark] focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-400/10"
            />
          </label>
          <button
            type="button"
            onClick={applyCustomRange}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-sm font-black text-white shadow-lg shadow-cyan-950/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:w-auto sm:min-w-[110px]"
          >
            Aplicar
          </button>
        </>
      )}

      {range.error && (
        <p className="w-full rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-black text-rose-200">
          {range.error}
        </p>
      )}
    </div>
  );
}
