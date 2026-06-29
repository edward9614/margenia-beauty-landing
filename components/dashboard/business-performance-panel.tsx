"use client";

import { useMemo, useState } from "react";
import { ActionHelp } from "@/components/ui/action-help";
import { trackEvent } from "@/lib/analytics";
import { dashboardHelp } from "@/lib/help-content";

type PerformanceView = "sales" | "profit";

export type PerformancePoint = {
  label: string;
  sales: number;
  grossProfit: number;
  netProfit: number | null;
};

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
    emptyText:
      "Cuando registres tu primera venta, Margenia mostrará aquí su evolución por día, semana y mes.",
    emptyTitle: "Aún no hay ventas registradas",
    intro: "Aquí verás cómo evolucionan los ingresos de tu negocio.",
    title: "Rendimiento de ventas",
  },
  profit: {
    action: "Configurar costos",
    badge: "Disponible con Productos y Ventas",
    emptyText:
      "Margenia calculará la utilidad cuando existan productos con costos y ventas registradas.",
    emptyTitle: "Aún no hay datos de utilidad",
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
  const values = points.map((point) =>
    view === "sales" ? point.sales : point.netProfit ?? point.grossProfit,
  );
  const maxValue = Math.max(...values, 1);

  return (
    <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-[#F8FAFC] p-5">
      <div className="flex h-56 items-end gap-3">
        {points.map((point, index) => {
          const value = values[index] || 0;
          const height = Math.max((value / maxValue) * 100, 4);

          return (
            <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-xl bg-[linear-gradient(180deg,#2563EB_0%,#06B6D4_100%)]"
                style={{ height: `${height}%` }}
                title={formatCurrency(value, currency)}
              />
              <span className="max-w-full truncate text-xs font-bold text-[#475569]">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
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
