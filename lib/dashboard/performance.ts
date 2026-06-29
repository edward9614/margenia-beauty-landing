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

export type PerformancePeriod =
  | "today"
  | "last_7_days"
  | "current_month"
  | "previous_month"
  | "custom";

export type PerformanceDateRange = {
  days: number;
  endDate: string;
  endIso: string;
  error?: string;
  from: string;
  period: PerformancePeriod;
  startDate: string;
  startIso: string;
  to: string;
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

const validPeriods = new Set<PerformancePeriod>([
  "today",
  "last_7_days",
  "current_month",
  "previous_month",
  "custom",
]);

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBogotaDateKey(value: Date) {
  const parts = bogotaDateFormatter.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
}

function toLocalDateKey(value: string) {
  return toBogotaDateKey(new Date(value));
}

function toDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const monthLabel = monthLabelFormatter.format(date).replace(".", "");

  return `${day} de ${monthLabel}`;
}

function isDateKey(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));

  return date.toISOString().slice(0, 10);
}

function startOfMonth(dateKey: string) {
  return `${dateKey.slice(0, 8)}01`;
}

function previousMonthRange(dateKey: string) {
  const [year, month] = dateKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 2, 1, 12));
  const end = new Date(Date.UTC(year, month - 1, 0, 12));

  return {
    endDate: end.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
  };
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();

  return Math.floor((end - start) / 86_400_000) + 1;
}

function toStartIso(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000-05:00`).toISOString();
}

function toEndIso(dateKey: string) {
  return new Date(`${dateKey}T23:59:59.999-05:00`).toISOString();
}

function buildRange({
  endDate,
  error,
  from,
  period,
  startDate,
  to,
}: {
  endDate: string;
  error?: string;
  from?: string;
  period: PerformancePeriod;
  startDate: string;
  to?: string;
}): PerformanceDateRange {
  return {
    days: daysBetween(startDate, endDate),
    endDate,
    endIso: toEndIso(endDate),
    error,
    from: from || startDate,
    period,
    startDate,
    startIso: toStartIso(startDate),
    to: to || endDate,
  };
}

export function getPerformanceDateRange(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  now = new Date(),
): PerformanceDateRange {
  const rawPeriod = searchParams?.period;
  const periodValue = typeof rawPeriod === "string" ? rawPeriod : "current_month";
  const period = validPeriods.has(periodValue as PerformancePeriod)
    ? (periodValue as PerformancePeriod)
    : "current_month";
  const today = toBogotaDateKey(now);

  if (period === "today") {
    return buildRange({ endDate: today, period, startDate: today });
  }

  if (period === "last_7_days") {
    return buildRange({ endDate: today, period, startDate: addDays(today, -6) });
  }

  if (period === "previous_month") {
    return buildRange({ period, ...previousMonthRange(today) });
  }

  if (period === "custom") {
    const rawFrom = searchParams?.from;
    const rawTo = searchParams?.to;
    const from = typeof rawFrom === "string" ? rawFrom : "";
    const to = typeof rawTo === "string" ? rawTo : "";

    if (!from && !to) {
      return buildRange({
        endDate: today,
        from: startOfMonth(today),
        period,
        startDate: startOfMonth(today),
        to: today,
      });
    }

    if (!isDateKey(from) || !isDateKey(to) || from > to || daysBetween(from, to) > 90) {
      return buildRange({
        endDate: today,
        error: "Selecciona un rango de fechas válido.",
        from,
        period,
        startDate: startOfMonth(today),
        to,
      });
    }

    return buildRange({ endDate: to, from, period, startDate: from, to });
  }

  return buildRange({
    endDate: addDays(startOfMonth(addDays(startOfMonth(today), 32)), -1),
    period: "current_month",
    startDate: startOfMonth(today),
  });
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

export function buildDailyPerformanceSeries({
  endDate,
  rawRows,
  startDate,
}: {
  endDate: string;
  rawRows: DashboardSaleRow[];
  startDate: string;
}) {
  const grouped = getDashboardPerformanceData(rawRows).reduce<Record<string, PerformancePoint>>(
    (acc, point) => {
      acc[point.date] = point;
      return acc;
    },
    {},
  );
  const days = daysBetween(startDate, endDate);

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(startDate, index);

    return (
      grouped[date] || {
        date,
        grossProfit: 0,
        label: toDateLabel(date),
        pending: 0,
        saleCount: 0,
        sales: 0,
      }
    );
  });
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
    bestProfitDay: points.reduce<PerformancePoint | null>((best, point) => {
      if (point.saleCount < 1) return best;
      return !best || point.grossProfit > best.grossProfit ? point : best;
    }, null),
    bestSalesDay: points.reduce<PerformancePoint | null>((best, point) => {
      if (point.saleCount < 1) return best;
      return !best || point.sales > best.sales ? point : best;
    }, null),
    daysWithData: points.filter((point) => point.saleCount > 0).length,
  };
}
