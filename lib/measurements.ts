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

export function calculateNormalizedUnitCost({
  inventoryUnit,
  packageCost,
  packageQuantity,
  packageUnit,
}: {
  inventoryUnit: string;
  packageCost: number;
  packageQuantity: number;
  packageUnit: string;
}) {
  if (!Number.isFinite(packageCost) || packageCost < 0) {
    throw new Error("El costo de compra no puede ser negativo.");
  }

  if (!Number.isFinite(packageQuantity) || packageQuantity <= 0) {
    throw new Error("La presentación debe contener una cantidad mayor que cero.");
  }

  if (!areUnitsCompatible(packageUnit, inventoryUnit)) {
    throw new Error("La unidad de compra y venta deben ser compatibles.");
  }

  const quantityInInventoryUnit = convertMeasurement(
    packageQuantity,
    packageUnit,
    inventoryUnit,
  );

  if (quantityInInventoryUnit <= 0) {
    throw new Error("La presentación debe contener una cantidad mayor que cero.");
  }

  return packageCost / quantityInInventoryUnit;
}

export function calculateProfit({
  baseCost,
  commissionPercent,
  packagingCost,
  salePrice,
  taxPercent,
}: {
  baseCost: number;
  commissionPercent: number;
  packagingCost: number;
  salePrice: number;
  taxPercent: number;
}) {
  const taxAmount = salePrice * (taxPercent / 100);
  const commissionAmount = salePrice * (commissionPercent / 100);
  const totalCost = baseCost + packagingCost + taxAmount + commissionAmount;
  const netProfit = salePrice - totalCost;
  const marginPercent = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

  return {
    commissionAmount,
    marginPercent,
    netProfit,
    taxAmount,
    totalCost,
  };
}

export function calculateMeasuredSale({
  commissionPercent,
  costPerInventoryUnit,
  defaultSaleUnit,
  inventoryUnit,
  packagingCost,
  salePricePerDefaultUnit,
  saleQuantity,
  saleUnit,
  taxPercent,
}: {
  commissionPercent: number;
  costPerInventoryUnit: number;
  defaultSaleUnit: string;
  inventoryUnit: string;
  packagingCost: number;
  salePricePerDefaultUnit: number;
  saleQuantity: number;
  saleUnit: string;
  taxPercent: number;
}) {
  if (saleQuantity <= 0) {
    throw new Error("La cantidad vendida debe ser mayor que cero.");
  }

  if (
    !areUnitsCompatible(saleUnit, inventoryUnit) ||
    !areUnitsCompatible(defaultSaleUnit, inventoryUnit)
  ) {
    throw new Error("La unidad de venta no es compatible con el inventario.");
  }

  const quantityInInventoryUnit = convertMeasurement(
    saleQuantity,
    saleUnit,
    inventoryUnit,
  );
  const defaultSaleUnitInInventoryUnit = convertMeasurement(
    1,
    defaultSaleUnit,
    inventoryUnit,
  );
  const saleSubtotal =
    defaultSaleUnitInInventoryUnit > 0
      ? (quantityInInventoryUnit / defaultSaleUnitInInventoryUnit) *
        salePricePerDefaultUnit
      : 0;
  const baseCost = quantityInInventoryUnit * costPerInventoryUnit;
  const profit = calculateProfit({
    baseCost,
    commissionPercent,
    packagingCost,
    salePrice: saleSubtotal,
    taxPercent,
  });

  return {
    ...profit,
    baseCost,
    quantityInInventoryUnit,
    saleSubtotal,
  };
}

export function subtractMeasuredStock({
  currentStock,
  inventoryUnit,
  saleQuantity,
  saleUnit,
}: {
  currentStock: number;
  inventoryUnit: string;
  saleQuantity: number;
  saleUnit: string;
}) {
  if (saleQuantity <= 0) {
    throw new Error("La cantidad vendida debe ser mayor que cero.");
  }

  if (!areUnitsCompatible(saleUnit, inventoryUnit)) {
    throw new Error("La unidad de venta no es compatible con el inventario.");
  }

  const quantityInInventoryUnit = convertMeasurement(
    saleQuantity,
    saleUnit,
    inventoryUnit,
  );

  if (quantityInInventoryUnit > currentStock) {
    throw new Error("No hay suficiente inventario disponible.");
  }

  return currentStock - quantityInInventoryUnit;
}

export function allocateStockFromBatches<TBatch extends {
  expirationDate?: Date | null;
  id: string;
  remainingQuantity: number;
}>({
  batches,
  quantityNeeded,
}: {
  batches: TBatch[];
  quantityNeeded: number;
}) {
  if (quantityNeeded <= 0) {
    throw new Error("La cantidad requerida debe ser mayor que cero.");
  }

  const sortedBatches = [...batches].sort((a, b) => {
    const aTime = a.expirationDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.expirationDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
  let pending = quantityNeeded;
  const allocations: { batchId: string; quantity: number }[] = [];

  for (const batch of sortedBatches) {
    if (pending <= 0) {
      break;
    }

    const quantity = Math.min(batch.remainingQuantity, pending);

    if (quantity > 0) {
      allocations.push({ batchId: batch.id, quantity });
      pending -= quantity;
    }
  }

  if (pending > 0) {
    throw new Error("No hay suficiente inventario disponible.");
  }

  return allocations;
}

export function formatMeasuredQuantity(quantity: number, unit: string): string {
  const formatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 3,
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
