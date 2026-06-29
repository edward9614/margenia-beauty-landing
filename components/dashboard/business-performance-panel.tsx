"use client";

import { useMemo, useState } from "react";
import { ActionHelp } from "@/components/ui/action-help";
import { trackEvent } from "@/lib/analytics";
import {
  summarizePerformance,
  type PerformancePoint,
} from "@/lib/dashboard/performance";
import { dashboardHelp } from "@/lib/help-content";

type PerformanceView = "sales" | "profit";

type BusinessPerformancePanelProps = {
  currency?: string;
  points?: PerformancePoint[];
  hasSalesData?: boolean;
  hasCostData?: boolean;
  hasExpenseData?: boolean;
};

const viewConfig = {
  sales: {
    action: "Registrar primera venta",
    badge: "Disponible en el módulo Ventas",
    emptyText: "Registra tu primera venta para visualizar la evolución de tu negocio.",
    emptyTitle: "Aún no hay ventas registradas.",
    intro: "Visualiza cómo han evolucionado tus ingresos.",
    title: "Evolución de ventas",
  },
  profit: {
    action: "Configurar costos",
    badge: "Disponible con Productos y Ventas",
    emptyText: "Registra ventas con costos para visualizar la utilidad real.",
    emptyTitle: "Aún no hay datos de utilidad.",
    intro:
      "Aquí podrás entender cuánto queda después de cubrir los costos del negocio.",
    title: "Evolución de la utilidad",
  },
};

const profitSummaryRows = [
  "Ingresos",
  "Costo de productos vendidos",
  "Comisiones y envíos",
  "Gastos operativos",
  "Utilidad estimada",
];

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

function EmptyPerformanceState({
  action,
  badge,
  text,
  title,
  view,
}: {
  action: string;
  badge: string;
  text: string;
  title: string;
  view: PerformanceView;
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
        <span className="rounded-full border border-[#BFDBFE] bg-white px-3 py-1.5 text-xs font-black text-[#2563EB]">
          {badge}
        </span>
        <h3 className="mt-5 text-xl font-black text-[#0F172A]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#475569]">{text}</p>

        {view === "profit" && (
          <p className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-xs font-black text-[#475569]">
            Ingresos - costos de productos - comisiones - envíos asumidos - gastos
          </p>
        )}

        <button
          type="button"
          disabled
          className="mt-5 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-5 py-3 text-sm font-black text-white opacity-55 shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed"
        >
          {action}
        </button>
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
  const values = points.map((point) => (view === "sales" ? point.sales : point.grossProfit));
  const chartWidth = 640;
  const chartHeight = 210;
  const paddingX = 34;
  const paddingTop = 22;
  const paddingBottom = 42;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values, 1);
  const range = maxValue - minValue || 1;
  const zeroY = paddingTop + ((maxValue - 0) / range) * plotHeight;
  const barWidth = Math.min(54, Math.max(24, (chartWidth - paddingX * 2) / Math.max(points.length * 1.8, 1)));
  const gradientId = view === "sales" ? "salesGradient" : "profitGradient";
  const totalValue = values.reduce((total, value) => total + value, 0);

  function xFor(index: number) {
    if (points.length === 1) return chartWidth / 2;

    return paddingX + (index * (chartWidth - paddingX * 2)) / (points.length - 1);
  }

  function yFor(value: number) {
    return paddingTop + ((maxValue - value) / range) * plotHeight;
  }

  return (
    <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-[#F8FAFC] p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#2563EB]">
            Total del periodo
          </p>
          <p className="mt-1 text-2xl font-black text-[#0F172A]">
            {formatCurrency(totalValue, currency)}
          </p>
        </div>
        <p className="text-sm font-bold text-[#475569]">
          {points.length} {points.length === 1 ? "día con datos" : "días con datos"}
        </p>
      </div>

      <svg
        role="img"
        aria-label={`Gráfico de ${view === "sales" ? "ventas" : "utilidad"}`}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="h-64 w-full overflow-visible"
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
          const barHeight = Math.max(Math.abs(zeroY - valueY), 10);
          const barY = value >= 0 ? zeroY - barHeight : zeroY;

          return (
            <g key={`${point.date}-${view}`}>
              <rect
                x={x - barWidth / 2}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx="12"
                fill={`url(#${gradientId})`}
              >
                <title>
                  {point.label}: {formatCurrency(value, currency)}
                </title>
              </rect>
              <circle
                cx={x}
                cy={value >= 0 ? barY : barY + barHeight}
                r="4"
                fill={view === "sales" ? "#1D4ED8" : "#16A34A"}
              />
              <text
                x={x}
                y={Math.max(14, barY - 8)}
                textAnchor="middle"
                className="fill-[#0F172A] text-[11px] font-black"
              >
                {formatCurrency(value, currency)}
              </text>
              <text
                x={x}
                y={chartHeight - 14}
                textAnchor="middle"
                className="fill-[#475569] text-[12px] font-bold"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function BusinessPerformancePanel({
  currency = "COP",
  points = [],
  hasSalesData = false,
  hasCostData = false,
  hasExpenseData = false,
}: BusinessPerformancePanelProps) {
  const [view, setView] = useState<PerformanceView>("sales");
  const config = viewConfig[view];
  const hasPoints = points.length > 0;
  const summary = useMemo(() => summarizePerformance(points), [points]);
  const profitLabel = hasExpenseData
    ? "Utilidad neta estimada"
    : "Utilidad bruta estimada";

  const summaryRows = useMemo(
    () =>
      profitSummaryRows.map((label) => ({
        label,
        value: "Sin datos todavía",
      })),
    [],
  );

  function changeView(nextView: PerformanceView) {
    setView(nextView);
    trackEvent("dashboard_performance_view", { view: nextView });
  }

  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#0F172A]">{config.title}</h2>
            <ActionHelp help={dashboardHelp.performance} />
          </div>
          <p className="mt-2 text-sm leading-6 text-[#475569]">{config.intro}</p>
        </div>

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

      <div
        id={view === "sales" ? "performance-sales-panel" : "performance-profit-panel"}
        role="tabpanel"
        aria-labelledby={
          view === "sales" ? "performance-sales-tab" : "performance-profit-tab"
        }
        className="mt-6"
      >
        {!hasPoints ? (
          <EmptyPerformanceState
            action={config.action}
            badge={config.badge}
            text={config.emptyText}
            title={config.emptyTitle}
            view={view}
          />
        ) : (
          <PerformanceChart currency={currency} points={points} view={view} />
        )}
      </div>

      {hasPoints && (
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
              <SummaryPill label="Utilidad total" value={formatCurrency(summary.totalProfit, currency)} />
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
        </div>
      )}

      {view === "profit" && (
        <div className="mt-4 rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-black text-[#0F172A]">{profitLabel}</h3>
              <p className="mt-1 text-xs leading-5 text-[#475569]">
                {hasExpenseData
                  ? "Fórmula futura: utilidad bruta - gastos operativos."
                  : "Fórmula futura: ventas netas - costos - comisiones - envíos asumidos."}
              </p>
            </div>
            <span className="w-fit rounded-full bg-[#F8FAFC] px-3 py-1.5 text-xs font-black text-[#475569] ring-1 ring-[#E2E8F0]">
              {hasSalesData && hasCostData ? "Preparado para datos" : "Sin datos todavía"}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] px-4 py-3"
              >
                <span className="text-sm font-bold text-[#475569]">{row.label}</span>
                <span className="text-right text-sm font-black text-[#0F172A]">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
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
