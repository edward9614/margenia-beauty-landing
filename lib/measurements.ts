export type MeasurementFamily = "count" | "length" | "mass" | "volume";

export type MeasurementUnit =
  | "cm"
  | "g"
  | "kg"
  | "l"
  | "lb_500g"
  | "lb_international"
  | "m"
  | "mg"
  | "ml"
  | "mm"
  | "oz"
  | "unit";

export const measurementFamilies: {
  label: string;
  value: Exclude<MeasurementFamily, "count">;
}[] = [
  { label: "Peso", value: "mass" },
  { label: "Volumen", value: "volume" },
  { label: "Longitud", value: "length" },
];

export const measurementUnits: Record<
  MeasurementUnit,
  {
    family: MeasurementFamily;
    factor: number;
    label: string;
    symbol: string;
  }
> = {
  cm: { factor: 10, family: "length", label: "Centímetro", symbol: "cm" },
  g: { factor: 1, family: "mass", label: "Gramo", symbol: "g" },
  kg: { factor: 1000, family: "mass", label: "Kilogramo", symbol: "kg" },
  l: { factor: 1000, family: "volume", label: "Litro", symbol: "l" },
  lb_500g: {
    factor: 500,
    family: "mass",
    label: "Libra comercial (500 g)",
    symbol: "lb comercial",
  },
  lb_international: {
    factor: 453.59237,
    family: "mass",
    label: "Libra internacional (453,592 g)",
    symbol: "lb internacional",
  },
  m: { factor: 1000, family: "length", label: "Metro", symbol: "m" },
  mg: { factor: 0.001, family: "mass", label: "Miligramo", symbol: "mg" },
  ml: { factor: 1, family: "volume", label: "Mililitro", symbol: "ml" },
  mm: { factor: 1, family: "length", label: "Milímetro", symbol: "mm" },
  oz: { factor: 28.349523125, family: "mass", label: "Onza", symbol: "oz" },
  unit: { factor: 1, family: "count", label: "Unidad", symbol: "unidad" },
};

export function getMeasurementFamily(unit: string): MeasurementFamily | null {
  return measurementUnits[unit as MeasurementUnit]?.family || null;
}

export function getUnitLabel(unit: string): string {
  return measurementUnits[unit as MeasurementUnit]?.label || unit;
}

export function getUnitSymbol(unit: string): string {
  return measurementUnits[unit as MeasurementUnit]?.symbol || unit;
}

export function areUnitsCompatible(fromUnit: string, toUnit: string): boolean {
  const fromFamily = getMeasurementFamily(fromUnit);
  const toFamily = getMeasurementFamily(toUnit);

  return Boolean(fromFamily && toFamily && fromFamily === toFamily);
}

export function convertMeasurement(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number {
  const from = measurementUnits[fromUnit as MeasurementUnit];
  const to = measurementUnits[toUnit as MeasurementUnit];

  if (!Number.isFinite(quantity) || quantity < 0) {
    return 0;
  }

  if (!from || !to || from.family !== to.family) {
    return 0;
  }

  return (quantity * from.factor) / to.factor;
}

export function formatMeasuredQuantity(quantity: number, unit: string): string {
  const formatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  });

  return `${formatter.format(quantity)} ${getUnitSymbol(unit)}`;
}

export function unitsForFamily(family: MeasurementFamily) {
  return Object.entries(measurementUnits)
    .filter(([, config]) => config.family === family)
    .map(([value, config]) => ({
      label: config.label,
      symbol: config.symbol,
      value,
    }));
}
