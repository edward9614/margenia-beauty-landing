export const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function toNumber(value: string) {
  const normalized = value.replace(/[^\d-]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(parsed, 0);
}

export function calculateSuggestedPrice({
  baseCost,
  commissionPercent,
  desiredMargin,
}: {
  baseCost: number;
  commissionPercent: number;
  desiredMargin: number;
}) {
  const denominator = 1 - commissionPercent / 100 - desiredMargin / 100;

  if (denominator <= 0 || !Number.isFinite(denominator)) {
    return 0;
  }

  const suggestedPrice = baseCost / denominator;

  return Number.isFinite(suggestedPrice) ? suggestedPrice : 0;
}

export function calculateMinimumPrice({
  baseCost,
  commissionPercent,
}: {
  baseCost: number;
  commissionPercent: number;
}) {
  const denominator = 1 - commissionPercent / 100;

  if (denominator <= 0 || !Number.isFinite(denominator)) {
    return 0;
  }

  const minimumPrice = baseCost / denominator;

  return Number.isFinite(minimumPrice) ? minimumPrice : 0;
}

export function formatCOPInput(value: string) {
  const amount = toNumber(value);

  if (amount <= 0) {
    return "";
  }

  return currencyFormatter.format(amount);
}
