import {
  areUnitsCompatible,
  convertMeasurement,
  getMeasurementFamily,
  getUnitSymbol,
  unitsForFamily,
  type MeasurementFamily,
  type MeasurementUnit,
} from "@/lib/measurements";
import { toSafeNumber, type ProductVariantRow } from "@/lib/products/product-utils";

export type InventoryMovementType = "adjustment" | "purchase" | "return" | "sale" | "sale_void" | "waste";
export type ManualMovementKind = "adjustment_negative" | "adjustment_positive" | "purchase" | "return" | "waste";

export type InventoryVariant = ProductVariantRow & {
  low_stock_threshold?: number | string | null;
  inventory_location?: string | null;
  last_counted_at?: string | null;
  product_name: string;
  product_status: string | null;
  track_inventory: boolean | null;
  unit: string | null;
};

export type InventoryMovementRow = {
  id: string;
  movement_code: string | null;
  movement_type: InventoryMovementType | string;
  quantity: number | string | null;
  stock_unit: string | null;
  unit_cost: number | string | null;
  total_cost: number | string | null;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  balance_after: number | string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  product_variants?: (ProductVariantRow & {
    products?: { name: string; status: string | null } | null;
  }) | null;
};

export type InventoryCountRow = {
  id: string;
  count_code: string;
  status: string | null;
  notes: string | null;
  counted_at: string;
  inventory_count_items?: InventoryCountItemRow[] | null;
};

export type InventoryCountItemRow = {
  id: string;
  variant_id: string;
  product_name: string;
  variant_name: string | null;
  system_stock: number | string | null;
  counted_stock: number | string | null;
  difference_quantity: number | string | null;
  stock_unit: string | null;
  total_difference_cost: number | string | null;
};

export type InventoryMovementInput = {
  variantId: string;
  kind: ManualMovementKind;
  quantity: string;
  quantityUnit: MeasurementUnit;
  unitCost: string;
  reason: string;
  notes: string;
};

export type InventoryCountInputItem = {
  variantId: string;
  countedStock: string;
  stockUnit: MeasurementUnit;
};

export type InventoryCountInput = {
  notes: string;
  items: InventoryCountInputItem[];
};

export type InventoryFieldErrors = Record<string, string>;

export const manualMovementKinds: {
  label: string;
  value: ManualMovementKind;
  movementType: "adjustment" | "purchase" | "return" | "waste";
  sign: 1 | -1;
}[] = [
  { label: "Entrada", movementType: "purchase", sign: 1, value: "purchase" },
  { label: "Salida manual", movementType: "adjustment", sign: -1, value: "adjustment_negative" },
  { label: "Merma/pérdida", movementType: "waste", sign: -1, value: "waste" },
  { label: "Devolución", movementType: "return", sign: 1, value: "return" },
  { label: "Ajuste positivo", movementType: "adjustment", sign: 1, value: "adjustment_positive" },
];

export function emptyInventoryMovement(): InventoryMovementInput {
  return {
    kind: "purchase",
    notes: "",
    quantity: "",
    quantityUnit: "unit",
    reason: "",
    unitCost: "",
    variantId: "",
  };
}

export function inventoryValue(variant: InventoryVariant) {
  return toSafeNumber(variant.current_stock) * toSafeNumber(variant.purchase_cost);
}

export function inventoryThreshold(variant: InventoryVariant) {
  return toSafeNumber(variant.low_stock_threshold);
}

export function getInventoryStatus({
  currentStock,
  lowStockThreshold,
  trackInventory,
}: {
  currentStock: unknown;
  lowStockThreshold: unknown;
  trackInventory: boolean | null | undefined;
}) {
  const stock = toSafeNumber(currentStock);
  const threshold = toSafeNumber(lowStockThreshold);
  const hasLowStockAlertConfigured = threshold > 0;

  if (trackInventory === false) {
    return {
      hasLowStockAlertConfigured,
      label: "Sin control",
      status: "untracked" as const,
      tone: "neutral" as const,
    };
  }

  if (stock <= 0) {
    return {
      hasLowStockAlertConfigured,
      label: "Agotado",
      status: "out_of_stock" as const,
      tone: "danger" as const,
    };
  }

  if (hasLowStockAlertConfigured && stock <= threshold) {
    return {
      hasLowStockAlertConfigured,
      label: "Stock bajo",
      status: "low_stock" as const,
      tone: "warning" as const,
    };
  }

  return {
    hasLowStockAlertConfigured,
    label: "En stock",
    status: "in_stock" as const,
    tone: "success" as const,
  };
}

export function inventoryStatus(variant: InventoryVariant) {
  return getInventoryStatus({
    currentStock: variant.current_stock,
    lowStockThreshold: variant.low_stock_threshold,
    trackInventory: variant.track_inventory,
  });
}

export function statusClass(tone: "danger" | "neutral" | "success" | "warning") {
  if (tone === "danger") return "bg-[#FEE2E2] text-[#991B1B]";
  if (tone === "warning") return "bg-[#FEF3C7] text-[#92400E]";
  if (tone === "success") return "bg-[#DCFCE7] text-[#166534]";
  return "bg-[#F8FAFC] text-[#475569] ring-1 ring-[#E2E8F0]";
}

export function inventoryUnitLabel(unit: string | null | undefined) {
  return getUnitSymbol(unit || "unit");
}

export function unitsForVariant(variant?: InventoryVariant) {
  if (!variant || variant.inventory_mode !== "measured") {
    return [{ label: "Unidad", value: "unit" as MeasurementUnit }];
  }

  const family =
    getMeasurementFamily(variant.inventory_unit || "kg") ||
    (variant.measurement_family as MeasurementFamily) ||
    "mass";

  return unitsForFamily(family);
}

export function calculateMovementPreview(input: InventoryMovementInput, variant?: InventoryVariant) {
  const kind = manualMovementKinds.find((item) => item.value === input.kind) || manualMovementKinds[0];
  const quantity = toSafeNumber(input.quantity);
  let quantityInInventoryUnit = quantity;

  if (variant?.inventory_mode === "measured") {
    quantityInInventoryUnit = areUnitsCompatible(input.quantityUnit, variant.inventory_unit || "unit")
      ? convertMeasurement(quantity, input.quantityUnit, variant.inventory_unit || "unit")
      : 0;
  }

  const signedQuantity = quantityInInventoryUnit * kind.sign;
  const currentStock = toSafeNumber(variant?.current_stock);
  const finalStock = currentStock + signedQuantity;

  return {
    currentStock,
    finalStock,
    movementType: kind.movementType,
    quantityInInventoryUnit,
    signedQuantity,
    stockError: finalStock < 0 ? "No hay suficiente inventario para completar este movimiento." : "",
  };
}

export function validateMovementInput(input: InventoryMovementInput, variant?: InventoryVariant) {
  const fieldErrors: InventoryFieldErrors = {};

  if (!input.variantId || !variant) {
    fieldErrors.variantId = "Selecciona un producto.";
  }

  if (toSafeNumber(input.quantity) <= 0) {
    fieldErrors.quantity = "La cantidad debe ser mayor que cero.";
  }

  const preview = calculateMovementPreview(input, variant);

  if (variant?.inventory_mode === "measured" && preview.quantityInInventoryUnit <= 0) {
    fieldErrors.quantityUnit = "La unidad no es compatible con este producto.";
  }

  if (preview.stockError) {
    fieldErrors.quantity = preview.stockError;
  }

  return {
    error: Object.values(fieldErrors)[0] || "",
    fieldErrors,
    ok: Object.keys(fieldErrors).length === 0,
    preview,
  };
}

export function validateCountInput(input: InventoryCountInput, variants: InventoryVariant[]) {
  const fieldErrors: InventoryFieldErrors = {};

  if (!input.items.length) {
    fieldErrors.items = "Selecciona al menos un producto.";
  }

  input.items.forEach((item, index) => {
    const variant = variants.find((current) => current.id === item.variantId);

    if (!variant) {
      fieldErrors[`items.${index}.variantId`] = "Selecciona un producto.";
    }

    if (toSafeNumber(item.countedStock) < 0 || !String(item.countedStock).trim()) {
      fieldErrors[`items.${index}.countedStock`] = "El stock contado no puede ser negativo.";
    }
  });

  return {
    error: Object.values(fieldErrors)[0] || "",
    fieldErrors,
    ok: Object.keys(fieldErrors).length === 0,
  };
}

export function movementTypeLabel(type: string | null | undefined) {
  if (type === "purchase") return "Entrada";
  if (type === "return") return "Devolución";
  if (type === "waste") return "Merma";
  if (type === "sale") return "Venta";
  if (type === "sale_void") return "Anulación";
  return "Ajuste";
}
