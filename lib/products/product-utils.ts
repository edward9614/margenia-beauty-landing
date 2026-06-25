export type ProductType = "simple" | "variants";
export type ProductStatus = "active" | "archived";

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
  status: ProductStatus;
};

export type ProductFormInput = {
  name: string;
  description: string;
  brand: string;
  category: string;
  unit: string;
  productType: ProductType;
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
> & {
  purchaseCost: number;
  packagingCost: number;
  commissionPercent: number;
  desiredMarginPercent: number;
  salePrice: number;
  currentStock: number;
  minimumStock: number;
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
    desiredMarginPercent: "35",
    minimumStock: "",
    name: "Presentación estándar",
    packagingCost: "",
    purchaseCost: "",
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

export function validateProductInput(input: ProductFormInput): ProductValidationResult {
  const productType: ProductType = input.productType === "variants" ? "variants" : "simple";
  const status: ProductStatus = input.status === "archived" ? "archived" : "active";
  const fieldErrors: ProductFieldErrors = {};

  const normalized: NormalizedProductFormInput = {
    brand: cleanOptionalText(input.brand).slice(0, 100),
    category: cleanOptionalText(input.category).slice(0, 100),
    description: cleanOptionalText(input.description).slice(0, 1000),
    name: cleanOptionalText(input.name).slice(0, 120),
    productType,
    status,
    trackInventory: Boolean(input.trackInventory),
    unit: cleanOptionalText(input.unit) || "Unidad",
    variants: input.variants.map((variant) => ({
      commissionPercent: parseNonNegativeNumber(variant.commissionPercent),
      currentStock: parseNonNegativeNumber(variant.currentStock),
      desiredMarginPercent: parseNonNegativeNumber(variant.desiredMarginPercent),
      id: variant.id,
      minimumStock: parseNonNegativeNumber(variant.minimumStock),
      name: cleanOptionalText(variant.name).slice(0, 100),
      packagingCost: parseNonNegativeNumber(variant.packagingCost),
      purchaseCost: parseNonNegativeNumber(variant.purchaseCost),
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

    if (!originalVariant?.purchaseCost) {
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
