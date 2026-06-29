"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionHelp } from "@/components/ui/action-help";
import { PerformanceDateFilter } from "@/components/dashboard/performance-date-filter";
import { trackEvent } from "@/lib/analytics";
import {
  summarizePerformance,
  type PerformanceDateRange,
  type PerformancePoint,
  type PerformanceView,
} from "@/lib/dashboard/performance";
import { dashboardHelp } from "@/lib/help-content";

type BusinessPerformancePanelProps = {
  currency?: string;
  initialView?: PerformanceView;
  points?: PerformancePoint[];
  movementCount?: number;
  range: PerformanceDateRange;
  hasSalesData?: boolean;
  hasCostData?: boolean;
  hasExpenseData?: boolean;
};

const viewConfig = {
  sales: {
    action: "Registrar primera venta",
    badge: "Disponible en el módulo Ventas",
    emptyText: "Cuando registres ventas dentro de este rango, Margenia mostrará aquí su evolución.",
    emptyTitle: "No hay ventas en este periodo",
    intro: "Visualiza cómo han evolucionado tus ingresos.",
    title: "Evolución de ventas",
  },
  profit: {
    action: "Configurar costos",
    badge: "Disponible con Productos y Ventas",
    emptyText: "Cuando registres ventas dentro de este rango, Margenia mostrará aquí su evolución.",
    emptyTitle: "No hay ventas en este periodo",
    intro: "Entiende cuánto queda después de cubrir los costos del negocio.",
    title: "Evolución de la utilidad",
  },
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Sin datos";

  return `${value.toLocaleString("es-CO", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
}

function formatSaleCount(count: number) {
  return `${count.toLocaleString("es-CO")} ${count === 1 ? "venta registrada" : "ventas registradas"}`;
}

function EmptyPerformanceState({
  text,
  title,
}: {
  text: string;
  title: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
      >
        <div className="absolute left-6 top-6 h-16 w-16 rounded-full bg-[#E0F7FA]" />
        <div className="absolute right-8 top-10 h-24 w-24 rounded-full bg-[#EFF6FF]" />
        <div className="absolute bottom-8 left-1/2 h-2 w-44 -translate-x-1/2 rounded-full bg-[#E2E8F0]" />
      </div>

      <div className="relative mx-auto flex min-h-56 max-w-xl flex-col items-center justify-center text-center">
        <h3 className="mt-5 text-xl font-black text-[#0F172A]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#475569]">{text}</p>

        <Link
          href="/app/ventas/nueva"
          className="mt-5 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
        >
          Nueva venta
        </Link>
      </div>
    </div>
  );
}

function PerformanceChart({
  currency,
  points,
  view,
}: {
  currency: string;
  points: PerformancePoint[];
  view: PerformanceView;
}) {
  const [activePoint, setActivePoint] = useState<PerformancePoint | null>(null);
  const values = points.map((point) => (view === "sales" ? point.sales : point.grossProfit));
  const chartWidth = Math.max(680, points.length * 28);
  const chartHeight = 190;
  const paddingX = 24;
  const paddingTop = 22;
  const paddingBottom = 36;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values, 1);
  const range = maxValue - minValue || 1;
  const zeroY = paddingTop + ((maxValue - 0) / range) * plotHeight;
  const barWidth = Math.min(18, Math.max(8, (chartWidth - paddingX * 2) / Math.max(points.length * 1.8, 1)));
  const gradientId = view === "sales" ? "salesGradient" : "profitGradient";
  const totalValue = values.reduce((total, value) => total + value, 0);
  const bestValue = Math.max(...values);

  function shouldShowLabel(point: PerformancePoint, index: number) {
    if (points.length <= 7) return true;
    if (index === 0 || index === points.length - 1) return true;

    const day = Number(point.date.slice(-2));
    return [1, 5, 10, 15, 20, 25].includes(day);
  }

  function xFor(index: number) {
    if (points.length === 1) return chartWidth / 2;

    return paddingX + (index * (chartWidth - paddingX * 2)) / (points.length - 1);
  }

  function yFor(value: number) {
    return paddingTop + ((maxValue - value) / range) * plotHeight;
  }

  function pointAriaLabel(point: PerformancePoint) {
    if (point.saleCount < 1) return `${point.label}. Sin movimiento.`;

    return `${point.label}. Ventas ${formatCurrency(point.sales, currency)}. Utilidad ${formatCurrency(point.grossProfit, currency)}. ${formatSaleCount(point.saleCount)}.`;
  }

  return (
    <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#2563EB]">
            Total del periodo
          </p>
          <p className="mt-1 text-2xl font-black text-[#0F172A]">
            {formatCurrency(totalValue, currency)}
          </p>
        </div>
        <p className="text-sm font-bold text-[#475569]">
          Días con movimiento: {points.filter((point) => point.saleCount > 0).length}
        </p>
      </div>

      <div className="relative -mx-2 overflow-x-auto px-2">
        {activePoint && (
          <div className="pointer-events-none absolute right-4 top-3 z-10 max-w-60 rounded-2xl border border-[#E2E8F0] bg-white p-3 text-left text-xs shadow-xl shadow-[#0F172A]/10">
            <p className="font-black text-[#0F172A]">{activePoint.label}</p>
            {activePoint.saleCount > 0 ? (
              <div className="mt-2 space-y-1 font-bold text-[#475569]">
                <p>Ventas: {formatCurrency(activePoint.sales, currency)}</p>
                <p>Utilidad: {formatCurrency(activePoint.grossProfit, currency)}</p>
                <p>{formatSaleCount(activePoint.saleCount)}</p>
              </div>
            ) : (
              <p className="mt-2 font-bold text-[#64748B]">Sin movimiento</p>
            )}
          </div>
        )}
        <svg
          role="img"
          aria-label={`Gráfico de ${view === "sales" ? "ventas" : "utilidad"}`}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-[230px] w-full min-w-[680px] overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <line
            x1={paddingX}
            x2={chartWidth - paddingX}
            y1={zeroY}
            y2={zeroY}
            stroke="#CBD5E1"
            strokeDasharray="5 6"
            strokeWidth="1"
          />
          {points.map((point, index) => {
            const value = values[index] || 0;
            const x = xFor(index);
            const valueY = yFor(value);
            const hasMovement = point.saleCount > 0;
            const barHeight = hasMovement ? Math.max(Math.abs(zeroY - valueY), 8) : 4;
            const barY = hasMovement
              ? value >= 0
                ? zeroY - barHeight
                : zeroY
              : zeroY - 2;
            const isBest = hasMovement && value === bestValue && bestValue > 0;

            return (
              <g
                key={`${point.date}-${view}`}
                className="cursor-pointer outline-none"
                role="button"
                tabIndex={0}
                aria-label={pointAriaLabel(point)}
                onBlur={() => setActivePoint(null)}
                onClick={() => setActivePoint(point)}
                onFocus={() => setActivePoint(point)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActivePoint(point);
                  }
                }}
                onMouseEnter={() => setActivePoint(point)}
                onMouseLeave={() => setActivePoint(null)}
              >
                <rect
                  x={x - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx="8"
                  fill={hasMovement ? `url(#${gradientId})` : "#CBD5E1"}
                  opacity={hasMovement ? 1 : 0.75}
                  stroke={isBest ? "#0F172A" : "transparent"}
                  strokeWidth={isBest ? 1.5 : 0}
                >
                  <title>
                    {point.label}
                    {"\n"}Ventas: {formatCurrency(point.sales, currency)}
                    {"\n"}Utilidad: {formatCurrency(point.grossProfit, currency)}
                    {"\n"}Ventas registradas: {point.saleCount}
                  </title>
                </rect>
                {hasMovement && (
                  <circle
                    cx={x}
                    cy={value >= 0 ? barY : barY + barHeight}
                    r={isBest ? 4.5 : 3.5}
                    fill={view === "sales" ? "#1D4ED8" : "#16A34A"}
                  />
                )}
                {shouldShowLabel(point, index) && (
                  <text
                    x={x}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    className="fill-[#475569] text-[11px] font-bold"
                  >
                    {point.label.replace(" de ", " ")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

    </div>
  );
}

export function BusinessPerformancePanel({
  currency = "COP",
  initialView = "sales",
  movementCount = 0,
  points = [],
  range,
}: BusinessPerformancePanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<PerformanceView>(initialView);
  const config = viewConfig[view];
  const summary = useMemo(() => summarizePerformance(points), [points]);
  const hasMovement = summary.saleCount > 0;

  function changeView(nextView: PerformanceView) {
    setView(nextView);
    const params = new URLSearchParams(searchParams.toString());

    if (nextView === "sales") {
      params.delete("view");
    } else {
      params.set("view", nextView);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    trackEvent("dashboard_performance_view", { view: nextView });
  }

  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 lg:max-w-sm xl:max-w-md">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#0F172A]">{config.title}</h2>
            <ActionHelp help={dashboardHelp.performance} />
          </div>
          <p className="mt-2 text-sm leading-6 text-[#475569]">{config.intro}</p>
        </div>

        <div className="flex w-full flex-wrap items-end gap-3 lg:max-w-[760px] lg:justify-end">
          <PerformanceDateFilter range={range} />
          <div
            role="tablist"
            aria-label="Métrica de rendimiento"
            className="grid w-full grid-cols-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] p-1 sm:w-fit"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "sales"}
              aria-controls="performance-sales-panel"
              id="performance-sales-tab"
              onClick={() => changeView("sales")}
              className={`rounded-full px-4 py-2.5 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-[#BFDBFE]/70 ${
                view === "sales"
                  ? "border border-[#BFDBFE] bg-white text-[#2563EB] shadow-sm"
                  : "text-[#475569] hover:text-[#2563EB]"
              }`}
            >
              Ventas
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "profit"}
              aria-controls="performance-profit-panel"
              id="performance-profit-tab"
              onClick={() => changeView("profit")}
              className={`rounded-full px-4 py-2.5 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-[#BFDBFE]/70 ${
                view === "profit"
                  ? "border border-[#BFDBFE] bg-white text-[#2563EB] shadow-sm"
                  : "text-[#475569] hover:text-[#2563EB]"
              }`}
            >
              Utilidad
            </button>
          </div>
        </div>
      </div>

      <div
        id={view === "sales" ? "performance-sales-panel" : "performance-profit-panel"}
        role="tabpanel"
        aria-labelledby={
          view === "sales" ? "performance-sales-tab" : "performance-profit-tab"
        }
        className="mt-6"
      >
        {!hasMovement ? (
          <EmptyPerformanceState
            text={config.emptyText}
            title={config.emptyTitle}
          />
        ) : (
          <PerformanceChart currency={currency} points={points} view={view} />
        )}
      </div>

      {hasMovement && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {view === "sales" ? (
            <>
              <SummaryPill label="Total vendido" value={formatCurrency(summary.totalSales, currency)} />
              <SummaryPill label="Número de ventas" value={summary.saleCount.toLocaleString("es-CO")} />
              <SummaryPill
                label="Mejor día"
                value={
                  summary.bestSalesDay
                    ? `${summary.bestSalesDay.label} · ${formatCurrency(summary.bestSalesDay.sales, currency)}`
                    : "Sin datos"
                }
              />
            </>
          ) : (
            <>
              <SummaryPill label="Utilidad bruta total" value={formatCurrency(summary.totalProfit, currency)} />
              <SummaryPill label="Margen promedio" value={formatPercent(summary.averageMargin)} />
              <SummaryPill
                label="Mejor día por utilidad"
                value={
                  summary.bestProfitDay
                    ? `${summary.bestProfitDay.label} · ${formatCurrency(summary.bestProfitDay.grossProfit, currency)}`
                    : "Sin datos"
                }
              />
            </>
          )}
          <SummaryPill label="Días con movimiento" value={movementCount.toLocaleString("es-CO")} />
        </div>
      )}
    </section>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.1em] text-[#64748B]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#0F172A]">{value}</p>
    </div>
  );
}
