import {
  areUnitsCompatible,
  convertMeasurement,
  getUnitSymbol,
  type MeasurementUnit,
} from "@/lib/measurements";
import { moneyFormatter, toSafeNumber, type ProductVariantRow } from "@/lib/products/product-utils";

export type ComboStatus = "active" | "archived";

export type ComboItemRow = {
  id: string;
  business_id?: string | null;
  combo_id?: string | null;
  product_id: string;
  variant_id: string;
  quantity: number | string | null;
  quantity_unit: string | null;
  quantity_in_inventory_unit: number | string | null;
  position: number | null;
  status: ComboStatus | string | null;
  product_variants?: (ProductVariantRow & {
    products?: {
      id: string;
      name: string;
      track_inventory: boolean | null;
      unit: string | null;
      status: string | null;
    } | null;
  }) | null;
};

export type ComboRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  sale_price: number | string | null;
  packaging_cost: number | string | null;
  commission_percent: number | string | null;
  desired_margin_percent: number | string | null;
  tax_percent: number | string | null;
  status: ComboStatus | string | null;
  created_at?: string | null;
  combo_items?: ComboItemRow[] | null;
};

export type ComboCatalogVariant = ProductVariantRow & {
  product_name: string;
  product_status: string | null;
  track_inventory: boolean | null;
  unit: string | null;
};

export type ComboFormItemInput = {
  id?: string;
  productId: string;
  variantId: string;
  quantity: string;
  quantityUnit: MeasurementUnit;
  quantityInInventoryUnit: string;
  position: number;
  status: ComboStatus;
};

export type ComboFormInput = {
  id?: string;
  name: string;
  description: string;
  category: string;
  salePrice: string;
  packagingCost: string;
  commissionPercent: string;
  desiredMarginPercent: string;
  taxPercent: string;
  status: ComboStatus;
  items: ComboFormItemInput[];
};

export type ComboFieldErrors = Record<string, string>;

export type ComboValidationResult =
  | { ok: true; value: NormalizedComboFormInput }
  | { ok: false; error: string; fieldErrors: ComboFieldErrors };

export type NormalizedComboItemInput = Omit<
  ComboFormItemInput,
  "position" | "quantity" | "quantityInInventoryUnit"
> & {
  position: number;
  quantity: number;
  quantityInInventoryUnit: number;
};

export type NormalizedComboFormInput = Omit<
  ComboFormInput,
  | "commissionPercent"
  | "desiredMarginPercent"
  | "items"
  | "packagingCost"
  | "salePrice"
  | "taxPercent"
> & {
  commissionPercent: number;
  desiredMarginPercent: number;
  items: NormalizedComboItemInput[];
  packagingCost: number;
  salePrice: number;
  taxPercent: number;
};

export function emptyComboForm(): ComboFormInput {
  return {
    category: "",
    commissionPercent: "0",
    description: "",
    desiredMarginPercent: "35",
    items: [],
    name: "",
    packagingCost: "0",
    salePrice: "",
    status: "active",
    taxPercent: "0",
  };
}

export function calculateComboItemCost(
  item: Pick<ComboFormItemInput, "quantityInInventoryUnit">,
  variant: ProductVariantRow,
) {
  const quantity = toSafeNumber(item.quantityInInventoryUnit);
  return quantity * toSafeNumber(variant.purchase_cost);
}

export function calculateComboBaseCost(
  items: Pick<ComboFormItemInput, "quantityInInventoryUnit" | "variantId">[],
  variants: ProductVariantRow[],
) {
  return items.reduce((total, item) => {
    const variant = variants.find((current) => current.id === item.variantId);
    return variant ? total + calculateComboItemCost(item, variant) : total;
  }, 0);
}

export function calculateComboPriceSuggestion({
  baseCost,
  commissionPercent,
  desiredMarginPercent,
  packagingCost,
  taxPercent,
}: {
  baseCost: number;
  commissionPercent: number;
  desiredMarginPercent: number;
  packagingCost: number;
  taxPercent: number;
}) {
  const denominator =
    1 - commissionPercent / 100 - desiredMarginPercent / 100 - taxPercent / 100;

  if (denominator <= 0) {
    return {
      denominator,
      error: "La comisión, impuesto y margen no pueden sumar 100% o más.",
      suggestedPrice: 0,
    };
  }

  return {
    denominator,
    error: "",
    suggestedPrice: (baseCost + packagingCost) / denominator,
  };
}

export function calculateComboProfit({
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
  const commissionAmount = salePrice * (commissionPercent / 100);
  const taxAmount = salePrice * (taxPercent / 100);
  const totalCost = baseCost + packagingCost + commissionAmount + taxAmount;
  const profit = salePrice - totalCost;
  const marginPercent = salePrice > 0 ? (profit / salePrice) * 100 : 0;

  return {
    commissionAmount,
    marginPercent,
    profit,
    taxAmount,
    totalCost,
  };
}

export function calculateAvailableComboStock(
  items: Pick<ComboFormItemInput, "quantityInInventoryUnit" | "variantId">[],
  variants: ComboCatalogVariant[],
) {
  const controlled = items
    .map((item) => {
      const variant = variants.find((current) => current.id === item.variantId);

      if (!variant || variant.track_inventory === false) {
        return null;
      }

      const required = toSafeNumber(item.quantityInInventoryUnit);
      const stock = toSafeNumber(variant.current_stock);

      if (required <= 0) {
        return 0;
      }

      return Math.floor(stock / required);
    })
    .filter((value): value is number => value !== null);

  if (!controlled.length) {
    return null;
  }

  return Math.max(Math.min(...controlled), 0);
}

export function quantityInInventoryUnit({
  quantity,
  quantityUnit,
  variant,
}: {
  quantity: string | number;
  quantityUnit: string;
  variant: ProductVariantRow;
}) {
  const parsedQuantity = toSafeNumber(quantity);
  const inventoryMode = variant.inventory_mode || "unit";
  const inventoryUnit = variant.inventory_unit || "unit";

  if (inventoryMode !== "measured") {
    return parsedQuantity;
  }

  if (!areUnitsCompatible(quantityUnit, inventoryUnit)) {
    return 0;
  }

  return convertMeasurement(parsedQuantity, quantityUnit, inventoryUnit);
}

export function validateComboInput(
  input: ComboFormInput,
  variants: ComboCatalogVariant[] = [],
): ComboValidationResult {
  const fieldErrors: ComboFieldErrors = {};
  const normalized: NormalizedComboFormInput = {
    ...input,
    category: input.category.trim(),
    commissionPercent: toSafeNumber(input.commissionPercent),
    description: input.description.trim(),
    desiredMarginPercent: toSafeNumber(input.desiredMarginPercent),
    items: [],
    name: input.name.trim(),
    packagingCost: toSafeNumber(input.packagingCost),
    salePrice: toSafeNumber(input.salePrice),
    status: input.status === "archived" ? "archived" : "active",
    taxPercent: toSafeNumber(input.taxPercent),
  };

  if (!normalized.name) {
    fieldErrors.name = "Escribe el nombre del combo.";
  }

  if (!input.items.length) {
    fieldErrors.items = "Agrega al menos un producto al combo.";
  }

  if (normalized.salePrice <= 0) {
    fieldErrors.salePrice = "El precio del combo debe ser mayor que cero.";
  }

  if (
    normalized.commissionPercent +
      normalized.taxPercent +
      normalized.desiredMarginPercent >=
    100
  ) {
    const message = "La comisión, impuesto y margen no pueden sumar 100% o más.";
    fieldErrors.commissionPercent = message;
    fieldErrors.taxPercent = message;
    fieldErrors.desiredMarginPercent = message;
  }

  normalized.items = input.items.map((item, index) => {
    const variant = variants.find((current) => current.id === item.variantId);
    const prefix = `items.${index}`;
    const quantity = toSafeNumber(item.quantity);
    const converted = toSafeNumber(item.quantityInInventoryUnit);

    if (!item.productId || !item.variantId || !variant) {
      fieldErrors[`${prefix}.variantId`] = "Selecciona un producto activo.";
    }

    if (quantity <= 0 || converted <= 0) {
      fieldErrors[`${prefix}.quantity`] = "La cantidad debe ser mayor que cero.";
    }

    if (variant?.track_inventory !== false && converted > toSafeNumber(variant?.current_stock)) {
      fieldErrors[`${prefix}.quantity`] = "Este producto no tiene stock suficiente.";
    }

    return {
      ...item,
      position: index,
      quantity,
      quantityInInventoryUnit: converted,
      status: item.status === "archived" ? "archived" : "active",
    };
  });

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: Object.values(fieldErrors)[0] || "Revisa los datos del combo.",
      fieldErrors,
      ok: false,
    };
  }

  return { ok: true, value: normalized };
}

export function comboStatusLabel(status: string | null | undefined) {
  return status === "archived" ? "Archivado" : "Activo";
}

export function comboStockLabel(stock: number | null) {
  return stock === null ? "Sin control" : `${stock} combos`;
}

export function comboItemUnitLabel(unit: string) {
  return getUnitSymbol(unit);
}

export const comboMoneyFormatter = moneyFormatter;
