export type ProductType = "simple" | "variants";
export type ProductStatus = "active" | "archived";

export type ProductVariantInput = {
  id?: string;
  name: string;
  sku: string;
  purchaseCost: number;
  packagingCost: number;
  commissionPercent: number;
  desiredMarginPercent: number;
  salePrice: number;
  currentStock: number;
  minimumStock: number;
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

export type ProductValidationResult =
  | { ok: true; value: ProductFormInput }
  | { ok: false; error: string };

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
    commissionPercent: 0,
    currentStock: 0,
    desiredMarginPercent: 35,
    minimumStock: 0,
    name: "Presentación estándar",
    packagingCost: 0,
    purchaseCost: 0,
    salePrice: 0,
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
  const parsed = typeof value === "number" ? value : Number(String(value || "").replace(/[^\d.-]/g, ""));

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

export function calculateVariantProfit({
  commissionPercent,
  desiredMarginPercent,
  packagingCost,
  purchaseCost,
  salePrice,
}: Pick<
  ProductVariantInput,
  | "commissionPercent"
  | "desiredMarginPercent"
  | "packagingCost"
  | "purchaseCost"
  | "salePrice"
>) {
  const totalUnitCost = purchaseCost + packagingCost;
  const denominator = 1 - commissionPercent / 100 - desiredMarginPercent / 100;
  const suggestedPrice = denominator > 0 ? totalUnitCost / denominator : 0;
  const estimatedCommission = salePrice * (commissionPercent / 100);
  const estimatedProfit = salePrice - totalUnitCost - estimatedCommission;
  const actualMargin = salePrice > 0 ? (estimatedProfit / salePrice) * 100 : 0;
  const invalidRate = commissionPercent + desiredMarginPercent >= 100;

  const state = invalidRate
    ? "invalid"
    : estimatedProfit <= 0
      ? "loss"
      : actualMargin >= desiredMarginPercent - 2
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

  const normalized: ProductFormInput = {
    brand: cleanOptionalText(input.brand).slice(0, 100),
    category: cleanOptionalText(input.category).slice(0, 100),
    description: cleanOptionalText(input.description).slice(0, 1000),
    name: cleanOptionalText(input.name).slice(0, 120),
    productType,
    status,
    trackInventory: Boolean(input.trackInventory),
    unit: cleanOptionalText(input.unit) || "Unidad",
    variants: input.variants.map((variant) => ({
      commissionPercent: toSafeNumber(variant.commissionPercent),
      currentStock: toSafeNumber(variant.currentStock),
      desiredMarginPercent: toSafeNumber(variant.desiredMarginPercent),
      id: variant.id,
      minimumStock: toSafeNumber(variant.minimumStock),
      name: cleanOptionalText(variant.name).slice(0, 100),
      packagingCost: toSafeNumber(variant.packagingCost),
      purchaseCost: toSafeNumber(variant.purchaseCost),
      salePrice: toSafeNumber(variant.salePrice),
      sku: cleanOptionalText(variant.sku).slice(0, 80),
      status: variant.status === "archived" ? "archived" : "active",
    })),
  };

  if (!normalized.name) {
    return { error: "Ingresa el nombre del producto.", ok: false };
  }

  if (!normalized.unit) {
    return { error: "Selecciona una unidad de medida.", ok: false };
  }

  if (normalized.variants.length < 1) {
    return { error: "Agrega al menos una variante.", ok: false };
  }

  for (const variant of normalized.variants) {
    if (!variant.name) {
      return { error: "Cada variante debe tener un nombre.", ok: false };
    }

    if (variant.commissionPercent >= 100 || variant.desiredMarginPercent >= 100) {
      return { error: "La comisión y el margen deben ser menores a 100%.", ok: false };
    }

    if (variant.commissionPercent + variant.desiredMarginPercent >= 100) {
      return {
        error: "La comisión y el margen deseado deben sumar menos de 100%.",
        ok: false,
      };
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
