export type DashboardSaleRow = {
  id: string;
  sale_date: string;
  payment_status: string | null;
  total_amount: number | string | null;
  balance_due: number | string | null;
  gross_profit: number | string | null;
};

export type PerformancePoint = {
  date: string;
  label: string;
  sales: number;
  grossProfit: number;
  saleCount: number;
  pending: number;
};

export type PerformanceSummary = {
  totalSales: number;
  totalProfit: number;
  totalPending: number;
  saleCount: number;
  daysWithData: number;
  bestSalesDay: PerformancePoint | null;
  bestProfitDay: PerformancePoint | null;
  averageMargin: number | null;
};

const bogotaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Bogota",
  year: "numeric",
});

const monthLabelFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  timeZone: "America/Bogota",
});

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toLocalDateKey(value: string) {
  const parts = bogotaDateFormatter.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
}

function toDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const monthLabel = monthLabelFormatter.format(date).replace(".", "");

  return `${day} de ${monthLabel}`;
}

export function getDashboardPerformanceData(sales: DashboardSaleRow[]) {
  const grouped = sales.reduce<Record<string, PerformancePoint>>((acc, sale) => {
    const date = toLocalDateKey(sale.sale_date);

    acc[date] ||= {
      date,
      grossProfit: 0,
      label: toDateLabel(date),
      pending: 0,
      saleCount: 0,
      sales: 0,
    };

    acc[date].sales += toNumber(sale.total_amount);
    acc[date].grossProfit += toNumber(sale.gross_profit);
    acc[date].saleCount += 1;

    if (sale.payment_status === "partial" || sale.payment_status === "pending") {
      acc[date].pending += toNumber(sale.balance_due);
    }

    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

export function summarizePerformance(points: PerformancePoint[]): PerformanceSummary {
  const totals = points.reduce(
    (acc, point) => {
      acc.totalSales += point.sales;
      acc.totalProfit += point.grossProfit;
      acc.totalPending += point.pending;
      acc.saleCount += point.saleCount;
      return acc;
    },
    {
      saleCount: 0,
      totalPending: 0,
      totalProfit: 0,
      totalSales: 0,
    },
  );

  return {
    ...totals,
    averageMargin: totals.totalSales > 0 ? (totals.totalProfit / totals.totalSales) * 100 : null,
    bestProfitDay: points.reduce<PerformancePoint | null>(
      (best, point) => (!best || point.grossProfit > best.grossProfit ? point : best),
      null,
    ),
    bestSalesDay: points.reduce<PerformancePoint | null>(
      (best, point) => (!best || point.sales > best.sales ? point : best),
      null,
    ),
    daysWithData: points.length,
  };
}
