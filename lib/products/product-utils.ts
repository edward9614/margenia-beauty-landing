import {
  areUnitsCompatible,
  convertMeasurement,
  getMeasurementFamily,
  type MeasurementFamily,
  type MeasurementUnit,
} from "@/lib/measurements";

export type ProductType = "simple" | "variants";
export type ProductStatus = "active" | "archived";
export type InventoryMode = "measured" | "unit";

export type ProductVariantRow = {
  id: string;
  business_id?: string;
  product_id?: string;
  name: string | null;
  sku: string | null;
  purchase_cost: number | string | null;
  packaging_cost: number | string | null;
  commission_percent: number | string | null;
  desired_margin_percent: number | string | null;
  sale_price: number | string | null;
  current_stock: number | string | null;
  minimum_stock: number | string | null;
  allow_fractional_sales?: boolean | null;
  default_sale_unit?: string | null;
  inventory_mode?: string | null;
  inventory_unit?: string | null;
  measurement_family?: string | null;
  minimum_sale_quantity?: number | string | null;
  purchase_package_cost?: number | string | null;
  purchase_package_label?: string | null;
  purchase_package_quantity?: number | string | null;
  purchase_package_unit?: string | null;
  sale_quantity_step?: number | string | null;
  status: ProductStatus | string | null;
};

export type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  brand: string | null;
  category: string | null;
  unit: string | null;
  product_type: ProductType | string | null;
  track_inventory: boolean | null;
  status: ProductStatus | string | null;
  created_at?: string | null;
  product_variants?: ProductVariantRow[] | null;
};

export type ProductVariantInput = {
  id?: string;
  name: string;
  sku: string;
  purchaseCost: string;
  packagingCost: string;
  commissionPercent: string;
  desiredMarginPercent: string;
  salePrice: string;
  currentStock: string;
  minimumStock: string;
  allowFractionalSales: boolean;
  defaultSaleUnit: MeasurementUnit;
  inventoryMode: InventoryMode;
  inventoryUnit: MeasurementUnit;
  measurementFamily: MeasurementFamily;
  minimumSaleQuantity: string;
  packageCount: string;
  purchasePackageCost: string;
  purchasePackageLabel: string;
  purchasePackageQuantity: string;
  purchasePackageUnit: MeasurementUnit;
  saleQuantityStep: string;
  status: ProductStatus;
};

export type ProductFormInput = {
  name: string;
  description: string;
  brand: string;
  category: string;
  unit: string;
  productType: ProductType;
  inventoryMode: InventoryMode;
  trackInventory: boolean;
  status: ProductStatus;
  variants: ProductVariantInput[];
};

export type NormalizedProductVariantInput = Omit<
  ProductVariantInput,
  | "purchaseCost"
  | "packagingCost"
  | "commissionPercent"
  | "desiredMarginPercent"
  | "salePrice"
  | "currentStock"
  | "minimumStock"
  | "minimumSaleQuantity"
  | "packageCount"
  | "purchasePackageCost"
  | "purchasePackageQuantity"
  | "saleQuantityStep"
> & {
  purchaseCost: number;
  packagingCost: number;
  commissionPercent: number;
  desiredMarginPercent: number;
  salePrice: number;
  currentStock: number;
  minimumStock: number;
  allowFractionalSales: boolean;
  defaultSaleUnit: MeasurementUnit;
  inventoryMode: InventoryMode;
  inventoryUnit: MeasurementUnit;
  measurementFamily: MeasurementFamily;
  minimumSaleQuantity: number;
  packageCount: number;
  purchasePackageCost: number;
  purchasePackageLabel: string;
  purchasePackageQuantity: number;
  purchasePackageUnit: MeasurementUnit;
  saleQuantityStep: number;
};

export type NormalizedProductFormInput = Omit<ProductFormInput, "variants"> & {
  variants: NormalizedProductVariantInput[];
};

export type ProductFieldErrors = Record<string, string>;

export type ProductValidationResult =
  | { ok: true; value: NormalizedProductFormInput }
  | { ok: false; error: string; fieldErrors: ProductFieldErrors };

export const productUnits = [
  "Unidad",
  "Paquete",
  "Caja",
  "Kilogramo",
  "Gramo",
  "Litro",
  "Mililitro",
  "Metro",
  "Servicio",
  "Otro",
];

export function emptyVariant(): ProductVariantInput {
  return {
    commissionPercent: "0",
    currentStock: "",
    allowFractionalSales: false,
    defaultSaleUnit: "unit",
    desiredMarginPercent: "35",
    inventoryMode: "unit",
    inventoryUnit: "unit",
    measurementFamily: "count",
    minimumStock: "",
    minimumSaleQuantity: "1",
    name: "Presentación estándar",
    packageCount: "1",
    packagingCost: "",
    purchaseCost: "",
    purchasePackageCost: "",
    purchasePackageLabel: "Unidad",
    purchasePackageQuantity: "1",
    purchasePackageUnit: "unit",
    saleQuantityStep: "1",
    salePrice: "",
    sku: "",
    status: "active",
  };
}

export function moneyFormatter(currency = "COP") {
  return new Intl.NumberFormat("es-CO", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  });
}

export function toSafeNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value || "").replace(/[^\d.-]/g, ""));

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(parsed, 0);
}

export function sanitizeNumericInput(value: string): string {
  const normalized = value.replace(/,/g, ".").replace(/[^\d.]/g, "");

  if (!normalized) {
    return "";
  }

  const parts = normalized.split(".");

  if (parts.length === 1) {
    return parts[0];
  }

  const lastPart = parts[parts.length - 1] || "";
  const integerParts = parts.slice(0, -1);
  const hasMultipleSeparators = parts.length > 2;
  const looksLikeThousands =
    lastPart.length === 3 &&
    integerParts.every((part, index) =>
      index === 0 ? part.length > 0 && part.length <= 3 : part.length === 3,
    );

  if (looksLikeThousands) {
    return parts.join("");
  }

  if (hasMultipleSeparators) {
    return `${integerParts.join("")}.${lastPart}`;
  }

  return `${integerParts[0]}.${lastPart}`;
}

export function parseNonNegativeNumber(value: string): number {
  const normalized = sanitizeNumericInput(value);

  if (!normalized || normalized === ".") {
    return 0;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(parsed, 0);
}

export function cleanOptionalText(value: unknown) {
  const clean = String(value || "").trim();
  return clean ? clean : "";
}

export function nullableText(value: string) {
  const clean = value.trim();
  return clean ? clean : null;
}

type VariantCalculationInput = Pick<
  ProductVariantInput | NormalizedProductVariantInput,
  | "commissionPercent"
  | "desiredMarginPercent"
  | "packagingCost"
  | "purchaseCost"
  | "salePrice"
>;

function numericValue(value: string | number): number {
  return typeof value === "number" ? toSafeNumber(value) : parseNonNegativeNumber(value);
}

export function calculateVariantProfit({
  commissionPercent,
  desiredMarginPercent,
  packagingCost,
  purchaseCost,
  salePrice,
}: VariantCalculationInput) {
  const safePurchaseCost = numericValue(purchaseCost);
  const safePackagingCost = numericValue(packagingCost);
  const safeCommissionPercent = numericValue(commissionPercent);
  const safeDesiredMarginPercent = numericValue(desiredMarginPercent);
  const safeSalePrice = numericValue(salePrice);
  const totalUnitCost = safePurchaseCost + safePackagingCost;
  const denominator =
    1 - safeCommissionPercent / 100 - safeDesiredMarginPercent / 100;
  const suggestedPrice = denominator > 0 ? totalUnitCost / denominator : 0;
  const estimatedCommission = safeSalePrice * (safeCommissionPercent / 100);
  const estimatedProfit = safeSalePrice - totalUnitCost - estimatedCommission;
  const actualMargin = safeSalePrice > 0 ? (estimatedProfit / safeSalePrice) * 100 : 0;
  const invalidRate = safeCommissionPercent + safeDesiredMarginPercent >= 100;

  const state = invalidRate
    ? "invalid"
    : estimatedProfit <= 0
      ? "loss"
      : actualMargin >= safeDesiredMarginPercent - 2
        ? "profitable"
        : "tight";

  return {
    actualMargin,
    estimatedCommission,
    estimatedProfit,
    invalidRate,
    state,
    suggestedPrice,
    totalUnitCost,
  };
}

export function calculateMeasuredVariant(
  variant: ProductVariantInput | NormalizedProductVariantInput,
) {
  if (variant.inventoryMode !== "measured") {
    return null;
  }

  const purchasePackageQuantity = numericValue(variant.purchasePackageQuantity);
  const purchasePackageCost = numericValue(variant.purchasePackageCost);
  const packageCount = numericValue(variant.packageCount);
  const salePrice = numericValue(variant.salePrice);
  const packagingCost = numericValue(variant.packagingCost);
  const commissionPercent = numericValue(variant.commissionPercent);
  const currentStock = numericValue(variant.currentStock);
  const purchaseQuantityInInventoryUnit = convertMeasurement(
    purchasePackageQuantity,
    variant.purchasePackageUnit,
    variant.inventoryUnit,
  );
  const costPerInventoryUnit =
    purchaseQuantityInInventoryUnit > 0
      ? purchasePackageCost / purchaseQuantityInInventoryUnit
      : 0;
  const saleUnitInInventoryUnit = convertMeasurement(
    1,
    variant.defaultSaleUnit,
    variant.inventoryUnit,
  );
  const costPerSaleUnit = costPerInventoryUnit * saleUnitInInventoryUnit;
  const commissionAmount = salePrice * (commissionPercent / 100);
  const estimatedProfit = salePrice - costPerSaleUnit - packagingCost - commissionAmount;
  const actualMargin = salePrice > 0 ? (estimatedProfit / salePrice) * 100 : 0;
  const potentialRevenue =
    saleUnitInInventoryUnit > 0 ? (currentStock / saleUnitInInventoryUnit) * salePrice : 0;
  const potentialProfit =
    saleUnitInInventoryUnit > 0
      ? (currentStock / saleUnitInInventoryUnit) * estimatedProfit
      : 0;

  return {
    actualMargin,
    commissionAmount,
    costPerInventoryUnit,
    costPerSaleUnit,
    estimatedProfit,
    initialStock: purchaseQuantityInInventoryUnit * packageCount,
    potentialProfit,
    potentialRevenue,
    purchaseQuantityInInventoryUnit,
    saleUnitInInventoryUnit,
  };
}

export function validateProductInput(input: ProductFormInput): ProductValidationResult {
  const productType: ProductType = input.productType === "variants" ? "variants" : "simple";
  const status: ProductStatus = input.status === "archived" ? "archived" : "active";
  const fieldErrors: ProductFieldErrors = {};

  const normalized: NormalizedProductFormInput = {
    brand: cleanOptionalText(input.brand).slice(0, 100),
    category: cleanOptionalText(input.category).slice(0, 100),
    description: cleanOptionalText(input.description).slice(0, 1000),
    name: cleanOptionalText(input.name).slice(0, 120),
    inventoryMode: input.inventoryMode === "measured" ? "measured" : "unit",
    productType,
    status,
    trackInventory: Boolean(input.trackInventory),
    unit: cleanOptionalText(input.unit) || "Unidad",
    variants: input.variants.map((variant) => ({
      commissionPercent: parseNonNegativeNumber(variant.commissionPercent),
      currentStock: parseNonNegativeNumber(variant.currentStock),
      desiredMarginPercent: parseNonNegativeNumber(variant.desiredMarginPercent),
      id: variant.id,
      allowFractionalSales: Boolean(variant.allowFractionalSales),
      defaultSaleUnit: variant.defaultSaleUnit || "unit",
      inventoryMode: variant.inventoryMode === "measured" ? "measured" : "unit",
      inventoryUnit: variant.inventoryUnit || "unit",
      measurementFamily: variant.measurementFamily || "count",
      minimumStock: parseNonNegativeNumber(variant.minimumStock),
      minimumSaleQuantity: parseNonNegativeNumber(variant.minimumSaleQuantity),
      name: cleanOptionalText(variant.name).slice(0, 100),
      packageCount: parseNonNegativeNumber(variant.packageCount),
      packagingCost: parseNonNegativeNumber(variant.packagingCost),
      purchaseCost: parseNonNegativeNumber(variant.purchaseCost),
      purchasePackageCost: parseNonNegativeNumber(variant.purchasePackageCost),
      purchasePackageLabel: cleanOptionalText(variant.purchasePackageLabel).slice(0, 80),
      purchasePackageQuantity: parseNonNegativeNumber(variant.purchasePackageQuantity),
      purchasePackageUnit: variant.purchasePackageUnit || "unit",
      saleQuantityStep: parseNonNegativeNumber(variant.saleQuantityStep),
      salePrice: parseNonNegativeNumber(variant.salePrice),
      sku: cleanOptionalText(variant.sku).slice(0, 80),
      status: variant.status === "archived" ? "archived" : "active",
    })),
  };

  if (!normalized.name) {
    fieldErrors.name = "Escribe el nombre del producto.";
  }

  if (!normalized.unit) {
    fieldErrors.unit = "Selecciona una unidad de medida.";
  }

  if (normalized.variants.length < 1) {
    fieldErrors.variants = "Agrega al menos una variante.";
  }

  const seenSkus = new Map<string, number>();

  for (const [index, variant] of normalized.variants.entries()) {
    const originalVariant = input.variants[index];
    const prefix = `variants.${index}`;

    if (!variant.name) {
      fieldErrors[`${prefix}.name`] = "Cada variante debe tener un nombre.";
    }

    const isMeasured = input.inventoryMode === "measured" || variant.inventoryMode === "measured";

    if (!originalVariant?.purchaseCost && !isMeasured) {
      fieldErrors[`${prefix}.purchaseCost`] = "Ingresa un costo válido.";
    }

    if (variant.commissionPercent >= 100) {
      fieldErrors[`${prefix}.commissionPercent`] =
        "La comisión debe estar entre 0% y 99,99%.";
    }

    if (variant.desiredMarginPercent >= 100) {
      fieldErrors[`${prefix}.desiredMarginPercent`] =
        "El margen debe estar entre 0% y 99,99%.";
    }

    if (variant.commissionPercent + variant.desiredMarginPercent >= 100) {
      const message = "La comisión y el margen deseado deben sumar menos de 100%.";
      fieldErrors[`${prefix}.commissionPercent`] ||= message;
      fieldErrors[`${prefix}.desiredMarginPercent`] ||= message;
    }

    if (status === "active" && variant.status === "active" && variant.salePrice <= 0) {
      fieldErrors[`${prefix}.salePrice`] =
        "Ingresa un precio de venta o usa el precio sugerido.";
    }

    if (variant.currentStock < 0 || variant.minimumStock < 0) {
      fieldErrors[`${prefix}.currentStock`] = "La existencia no puede ser negativa.";
    }

    if (isMeasured) {
      const inventoryFamily = getMeasurementFamily(variant.inventoryUnit);
      const measured = calculateMeasuredVariant({
        ...(originalVariant || emptyVariant()),
        currentStock: String(variant.currentStock),
        inventoryMode: "measured",
      });

      if (!inventoryFamily || inventoryFamily === "count") {
        fieldErrors[`${prefix}.measurementFamily`] = "Selecciona el tipo de medida.";
      }

      if (!variant.inventoryUnit || !getMeasurementFamily(variant.inventoryUnit)) {
        fieldErrors[`${prefix}.inventoryUnit`] = "Selecciona una unidad de inventario.";
      }

      if (variant.purchasePackageQuantity <= 0) {
        fieldErrors[`${prefix}.purchasePackageQuantity`] =
          "La presentación debe contener una cantidad mayor que cero.";
      }

      if (!originalVariant?.purchasePackageCost) {
        fieldErrors[`${prefix}.purchasePackageCost`] = "Ingresa el costo total de compra.";
      }

      if (!areUnitsCompatible(variant.purchasePackageUnit, variant.inventoryUnit)) {
        fieldErrors[`${prefix}.purchasePackageUnit`] =
          "La unidad de compra no es compatible con el inventario.";
      }

      if (!areUnitsCompatible(variant.defaultSaleUnit, variant.inventoryUnit)) {
        fieldErrors[`${prefix}.defaultSaleUnit`] =
          "La unidad de venta no es compatible con el inventario.";
      }

      if (variant.minimumSaleQuantity <= 0) {
        fieldErrors[`${prefix}.minimumSaleQuantity`] =
          "La cantidad mínima debe ser mayor que cero.";
      }

      if (variant.saleQuantityStep <= 0) {
        fieldErrors[`${prefix}.saleQuantityStep`] = "El incremento debe ser mayor que cero.";
      }

      normalized.variants[index] = {
        ...variant,
        inventoryMode: "measured",
        measurementFamily: (inventoryFamily || variant.measurementFamily) as MeasurementFamily,
        purchaseCost: measured?.costPerInventoryUnit || 0,
      };
    } else {
      normalized.variants[index] = {
        ...variant,
        allowFractionalSales: false,
        defaultSaleUnit: "unit",
        inventoryMode: "unit",
        inventoryUnit: "unit",
        measurementFamily: "count",
        minimumSaleQuantity: 1,
        purchasePackageCost: variant.purchaseCost,
        purchasePackageLabel: "Unidad",
        purchasePackageQuantity: 1,
        purchasePackageUnit: "unit",
        saleQuantityStep: 1,
      };
    }

    const normalizedSku = variant.sku.trim().toLowerCase();

    if (normalizedSku) {
      const previousIndex = seenSkus.get(normalizedSku);

      if (previousIndex !== undefined) {
        const message = "Ya existe un producto o variante con ese SKU en tu negocio.";
        fieldErrors[`${prefix}.sku`] = message;
        fieldErrors[`variants.${previousIndex}.sku`] ||= message;
      }

      seenSkus.set(normalizedSku, index);
    }
  }

  if (normalized.productType === "simple") {
    normalized.variants = [
      {
        ...normalized.variants[0],
        name: normalized.variants[0]?.name || "Presentación estándar",
      },
    ];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: Object.values(fieldErrors)[0] || "Revisa los datos del producto.",
      fieldErrors,
      ok: false,
    };
  }

  return { ok: true, value: normalized };
}

export function getSkuErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("product_variants_business_lower_sku_unique_idx") ||
    normalized.includes("duplicate key") ||
    normalized.includes("unique constraint")
  ) {
    return "Ya existe un producto o variante con ese SKU en tu negocio.";
  }

  return null;
}
