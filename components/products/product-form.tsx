"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  archiveProduct,
  createProduct,
  restoreProduct,
  updateProduct,
} from "@/app/(dashboard)/app/productos/actions";
import { trackEvent } from "@/lib/analytics";
import {
  calculateMeasuredVariant,
  calculateVariantProfit,
  emptyVariant,
  moneyFormatter,
  parseNonNegativeNumber,
  ProductFormInput,
  ProductFieldErrors,
  ProductStatus,
  ProductType,
  ProductVariantInput,
  productUnits,
  sanitizeNumericInput,
  validateProductInput,
} from "@/lib/products/product-utils";
import {
  convertMeasurement,
  formatMeasuredQuantity,
  getMeasurementFamily,
  getUnitSymbol,
  measurementFamilies,
  unitsForFamily,
  type MeasurementFamily,
  type MeasurementUnit,
} from "@/lib/measurements";

type ProductFormProps = {
  currency?: string;
  initialProduct?: ProductFormInput & { id: string };
  mode: "create" | "edit";
};

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

const variantKinds = [
  { example: "S, M, L", label: "Talla", placeholder: "Ej. Talla M" },
  { example: "Negro, Azul, Rojo", label: "Color", placeholder: "Ej. Color Negro" },
  { example: "Nude, Rosa, Vino", label: "Tono", placeholder: "Ej. Tono Nude" },
  {
    example: "250 ml, 500 ml, 1 litro",
    label: "Presentación",
    placeholder: "Ej. 500 ml",
  },
  { example: "Algodón, Acero, Vidrio", label: "Material", placeholder: "Ej. Algodón" },
  { example: "Opción especial", label: "Otro", placeholder: "Ej. Opción especial" },
];

const labelClass = "block text-sm font-black text-[#0F172A]";

function Field({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-bold text-[#DC2626]">{error}</span>}
    </label>
  );
}

function NumberField({
  error,
  fieldKey,
  label,
  onChange,
  value,
}: {
  error?: string;
  fieldKey: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Field error={error} label={label}>
      <input
        data-field-key={fieldKey}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(sanitizeNumericInput(event.target.value))}
        onFocus={(event) => {
          if (event.currentTarget.value === "0") {
            event.currentTarget.select();
          }
        }}
        className={`${inputClass} ${error ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FECACA]/70" : ""}`}
      />
    </Field>
  );
}

function ProfitPreview({
  currency,
  onUseSuggestedPrice,
  variant,
}: {
  currency: string;
  onUseSuggestedPrice: () => void;
  variant: ProductVariantInput;
}) {
  const formatter = moneyFormatter(currency);
  const result = calculateVariantProfit(variant);
  const salePrice = parseNonNegativeNumber(variant.salePrice);
  const badge =
    result.state === "invalid"
      ? { className: "bg-[#FEE2E2] text-[#991B1B]", label: "Revisar margen" }
      : result.state === "loss"
        ? { className: "bg-[#FEE2E2] text-[#991B1B]", label: "Pérdida" }
        : result.state === "tight"
          ? { className: "bg-[#FEF3C7] text-[#92400E]", label: "Margen ajustado" }
          : { className: "bg-[#DCFCE7] text-[#166534]", label: "Rentable" };

  return (
    <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-black text-[#0F172A]">Rentabilidad</p>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {result.invalidRate && (
        <p className="mt-3 rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-3 text-xs font-bold text-[#991B1B]">
          La comisión y el margen deseado deben sumar menos de 100%.
        </p>
      )}

      <dl className="mt-4 grid gap-2 text-sm">
        {[
          ["Costo total", formatter.format(result.totalUnitCost)],
          ["Precio sugerido", formatter.format(result.suggestedPrice)],
          ["Precio elegido", formatter.format(salePrice)],
          ["Comisión estimada", formatter.format(result.estimatedCommission)],
          ["Ganancia por unidad", formatter.format(result.estimatedProfit)],
          ["Margen real", `${result.actualMargin.toFixed(1)}%`],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <dt className="text-[#475569]">{label}</dt>
            <dd className="text-right font-black text-[#0F172A]">{value}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={onUseSuggestedPrice}
        disabled={result.invalidRate}
        className="mt-4 w-full rounded-full bg-white px-4 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Usar precio sugerido
      </button>
    </div>
  );
}

function MeasuredPreview({
  currency,
  showAdvanced,
  variant,
}: {
  currency: string;
  showAdvanced: boolean;
  variant: ProductVariantInput;
}) {
  const [simulationQuantity, setSimulationQuantity] = useState("750");
  const [simulationUnit, setSimulationUnit] = useState<MeasurementUnit>("g");
  const formatter = moneyFormatter(currency);
  const measured = calculateMeasuredVariant(variant);
  const quantity = parseNonNegativeNumber(simulationQuantity);
  const compatibleUnits = unitsForFamily(
    getMeasurementFamily(variant.inventoryUnit) || "mass",
  );
  const selectedSimulationUnit = compatibleUnits.some(
    (unit) => unit.value === simulationUnit,
  )
    ? simulationUnit
    : (compatibleUnits[0]?.value as MeasurementUnit);
  const simulatedInInventoryUnit = convertMeasurement(
    quantity,
    selectedSimulationUnit,
    variant.inventoryUnit,
  );
  const saleUnitInInventoryUnit = measured?.saleUnitInInventoryUnit || 0;
  const salePrice = parseNonNegativeNumber(variant.salePrice);
  const totalEstimated =
    saleUnitInInventoryUnit > 0
      ? (simulatedInInventoryUnit / saleUnitInInventoryUnit) * salePrice
      : 0;
  const estimatedCost =
    measured && saleUnitInInventoryUnit > 0
      ? (simulatedInInventoryUnit / saleUnitInInventoryUnit) * measured.costPerSaleUnit
      : 0;
  const estimatedProfit =
    measured && saleUnitInInventoryUnit > 0
      ? (simulatedInInventoryUnit / saleUnitInInventoryUnit) * measured.estimatedProfit
      : 0;
  const stockAfter = Math.max(
    parseNonNegativeNumber(variant.currentStock) - simulatedInInventoryUnit,
    0,
  );
  if (!measured) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-[#BFDBFE] bg-[#EFF6FF] p-4">
      <div>
        <p className="font-black text-[#0F172A]">Resumen por medida</p>
        <p className="mt-1 text-xs font-bold text-[#475569]">
          Estimación antes de otros gastos del negocio.
        </p>
      </div>

      <dl className="grid gap-2 text-sm">
        {[
          [
            "Compra",
            `1 ${variant.purchasePackageLabel || "presentación"} de ${formatMeasuredQuantity(
              parseNonNegativeNumber(variant.purchasePackageQuantity),
              variant.purchasePackageUnit,
            )} por ${formatter.format(parseNonNegativeNumber(variant.purchasePackageCost))}`,
          ],
          [
            "Costo real",
            `${formatter.format(measured.costPerSaleUnit)} por ${getUnitSymbol(
              variant.defaultSaleUnit,
            )}`,
          ],
          [
            "Venta",
            `${formatter.format(salePrice)} por ${getUnitSymbol(variant.defaultSaleUnit)}`,
          ],
          ["Ganancia bruta estimada", formatter.format(measured.estimatedProfit)],
          [
            "Existencia inicial",
            formatMeasuredQuantity(measured.initialStock, variant.inventoryUnit),
          ],
          ["Margen bruto estimado", `${measured.actualMargin.toFixed(2)}%`],
          ...(showAdvanced
            ? [
                ["Ingreso potencial", formatter.format(measured.potentialRevenue)],
                ["Utilidad potencial", formatter.format(measured.potentialProfit)],
              ]
            : []),
        ].map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <dt className="text-[#475569]">{label}</dt>
            <dd className="text-right font-black text-[#0F172A]">{value}</dd>
          </div>
        ))}
      </dl>

      {showAdvanced && (
      <div className="rounded-[1.25rem] border border-[#E2E8F0] bg-white p-3">
        <p className="font-black text-[#0F172A]">Simula una venta</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            inputMode="decimal"
            value={simulationQuantity}
            onChange={(event) => setSimulationQuantity(sanitizeNumericInput(event.target.value))}
            className={inputClass}
          />
          <select
            value={selectedSimulationUnit}
            onChange={(event) => setSimulationUnit(event.target.value as MeasurementUnit)}
            className={inputClass}
          >
            {compatibleUnits.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
        <dl className="mt-3 grid gap-2 text-xs">
          {[
            [
              "Equivale a",
              formatMeasuredQuantity(simulatedInInventoryUnit, variant.inventoryUnit),
            ],
            ["Total estimado", formatter.format(totalEstimated)],
            ["Costo estimado", formatter.format(estimatedCost)],
            ["Utilidad estimada", formatter.format(estimatedProfit)],
            ["Stock después", formatMeasuredQuantity(stockAfter, variant.inventoryUnit)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-[#475569]">{label}</dt>
              <dd className="font-black text-[#0F172A]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      )}
    </div>
  );
}

export function ProductForm({
  currency = "COP",
  initialProduct,
  mode,
}: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [advancedOpen, setAdvancedOpen] = useState(() =>
    Boolean(
      initialProduct &&
        (initialProduct.description ||
          initialProduct.brand ||
          initialProduct.variants.some(
            (variant) =>
              variant.sku ||
              variant.packagingCost !== "0" ||
              variant.commissionPercent !== "0" ||
              variant.minimumStock !== "0" ||
              variant.status !== "active" ||
              variant.allowFractionalSales ||
              variant.minimumSaleQuantity !== "1" ||
              variant.saleQuantityStep !== "1",
          )),
    ),
  );
  const [showSuggestedPrice, setShowSuggestedPrice] = useState(false);
  const [useExactMeasuredStock, setUseExactMeasuredStock] = useState(mode === "edit");
  const [variantKind, setVariantKind] = useState("Talla");
  const [openVariantOptions, setOpenVariantOptions] = useState<Record<string, boolean>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkValues, setBulkValues] = useState({
    applyCost: false,
    applyPrice: false,
    applyStock: false,
    cost: "",
    price: "",
    stock: "",
  });
  const [product, setProduct] = useState<ProductFormInput>(
    initialProduct || {
      brand: "",
      category: "",
      description: "",
      inventoryMode: "unit",
      name: "",
      productType: "simple",
      status: "active",
      trackInventory: true,
      unit: "Unidad",
      variants: [emptyVariant()],
    },
  );
  const formatter = useMemo(() => moneyFormatter(currency), [currency]);

  useEffect(() => {
    if (mode === "create") {
      trackEvent("product_create_start", { source: "product_form" });
    }
  }, [mode]);

  function updateProductField<K extends keyof ProductFormInput>(
    key: K,
    value: ProductFormInput[K],
  ) {
    clearFieldError(String(key));
    setProduct((current) => ({ ...current, [key]: value }));
  }

  function clearFieldError(key: string) {
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function focusFirstInvalidField(errors: ProductFieldErrors) {
    const firstKey = Object.keys(errors)[0];

    if (!firstKey) {
      return;
    }

    requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(`[data-field-key="${firstKey}"]`);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus();
    });
  }

  function updateVariant(
    index: number,
    updater: (variant: ProductVariantInput) => ProductVariantInput,
  ) {
    setProduct((current) => ({
      ...current,
      variants: current.variants.map((variant, currentIndex) =>
        currentIndex === index ? updater(variant) : variant,
      ),
    }));
  }

  function measuredDefaults(variant: ProductVariantInput): ProductVariantInput {
    return {
      ...variant,
      allowFractionalSales: true,
      defaultSaleUnit: variant.defaultSaleUnit === "unit" ? "kg" : variant.defaultSaleUnit,
      inventoryMode: "measured",
      inventoryUnit: variant.inventoryUnit === "unit" ? "kg" : variant.inventoryUnit,
      measurementFamily:
        variant.measurementFamily === "count" ? "mass" : variant.measurementFamily,
      minimumSaleQuantity:
        variant.minimumSaleQuantity === "1" ? "0.1" : variant.minimumSaleQuantity,
      purchasePackageLabel:
        variant.purchasePackageLabel === "Unidad" ? "Bulto" : variant.purchasePackageLabel,
      purchasePackageQuantity:
        variant.purchasePackageQuantity === "1" ? "22" : variant.purchasePackageQuantity,
      purchasePackageUnit:
        variant.purchasePackageUnit === "unit" ? "kg" : variant.purchasePackageUnit,
      saleQuantityStep: variant.saleQuantityStep === "1" ? "0.05" : variant.saleQuantityStep,
    };
  }

  function unitDefaults(variant: ProductVariantInput): ProductVariantInput {
    return {
      ...variant,
      allowFractionalSales: false,
      defaultSaleUnit: "unit",
      inventoryMode: "unit",
      inventoryUnit: "unit",
      measurementFamily: "count",
      minimumSaleQuantity: "1",
      packageCount: "1",
      purchasePackageCost: variant.purchaseCost,
      purchasePackageLabel: "Unidad",
      purchasePackageQuantity: "1",
      purchasePackageUnit: "unit",
      saleQuantityStep: "1",
    };
  }

  function blankVariant(overrides: Partial<ProductVariantInput> = {}): ProductVariantInput {
    return {
      ...unitDefaults(emptyVariant()),
      currentStock: "",
      name: "",
      purchaseCost: "",
      salePrice: "",
      sku: "",
      ...overrides,
    };
  }

  function focusVariantName(index: number) {
    requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(
        `[data-field-key="variants.${index}.name"]`,
      );
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus();
    });
  }

  function updateInventoryMode(mode: ProductFormInput["inventoryMode"]) {
    setProduct((current) => ({
      ...current,
      inventoryMode: mode,
      variants: current.variants.map((variant) =>
        mode === "measured" ? measuredDefaults(variant) : unitDefaults(variant),
      ),
    }));
  }

  function selectSellingMode(mode: "measured" | "unit" | "variants") {
    if (mode === "variants") {
      setProduct((current) => {
        const shouldPreserveVariants =
          current.productType === "variants" && current.variants.length > 0;

        return {
          ...current,
          inventoryMode: "unit",
          productType: "variants",
          variants: shouldPreserveVariants ? current.variants : [blankVariant()],
        };
      });
    } else {
      updateProductField("productType", "simple");
      updateInventoryMode(mode);
    }

    trackEvent("product_form_mode_selected", { mode });
  }

  function toggleAdvanced() {
    setAdvancedOpen((current) => {
      const next = !current;

      if (next) {
        trackEvent("product_form_advanced_opened");
      }

      return next;
    });
  }

  function variantWithInitialStock(variant: ProductVariantInput) {
    if (mode !== "create" || variant.inventoryMode !== "measured") {
      return variant;
    }

    const measured = calculateMeasuredVariant(variant);

    return {
      ...variant,
      currentStock: measured ? String(Number(measured.initialStock.toFixed(6))) : "",
    };
  }

  function updateMeasuredVariant(
    index: number,
    updater: (variant: ProductVariantInput) => ProductVariantInput,
  ) {
    updateVariant(index, (current) => variantWithInitialStock(updater(current)));
  }

  function addVariant() {
    setProduct((current) => ({
      ...current,
      productType: "variants",
      variants: [
        ...current.variants,
        blankVariant(),
      ],
    }));
    focusVariantName(product.variants.length);
    trackEvent("product_variant_added");
  }

  function duplicateVariant(index: number) {
    setProduct((current) => ({
      ...current,
      productType: "variants",
      variants: [
        ...current.variants,
        {
          ...current.variants[index],
          id: undefined,
          name: "",
          sku: "",
        },
      ],
    }));
    focusVariantName(product.variants.length);
    trackEvent("product_variant_added");
  }

  function removeVariant(index: number) {
    const variant = product.variants[index];

    if (variant?.id && !confirm("Esta variante ya existe. ¿Quieres retirarla?")) {
      return;
    }

    setProduct((current) => {
      if (current.variants.length <= 1) {
        return current;
      }

      return {
        ...current,
        variants: current.variants.filter((_, currentIndex) => currentIndex !== index),
      };
    });
  }

  function toggleVariantOptions(index: number) {
    setOpenVariantOptions((current) => ({
      ...current,
      [index]: !current[index],
    }));
  }

  function applyBulkValues() {
    if (
      !bulkValues.applyCost &&
      !bulkValues.applyPrice &&
      !bulkValues.applyStock
    ) {
      return;
    }

    if (!confirm("¿Quieres aplicar estos valores a todas las variantes?")) {
      return;
    }

    setProduct((current) => ({
      ...current,
      variants: current.variants.map((variant) => ({
        ...variant,
        currentStock: bulkValues.applyStock ? bulkValues.stock : variant.currentStock,
        purchaseCost: bulkValues.applyCost ? bulkValues.cost : variant.purchaseCost,
        salePrice: bulkValues.applyPrice ? bulkValues.price : variant.salePrice,
      })),
    }));
  }

  function validateBeforeNextStep() {
    if (currentStep !== 2) {
      nextStep();
      return;
    }

    const validation = validateProductInput(product);

    if (!validation.ok) {
      setError(validation.error);
      setFieldErrors(validation.fieldErrors);
      focusFirstInvalidField(validation.fieldErrors);
      return;
    }

    setError("");
    setFieldErrors({});
    nextStep();
  }

  function submit() {
    setError("");
    setFieldErrors({});
    const validation = validateProductInput(product);

    if (!validation.ok) {
      setError(validation.error);
      setFieldErrors(validation.fieldErrors);
      focusFirstInvalidField(validation.fieldErrors);
      return;
    }

    startTransition(async () => {
      trackEvent(mode === "create" ? "product_created" : "product_updated", {
        product_type: validation.value.productType,
        variant_count: validation.value.variants.length,
      });

      const result =
        mode === "create"
          ? await createProduct(product)
          : await updateProduct(initialProduct?.id || "", product);

      if (result && !result.ok) {
        setError(result.error || "No pudimos guardar el producto.");
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          focusFirstInvalidField(result.fieldErrors);
        }
      }
    });
  }

  function archive() {
    if (!initialProduct || !confirm("¿Quieres archivar este producto?")) {
      return;
    }

    startTransition(async () => {
      trackEvent("product_archived", {
        product_type: initialProduct.productType,
        variant_count: initialProduct.variants.length,
      });
      const result = await archiveProduct(initialProduct.id);

      if (result && !result.ok) {
        setError(result.error || "No pudimos archivar el producto.");
      }
    });
  }

  function restore() {
    if (!initialProduct) {
      return;
    }

    startTransition(async () => {
      trackEvent("product_restored", {
        product_type: initialProduct.productType,
        variant_count: initialProduct.variants.length,
      });
      const result = await restoreProduct(initialProduct.id);

      if (result && !result.ok) {
        setError(result.error || "No pudimos reactivar el producto.");
      }
    });
  }

  const primaryVariant = product.variants[0] || emptyVariant();
  const primaryMeasured = calculateMeasuredVariant(primaryVariant);
  const canGoBack = currentStep > 1;
  const stepLabel =
    currentStep === 1
      ? "Información básica"
      : currentStep === 2
        ? "Cómo compras y vendes"
        : "Revisar y guardar";
  const sellingModeLabel =
    product.productType === "variants"
      ? "Con variantes"
      : product.inventoryMode === "measured"
        ? "Por peso, volumen o longitud"
        : "Por unidad";
  const selectedVariantKind =
    variantKinds.find((kind) => kind.label === variantKind) || variantKinds[0];
  const activeVariants = product.variants.filter((variant) => variant.status !== "archived");
  const variantPrices = activeVariants
    .map((variant) => parseNonNegativeNumber(variant.salePrice))
    .filter((price) => price > 0);
  const variantCosts = activeVariants
    .map((variant) => parseNonNegativeNumber(variant.purchaseCost))
    .filter((cost) => cost > 0);
  const variantStocks = activeVariants.map((variant) =>
    parseNonNegativeNumber(variant.currentStock),
  );
  const variantMargins = activeVariants
    .map((variant) => calculateVariantProfit(variant).actualMargin)
    .filter((margin) => Number.isFinite(margin));
  const hasIncompleteVariants = activeVariants.some(
    (variant) =>
      !variant.name.trim() ||
      !variant.purchaseCost ||
      parseNonNegativeNumber(variant.salePrice) <= 0,
  );
  const hasLossVariants = activeVariants.some(
    (variant) => calculateVariantProfit(variant).state === "loss",
  );
  const variantStatusLabel = hasIncompleteVariants
    ? "Faltan datos"
    : hasLossVariants
      ? "Contiene variantes con pérdida"
      : "Completo";
  const priceRangeLabel =
    variantPrices.length === 0
      ? "Completa los precios"
      : Math.min(...variantPrices) === Math.max(...variantPrices)
        ? formatter.format(Math.min(...variantPrices))
        : `${formatter.format(Math.min(...variantPrices))} – ${formatter.format(
            Math.max(...variantPrices),
          )}`;
  const marginRangeLabel =
    variantMargins.length === 0
      ? "Sin margen calculado"
      : Math.min(...variantMargins) === Math.max(...variantMargins)
        ? `${Math.min(...variantMargins).toFixed(1)}%`
        : `Entre ${Math.min(...variantMargins).toFixed(1)}% y ${Math.max(
            ...variantMargins,
          ).toFixed(1)}%`;

  function nextStep() {
    setCurrentStep((step) => Math.min(step + 1, 3));
  }

  function previousStep() {
    setCurrentStep((step) => Math.max(step - 1, 1));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Paso {currentStep} de 3
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#0F172A]">{stepLabel}</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(step)}
                className={`h-2 rounded-full transition ${
                  currentStep >= step ? "bg-[#2563EB]" : "bg-[#E2E8F0]"
                }`}
                aria-label={`Ir al paso ${step}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={toggleAdvanced}
            className="mt-5 rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-white"
          >
            {advancedOpen ? "Ocultar opciones avanzadas" : "Opciones avanzadas"}
          </button>
          {advancedOpen && (
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-[#475569]">
              Aquí están los datos técnicos como marca, SKU, estado, comisiones,
              stock mínimo y configuración detallada. Se guardan igual, pero no
              estorban el registro rápido.
            </p>
          )}
        </section>

        <section
          className={`rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 ${
            currentStep === 1 ? "block" : "hidden"
          }`}
        >
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Información general
          </p>
          <div className="mt-5 grid gap-4">
            <Field error={fieldErrors.name} label="Nombre del producto">
              <input
                data-field-key="name"
                value={product.name}
                onChange={(event) => updateProductField("name", event.target.value)}
                maxLength={120}
                className={`${inputClass} ${fieldErrors.name ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FECACA]/70" : ""}`}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoría">
                <input
                  value={product.category}
                  onChange={(event) =>
                    updateProductField("category", event.target.value)
                  }
                  maxLength={100}
                  className={inputClass}
                />
              </Field>
            </div>

            {advancedOpen && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Descripción">
                  <textarea
                    value={product.description}
                    onChange={(event) =>
                      updateProductField("description", event.target.value)
                    }
                    maxLength={1000}
                    rows={4}
                    className={inputClass}
                  />
                </Field>
                <Field label="Marca">
                  <input
                    value={product.brand}
                    onChange={(event) => updateProductField("brand", event.target.value)}
                    maxLength={100}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}

            {advancedOpen && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field error={fieldErrors.unit} label="Unidad de medida">
                  <select
                    data-field-key="unit"
                    value={product.unit}
                    onChange={(event) => updateProductField("unit", event.target.value)}
                    className={`${inputClass} ${fieldErrors.unit ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FECACA]/70" : ""}`}
                  >
                    {productUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Controlar inventario">
                  <select
                    value={product.trackInventory ? "yes" : "no"}
                    onChange={(event) =>
                      updateProductField("trackInventory", event.target.value === "yes")
                    }
                    className={inputClass}
                  >
                    <option value="yes">Sí</option>
                    <option value="no">No</option>
                  </select>
                </Field>
                <Field label="Estado">
                  <select
                    value={product.status}
                    onChange={(event) =>
                      updateProductField("status", event.target.value as ProductStatus)
                    }
                    className={inputClass}
                  >
                    <option value="active">Activo</option>
                    <option value="archived">Archivado</option>
                  </select>
                </Field>
              </div>
            )}

            <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <p className="text-sm font-black text-[#0F172A]">
                ¿Cómo vendes este producto?
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    examples: "Camiseta, cuaderno, botella.",
                    label: "Por unidad",
                    text: "Para productos que se venden como piezas completas.",
                    value: "unit",
                  },
                  {
                    examples: "Alimento a granel, tela, líquidos.",
                    label: "Por peso, volumen o longitud",
                    text: "Para productos que se venden por kg, gramos, litros o metros.",
                    value: "measured",
                  },
                  {
                    examples: "Camiseta S/M/L, labial por tono.",
                    label: "Con variantes",
                    text: "Para productos con tallas, colores, tonos o presentaciones.",
                    value: "variants",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectSellingMode(option.value as "measured" | "unit" | "variants")}
                    className={`rounded-[1.25rem] border p-4 text-left transition ${
                      (option.value === "variants"
                        ? product.productType === "variants"
                        : product.inventoryMode === option.value && product.productType !== "variants")
                        ? "border-[#2563EB] bg-white shadow-sm ring-4 ring-[#BFDBFE]/70"
                        : "border-[#E2E8F0] bg-white hover:border-[#BFDBFE]"
                    }`}
                  >
                    <span className="block text-sm font-black text-[#0F172A]">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs font-bold leading-5 text-[#475569]">
                      {option.text}
                    </span>
                    <span className="mt-2 block text-xs font-black text-[#2563EB]">
                      {option.examples}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className={`rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 ${
            currentStep === 2 ? "block" : "hidden"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
                Tipo de producto
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#0F172A]">
                Precios, costos y existencias
              </h2>
            </div>
            <span className="w-fit rounded-full bg-[#EFF6FF] px-3 py-1.5 text-xs font-black text-[#2563EB] ring-1 ring-[#BFDBFE]">
              {product.variants.length} variante{product.variants.length === 1 ? "" : "s"}
            </span>
          </div>

          {advancedOpen && (
            <div className="mt-5 grid grid-cols-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] p-1">
              {[
                ["simple", "Producto simple"],
                ["variants", "Producto con variantes"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    updateProductField("productType", value as ProductType)
                  }
                  className={`rounded-full px-4 py-3 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-[#BFDBFE]/70 ${
                    product.productType === value
                      ? "bg-white text-[#2563EB] shadow-sm ring-1 ring-[#BFDBFE]"
                      : "text-[#475569]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {product.productType === "variants" ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-[1.75rem] border border-[#BFDBFE] bg-[#EFF6FF]/70 p-5">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
                  Producto con variantes
                </p>
                <h3 className="mt-2 text-2xl font-black text-[#0F172A]">
                  Agrega las variantes
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-[#475569]">
                  Crea una opción para cada talla, color, tono o presentación que vendas.
                </p>
                <div className="mt-5">
                  <p className="text-sm font-black text-[#0F172A]">
                    ¿Qué cambia entre las variantes?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {variantKinds.map((kind) => (
                      <button
                        key={kind.label}
                        type="button"
                        onClick={() => setVariantKind(kind.label)}
                        className={`rounded-full px-4 py-2 text-sm font-black transition ${
                          variantKind === kind.label
                            ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/20"
                            : "bg-white text-[#2563EB] ring-1 ring-[#BFDBFE] hover:bg-[#EFF6FF]"
                        }`}
                      >
                        {kind.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-bold text-[#475569]">
                    Ejemplos: {selectedVariantKind.example}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => setBulkOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={bulkOpen}
                  aria-controls="bulk-variant-values"
                >
                  <span>
                    <span className="block text-sm font-black text-[#0F172A]">
                      Aplicar valores a todas
                    </span>
                    <span className="mt-1 block text-xs font-bold text-[#475569]">
                      Úsalo cuando varias variantes compartan el mismo costo o precio.
                    </span>
                  </span>
                  <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-black text-[#2563EB]">
                    {bulkOpen ? "Cerrar" : "Abrir"}
                  </span>
                </button>
                {bulkOpen && (
                  <div
                    id="bulk-variant-values"
                    className="mt-4 grid gap-4 rounded-[1.25rem] bg-[#F8FAFC] p-4 sm:grid-cols-3"
                  >
                    {[
                      {
                        checked: bulkValues.applyCost,
                        field: "cost",
                        label: "Costo",
                        toggle: "applyCost",
                        value: bulkValues.cost,
                      },
                      {
                        checked: bulkValues.applyPrice,
                        field: "price",
                        label: "Precio",
                        toggle: "applyPrice",
                        value: bulkValues.price,
                      },
                      {
                        checked: bulkValues.applyStock,
                        field: "stock",
                        label: "Existencia inicial",
                        toggle: "applyStock",
                        value: bulkValues.stock,
                      },
                    ].map((item) => (
                      <div key={item.field}>
                        <label className="flex items-center gap-2 text-xs font-black text-[#0F172A]">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(event) =>
                              setBulkValues((current) => ({
                                ...current,
                                [item.toggle]: event.target.checked,
                              }))
                            }
                          />
                          Aplicar {item.label.toLowerCase()} a todas
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.value}
                          onChange={(event) =>
                            setBulkValues((current) => ({
                              ...current,
                              [item.field]: sanitizeNumericInput(event.target.value),
                            }))
                          }
                          className={inputClass}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={applyBulkValues}
                      className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1D4ED8] sm:col-span-3"
                    >
                      Aplicar valores seleccionados
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {product.variants.map((variant, index) => {
                  const profit = calculateVariantProfit(variant);
                  const variantKey = variant.id || String(index);
                  const isOptionsOpen = Boolean(openVariantOptions[index]);
                  const badge =
                    !variant.name.trim() ||
                    !variant.purchaseCost ||
                    parseNonNegativeNumber(variant.salePrice) <= 0
                      ? {
                          className: "bg-[#FEF3C7] text-[#92400E]",
                          label: "Incompleta",
                        }
                      : profit.state === "loss"
                        ? {
                            className: "bg-[#FEE2E2] text-[#991B1B]",
                            label: "Pérdida",
                          }
                        : profit.state === "tight"
                          ? {
                              className: "bg-[#FEF3C7] text-[#92400E]",
                              label: "Margen ajustado",
                            }
                          : {
                              className: "bg-[#DCFCE7] text-[#166534]",
                              label: "Rentable",
                            };

                  return (
                    <div
                      key={variantKey}
                      className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4 shadow-sm"
                    >
                      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-start">
                        <Field label="Nombre de variante">
                          <input
                            data-field-key={`variants.${index}.name`}
                            value={variant.name}
                            onChange={(event) =>
                              updateVariant(index, (current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            maxLength={100}
                            placeholder={selectedVariantKind.placeholder}
                            className={`${inputClass} ${fieldErrors[`variants.${index}.name`] ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FECACA]/70" : ""}`}
                          />
                          {fieldErrors[`variants.${index}.name`] && (
                            <span className="mt-1 block text-xs font-bold text-[#DC2626]">
                              {fieldErrors[`variants.${index}.name`]}
                            </span>
                          )}
                        </Field>
                        <NumberField
                          error={fieldErrors[`variants.${index}.purchaseCost`]}
                          fieldKey={`variants.${index}.purchaseCost`}
                          label="Costo"
                          value={variant.purchaseCost}
                          onChange={(value) =>
                            updateVariant(index, (current) => ({
                              ...current,
                              purchaseCost: value,
                            }))
                          }
                        />
                        <NumberField
                          error={fieldErrors[`variants.${index}.salePrice`]}
                          fieldKey={`variants.${index}.salePrice`}
                          label="Precio"
                          value={variant.salePrice}
                          onChange={(value) =>
                            updateVariant(index, (current) => ({
                              ...current,
                              salePrice: value,
                            }))
                          }
                        />
                        <NumberField
                          error={fieldErrors[`variants.${index}.currentStock`]}
                          fieldKey={`variants.${index}.currentStock`}
                          label="Existencia"
                          value={variant.currentStock}
                          onChange={(value) =>
                            updateVariant(index, (current) => ({
                              ...current,
                              currentStock: value,
                            }))
                          }
                        />
                        <div className="flex flex-wrap gap-2 lg:pt-8">
                          <span
                            className={`rounded-full px-3 py-2 text-xs font-black ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => duplicateVariant(index)}
                            className="rounded-full bg-[#EFF6FF] px-3 py-2 text-xs font-black text-[#2563EB]"
                          >
                            Duplicar
                          </button>
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            disabled={product.variants.length <= 1}
                            className="rounded-full bg-[#FEE2E2] px-3 py-2 text-xs font-black text-[#991B1B] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleVariantOptions(index)}
                        className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF]"
                        aria-expanded={isOptionsOpen}
                        aria-controls={`variant-options-${index}`}
                      >
                        {isOptionsOpen ? "Ocultar más opciones" : "Más opciones"}
                      </button>

                      {isOptionsOpen && (
                        <div
                          id={`variant-options-${index}`}
                          className="mt-4 grid gap-4 rounded-[1.25rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-2"
                        >
                          <Field error={fieldErrors[`variants.${index}.sku`]} label="SKU">
                            <input
                              data-field-key={`variants.${index}.sku`}
                              value={variant.sku}
                              onChange={(event) =>
                                updateVariant(index, (current) => ({
                                  ...current,
                                  sku: event.target.value,
                                }))
                              }
                              maxLength={80}
                              className={`${inputClass} ${fieldErrors[`variants.${index}.sku`] ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FECACA]/70" : ""}`}
                            />
                          </Field>
                          <NumberField
                            error={fieldErrors[`variants.${index}.packagingCost`]}
                            fieldKey={`variants.${index}.packagingCost`}
                            label="Costo de empaque"
                            value={variant.packagingCost}
                            onChange={(value) =>
                              updateVariant(index, (current) => ({
                                ...current,
                                packagingCost: value,
                              }))
                            }
                          />
                          <NumberField
                            error={fieldErrors[`variants.${index}.commissionPercent`]}
                            fieldKey={`variants.${index}.commissionPercent`}
                            label="Comisión de pago %"
                            value={variant.commissionPercent}
                            onChange={(value) =>
                              updateVariant(index, (current) => ({
                                ...current,
                                commissionPercent: value,
                              }))
                            }
                          />
                          <NumberField
                            error={fieldErrors[`variants.${index}.desiredMarginPercent`]}
                            fieldKey={`variants.${index}.desiredMarginPercent`}
                            label="Margen deseado %"
                            value={variant.desiredMarginPercent}
                            onChange={(value) =>
                              updateVariant(index, (current) => ({
                                ...current,
                                desiredMarginPercent: value,
                              }))
                            }
                          />
                          <NumberField
                            error={fieldErrors[`variants.${index}.minimumStock`]}
                            fieldKey={`variants.${index}.minimumStock`}
                            label="Stock mínimo"
                            value={variant.minimumStock}
                            onChange={(value) =>
                              updateVariant(index, (current) => ({
                                ...current,
                                minimumStock: value,
                              }))
                            }
                          />
                          <Field label="Estado">
                            <select
                              value={variant.status}
                              onChange={(event) =>
                                updateVariant(index, (current) => ({
                                  ...current,
                                  status: event.target.value as ProductStatus,
                                }))
                              }
                              className={inputClass}
                            >
                              <option value="active">Activa</option>
                              <option value="archived">Archivada</option>
                            </select>
                          </Field>

                          <div className="rounded-[1.25rem] bg-white p-4 sm:col-span-2">
                            <dl className="grid gap-2 text-sm sm:grid-cols-2">
                              {[
                                ["Costo total", formatter.format(profit.totalUnitCost)],
                                ["Precio sugerido", formatter.format(profit.suggestedPrice)],
                                ["Ganancia estimada", formatter.format(profit.estimatedProfit)],
                                ["Margen real", `${profit.actualMargin.toFixed(1)}%`],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  className="flex justify-between gap-3 rounded-2xl bg-[#F8FAFC] p-3"
                                >
                                  <dt className="text-[#475569]">{label}</dt>
                                  <dd className="font-black text-[#0F172A]">{value}</dd>
                                </div>
                              ))}
                            </dl>
                            <button
                              type="button"
                              onClick={() => {
                                updateVariant(index, (current) => ({
                                  ...current,
                                  salePrice: String(Math.ceil(profit.suggestedPrice)),
                                }));
                                clearFieldError(`variants.${index}.salePrice`);
                                trackEvent("product_price_suggestion_used", {
                                  product_type: product.productType,
                                });
                              }}
                              className="mt-4 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1D4ED8]"
                            >
                              Usar precio sugerido
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addVariant}
                className="rounded-full bg-[#EFF6FF] px-5 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-white"
              >
                + Agregar variante
              </button>
            </div>
          ) : (
          <div className="mt-6 space-y-5">
            {product.variants.map((variant, index) => (
              <div
                key={variant.id || index}
                className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-black text-[#0F172A]">
                    {product.productType === "simple"
                      ? "Presentación estándar"
                      : `Variante ${index + 1}`}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.productType === "variants" && (
                      <>
                        <button
                          type="button"
                          onClick={() => duplicateVariant(index)}
                          className="rounded-full bg-[#EFF6FF] px-3 py-2 text-xs font-black text-[#2563EB]"
                        >
                          Duplicar
                        </button>
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          disabled={product.variants.length <= 1}
                          className="rounded-full bg-[#FEE2E2] px-3 py-2 text-xs font-black text-[#991B1B] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Quitar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {product.productType === "variants" && (
                      <Field label="Nombre de variante">
                        <input
                          data-field-key={`variants.${index}.name`}
                          value={variant.name}
                          onChange={(event) =>
                            updateVariant(index, (current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          maxLength={100}
                          className={`${inputClass} ${fieldErrors[`variants.${index}.name`] ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FECACA]/70" : ""}`}
                        />
                        {fieldErrors[`variants.${index}.name`] && (
                          <span className="mt-1 block text-xs font-bold text-[#DC2626]">
                            {fieldErrors[`variants.${index}.name`]}
                          </span>
                        )}
                      </Field>
                    )}
                    {advancedOpen && (
                      <Field error={fieldErrors[`variants.${index}.sku`]} label="SKU">
                        <input
                          data-field-key={`variants.${index}.sku`}
                          value={variant.sku}
                          onChange={(event) =>
                            updateVariant(index, (current) => ({
                              ...current,
                              sku: event.target.value,
                            }))
                          }
                          maxLength={80}
                          className={`${inputClass} ${fieldErrors[`variants.${index}.sku`] ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FECACA]/70" : ""}`}
                        />
                      </Field>
                    )}
                    {product.inventoryMode === "measured" ? (
                      <div className="space-y-4 rounded-[1.25rem] border border-[#BFDBFE] bg-[#EFF6FF]/70 p-4 sm:col-span-2">
                        {advancedOpen && (
                          <>
                            <div>
                              <p className="text-sm font-black uppercase tracking-[0.12em] text-[#2563EB]">
                                Unidad de inventario
                              </p>
                              <p className="mt-1 text-xs font-bold text-[#475569]">
                                Margenia guardará todas las existencias usando esta unidad.
                              </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field
                                error={fieldErrors[`variants.${index}.measurementFamily`]}
                                label="¿Qué estás controlando?"
                              >
                                <select
                                  data-field-key={`variants.${index}.measurementFamily`}
                                  value={variant.measurementFamily}
                                  onChange={(event) => {
                                    const family = event.target.value as MeasurementFamily;
                                    const firstUnit = unitsForFamily(family)[0]?.value as MeasurementUnit;
                                    updateMeasuredVariant(index, (current) => ({
                                      ...current,
                                      defaultSaleUnit: firstUnit,
                                      inventoryUnit: firstUnit,
                                      measurementFamily: family,
                                      purchasePackageUnit: firstUnit,
                                    }));
                                  }}
                                  className={inputClass}
                                >
                                  {measurementFamilies.map((family) => (
                                    <option key={family.value} value={family.value}>
                                      {family.label}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Field
                                error={fieldErrors[`variants.${index}.inventoryUnit`]}
                                label="Unidad principal del inventario"
                              >
                                <select
                                  data-field-key={`variants.${index}.inventoryUnit`}
                                  value={variant.inventoryUnit}
                                  onChange={(event) =>
                                    updateMeasuredVariant(index, (current) => ({
                                      ...current,
                                      inventoryUnit: event.target.value as MeasurementUnit,
                                    }))
                                  }
                                  className={inputClass}
                                >
                                  {unitsForFamily(variant.measurementFamily).map((unit) => (
                                    <option key={unit.value} value={unit.value}>
                                      {unit.label}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                            </div>
                          </>
                        )}

                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#2563EB]">
                            ¿Cómo lo compras?
                          </p>
                          <p className="mt-1 text-xs font-bold text-[#475569]">
                            Compras 1 {variant.purchasePackageLabel || "bulto"} de{" "}
                            {variant.purchasePackageQuantity || "22"}{" "}
                            {getUnitSymbol(variant.purchasePackageUnit)} por{" "}
                            {formatter.format(
                              parseNonNegativeNumber(variant.purchasePackageCost),
                            )}
                            .
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Nombre de la presentación">
                            <input
                              value={variant.purchasePackageLabel}
                              onChange={(event) =>
                                updateMeasuredVariant(index, (current) => ({
                                  ...current,
                                  purchasePackageLabel: event.target.value,
                                }))
                              }
                              className={inputClass}
                              placeholder="Bulto"
                            />
                          </Field>
                          <NumberField
                            error={fieldErrors[`variants.${index}.purchasePackageQuantity`]}
                            fieldKey={`variants.${index}.purchasePackageQuantity`}
                            label="Cantidad contenida"
                            value={variant.purchasePackageQuantity}
                            onChange={(value) =>
                              updateMeasuredVariant(index, (current) => ({
                                ...current,
                                purchasePackageQuantity: value,
                              }))
                            }
                          />
                          <Field
                            error={fieldErrors[`variants.${index}.purchasePackageUnit`]}
                            label="Unidad del contenido"
                          >
                            <select
                              data-field-key={`variants.${index}.purchasePackageUnit`}
                              value={variant.purchasePackageUnit}
                              onChange={(event) =>
                                updateMeasuredVariant(index, (current) => ({
                                  ...current,
                                  purchasePackageUnit: event.target.value as MeasurementUnit,
                                }))
                              }
                              className={inputClass}
                            >
                              {unitsForFamily(variant.measurementFamily).map((unit) => (
                                <option key={unit.value} value={unit.value}>
                                  {unit.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <NumberField
                            error={fieldErrors[`variants.${index}.purchasePackageCost`]}
                            fieldKey={`variants.${index}.purchasePackageCost`}
                            label="Costo total de la presentación"
                            value={variant.purchasePackageCost}
                            onChange={(value) =>
                              updateMeasuredVariant(index, (current) => ({
                                ...current,
                                purchasePackageCost: value,
                              }))
                            }
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          {mode === "create" && !useExactMeasuredStock ? (
                            <NumberField
                              fieldKey={`variants.${index}.packageCount`}
                              label={`Cantidad de presentaciones disponibles`}
                              value={variant.packageCount}
                              onChange={(value) =>
                                updateMeasuredVariant(index, (current) => ({
                                  ...current,
                                  packageCount: value,
                                }))
                              }
                            />
                          ) : (
                            <NumberField
                              error={fieldErrors[`variants.${index}.currentStock`]}
                              fieldKey={`variants.${index}.currentStock`}
                              label={`Existencia actual en ${getUnitSymbol(variant.inventoryUnit)}`}
                              value={variant.currentStock}
                              onChange={(value) =>
                                updateMeasuredVariant(index, (current) => ({
                                  ...current,
                                  currentStock: value,
                                }))
                              }
                            />
                          )}
                          {advancedOpen && (
                            <NumberField
                              error={fieldErrors[`variants.${index}.minimumStock`]}
                              fieldKey={`variants.${index}.minimumStock`}
                              label={`Stock mínimo en ${getUnitSymbol(variant.inventoryUnit)}`}
                              value={variant.minimumStock}
                              onChange={(value) =>
                                updateMeasuredVariant(index, (current) => ({
                                  ...current,
                                  minimumStock: value,
                                }))
                              }
                            />
                          )}
                        </div>
                        {mode === "create" && (
                          <button
                            type="button"
                            onClick={() => setUseExactMeasuredStock((current) => !current)}
                            className="text-sm font-black text-[#2563EB] underline-offset-4 hover:underline"
                          >
                            {useExactMeasuredStock
                              ? "Usar cantidad por presentaciones"
                              : "Usar una cantidad exacta"}
                          </button>
                        )}
                        <p className="rounded-2xl bg-white p-3 text-xs font-bold text-[#475569]">
                          {mode === "create"
                            ? `Existencia inicial: ${formatMeasuredQuantity(
                                useExactMeasuredStock
                                  ? parseNonNegativeNumber(variant.currentStock)
                                  : calculateMeasuredVariant(variant)?.initialStock || 0,
                                variant.inventoryUnit,
                              )}`
                            : "Cambiar la presentación de compra no modifica las existencias actuales."}
                        </p>

                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#2563EB]">
                            ¿Cómo lo vendes?
                          </p>
                          <p className="mt-1 text-xs font-bold text-[#475569]">
                            Vendes cada {getUnitSymbol(variant.defaultSaleUnit)} a{" "}
                            {formatter.format(parseNonNegativeNumber(variant.salePrice))}.
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field
                            error={fieldErrors[`variants.${index}.defaultSaleUnit`]}
                            label="Unidad de venta predeterminada"
                          >
                            <select
                              data-field-key={`variants.${index}.defaultSaleUnit`}
                              value={variant.defaultSaleUnit}
                              onChange={(event) =>
                                updateMeasuredVariant(index, (current) => ({
                                  ...current,
                                  defaultSaleUnit: event.target.value as MeasurementUnit,
                                }))
                              }
                              className={inputClass}
                            >
                              {unitsForFamily(variant.measurementFamily).map((unit) => (
                                <option key={unit.value} value={unit.value}>
                                  {unit.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <NumberField
                            error={fieldErrors[`variants.${index}.salePrice`]}
                            fieldKey={`variants.${index}.salePrice`}
                            label={`Precio por ${getUnitSymbol(variant.defaultSaleUnit)}`}
                            value={variant.salePrice}
                            onChange={(value) =>
                              updateMeasuredVariant(index, (current) => ({
                                ...current,
                                salePrice: value,
                              }))
                            }
                          />
                          {advancedOpen && (
                            <>
                              <Field label="Permitir cantidades fraccionadas">
                                <select
                                  value={variant.allowFractionalSales ? "yes" : "no"}
                                  onChange={(event) =>
                                    updateMeasuredVariant(index, (current) => ({
                                      ...current,
                                      allowFractionalSales: event.target.value === "yes",
                                    }))
                                  }
                                  className={inputClass}
                                >
                                  <option value="yes">Sí</option>
                                  <option value="no">No</option>
                                </select>
                              </Field>
                              <NumberField
                                error={fieldErrors[`variants.${index}.minimumSaleQuantity`]}
                                fieldKey={`variants.${index}.minimumSaleQuantity`}
                                label="Cantidad mínima de venta"
                                value={variant.minimumSaleQuantity}
                                onChange={(value) =>
                                  updateMeasuredVariant(index, (current) => ({
                                    ...current,
                                    minimumSaleQuantity: value,
                                  }))
                                }
                              />
                              <NumberField
                                error={fieldErrors[`variants.${index}.saleQuantityStep`]}
                                fieldKey={`variants.${index}.saleQuantityStep`}
                                label="Incremento sugerido"
                                value={variant.saleQuantityStep}
                                onChange={(value) =>
                                  updateMeasuredVariant(index, (current) => ({
                                    ...current,
                                    saleQuantityStep: value,
                                  }))
                                }
                              />
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <NumberField
                        error={fieldErrors[`variants.${index}.purchaseCost`]}
                        fieldKey={`variants.${index}.purchaseCost`}
                        label="Costo de compra"
                        value={variant.purchaseCost}
                        onChange={(value) =>
                          updateVariant(index, (current) => ({
                            ...current,
                            purchaseCost: value,
                          }))
                        }
                      />
                    )}
                    {advancedOpen && (
                      <>
                        <NumberField
                          error={fieldErrors[`variants.${index}.packagingCost`]}
                          fieldKey={`variants.${index}.packagingCost`}
                          label="Costo de empaque"
                          value={variant.packagingCost}
                          onChange={(value) =>
                            updateVariant(index, (current) => ({
                              ...current,
                              packagingCost: value,
                            }))
                          }
                        />
                        <NumberField
                          error={fieldErrors[`variants.${index}.commissionPercent`]}
                          fieldKey={`variants.${index}.commissionPercent`}
                          label="Comisión %"
                          value={variant.commissionPercent}
                          onChange={(value) =>
                            updateVariant(index, (current) => ({
                              ...current,
                              commissionPercent: value,
                            }))
                          }
                        />
                      </>
                    )}
                    {(advancedOpen || showSuggestedPrice) && (
                      <NumberField
                        error={fieldErrors[`variants.${index}.desiredMarginPercent`]}
                        fieldKey={`variants.${index}.desiredMarginPercent`}
                        label="Margen deseado %"
                        value={variant.desiredMarginPercent}
                        onChange={(value) =>
                          updateVariant(index, (current) => ({
                            ...current,
                            desiredMarginPercent: value,
                          }))
                        }
                      />
                    )}
                    {product.inventoryMode === "unit" && (
                      <>
                        <NumberField
                          error={fieldErrors[`variants.${index}.salePrice`]}
                          fieldKey={`variants.${index}.salePrice`}
                          label="Precio de venta"
                          value={variant.salePrice}
                          onChange={(value) =>
                            updateVariant(index, (current) => ({
                              ...current,
                              salePrice: value,
                            }))
                          }
                        />
                        <NumberField
                          error={fieldErrors[`variants.${index}.currentStock`]}
                          fieldKey={`variants.${index}.currentStock`}
                          label="Existencia actual"
                          value={variant.currentStock}
                          onChange={(value) =>
                            updateVariant(index, (current) => ({
                              ...current,
                              currentStock: value,
                            }))
                          }
                        />
                        {advancedOpen && (
                          <NumberField
                            error={fieldErrors[`variants.${index}.minimumStock`]}
                            fieldKey={`variants.${index}.minimumStock`}
                            label="Stock mínimo"
                            value={variant.minimumStock}
                            onChange={(value) =>
                              updateVariant(index, (current) => ({
                                ...current,
                                minimumStock: value,
                              }))
                            }
                          />
                        )}
                      </>
                    )}
                    {advancedOpen && (
                      <Field label="Estado de variante">
                        <select
                          value={variant.status}
                          onChange={(event) =>
                            updateVariant(index, (current) => ({
                              ...current,
                              status: event.target.value as ProductStatus,
                            }))
                          }
                          className={inputClass}
                        >
                          <option value="active">Activa</option>
                          <option value="archived">Archivada</option>
                        </select>
                      </Field>
                    )}
                    {product.inventoryMode === "unit" &&
                      product.productType === "simple" &&
                      !showSuggestedPrice && (
                        <button
                          type="button"
                          onClick={() => setShowSuggestedPrice(true)}
                          className="rounded-full bg-[#EFF6FF] px-5 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-white sm:col-span-2"
                        >
                          Calcular precio sugerido
                        </button>
                      )}
                  </div>
                  {product.inventoryMode === "measured" ? (
                    <MeasuredPreview
                      currency={currency}
                      showAdvanced={advancedOpen}
                      variant={variant}
                    />
                  ) : showSuggestedPrice || advancedOpen ? (
                    <ProfitPreview
                      currency={currency}
                      variant={variant}
                      onUseSuggestedPrice={() => {
                        const result = calculateVariantProfit(variant);
                        updateVariant(index, (current) => ({
                          ...current,
                          salePrice: String(Math.ceil(result.suggestedPrice)),
                        }));
                        clearFieldError(`variants.${index}.salePrice`);
                        trackEvent("product_price_suggestion_used", {
                          product_type: product.productType,
                        });
                      }}
                    />
                  ) : (
                    <div className="rounded-[1.25rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <p className="text-sm font-black text-[#0F172A]">
                        Registro rápido
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#475569]">
                        Agrega costo, precio y existencia. Puedes calcular un precio
                        sugerido cuando quieras.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </section>

        <section
          className={`rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 ${
            currentStep === 3 ? "block" : "hidden"
          }`}
        >
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Revisar y guardar
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#0F172A]">
            Confirma los datos del producto
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Producto", product.name || "Sin nombre"],
              ["Categoría", product.category || "Sin categoría"],
              ["Forma de venta", sellingModeLabel],
              ["Variantes", String(product.variants.length)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.25rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4"
              >
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">
                  {label}
                </p>
                <p className="mt-2 text-lg font-black text-[#0F172A]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-[#BFDBFE] bg-[#EFF6FF]/70 p-4">
            {product.productType === "variants" ? (
              <div className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <p className="font-bold text-[#475569]">
                    Rango de precios:{" "}
                    <span className="font-black text-[#0F172A]">{priceRangeLabel}</span>
                  </p>
                  <p className="font-bold text-[#475569]">
                    Existencia total:{" "}
                    <span className="font-black text-[#0F172A]">
                      {variantStocks.reduce((total, stock) => total + stock, 0)} unidades
                    </span>
                  </p>
                  <p className="font-bold text-[#475569]">
                    Margen estimado:{" "}
                    <span className="font-black text-[#0F172A]">{marginRangeLabel}</span>
                  </p>
                  <p className="font-bold text-[#475569]">
                    Estado:{" "}
                    <span className="font-black text-[#0F172A]">{variantStatusLabel}</span>
                  </p>
                </div>
                <div className="divide-y divide-[#BFDBFE] rounded-[1.25rem] bg-white">
                  {activeVariants.map((variant, index) => (
                    <div
                      key={variant.id || index}
                      className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-black text-[#0F172A]">
                        {variant.name || `Variante ${index + 1}`}
                      </span>
                      <span className="font-bold text-[#475569]">
                        {formatter.format(parseNonNegativeNumber(variant.salePrice))} —{" "}
                        {parseNonNegativeNumber(variant.currentStock)} unidades
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : product.inventoryMode === "measured" && primaryMeasured ? (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p className="font-bold text-[#475569]">
                  Compra:{" "}
                  <span className="font-black text-[#0F172A]">
                    1 {primaryVariant.purchasePackageLabel || "bulto"} de{" "}
                    {formatMeasuredQuantity(
                      parseNonNegativeNumber(primaryVariant.purchasePackageQuantity),
                      primaryVariant.purchasePackageUnit,
                    )}{" "}
                    por{" "}
                    {formatter.format(
                      parseNonNegativeNumber(primaryVariant.purchasePackageCost),
                    )}
                  </span>
                </p>
                <p className="font-bold text-[#475569]">
                  Costo real:{" "}
                  <span className="font-black text-[#0F172A]">
                    {formatter.format(primaryMeasured.costPerSaleUnit)} por{" "}
                    {getUnitSymbol(primaryVariant.defaultSaleUnit)}
                  </span>
                </p>
                <p className="font-bold text-[#475569]">
                  Venta:{" "}
                  <span className="font-black text-[#0F172A]">
                    {formatter.format(parseNonNegativeNumber(primaryVariant.salePrice))} por{" "}
                    {getUnitSymbol(primaryVariant.defaultSaleUnit)}
                  </span>
                </p>
                <p className="font-bold text-[#475569]">
                  Existencia inicial:{" "}
                  <span className="font-black text-[#0F172A]">
                    {formatMeasuredQuantity(
                      useExactMeasuredStock
                        ? parseNonNegativeNumber(primaryVariant.currentStock)
                        : primaryMeasured.initialStock,
                      primaryVariant.inventoryUnit,
                    )}
                  </span>
                </p>
              </div>
            ) : (
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <p className="font-bold text-[#475569]">
                  Costo:{" "}
                  <span className="font-black text-[#0F172A]">
                    {formatter.format(parseNonNegativeNumber(primaryVariant.purchaseCost))}
                  </span>
                </p>
                <p className="font-bold text-[#475569]">
                  Precio:{" "}
                  <span className="font-black text-[#0F172A]">
                    {formatter.format(parseNonNegativeNumber(primaryVariant.salePrice))}
                  </span>
                </p>
                <p className="font-bold text-[#475569]">
                  Stock:{" "}
                  <span className="font-black text-[#0F172A]">
                    {parseNonNegativeNumber(primaryVariant.currentStock)}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={previousStep}
              className="rounded-full bg-white px-6 py-4 text-center text-base font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF]"
            >
              Volver y editar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-center text-base font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "Guardando..."
                : mode === "create"
                  ? "Guardar producto"
                  : "Guardar cambios"}
            </button>
          </div>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Resumen
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#0F172A]">
            {product.name || "Nuevo producto"}
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[#475569]">Tipo</span>
              <span className="font-black text-[#0F172A]">
                {sellingModeLabel}
              </span>
            </div>
            {product.productType === "variants" ? (
              <>
                <div className="flex justify-between gap-3">
                  <span className="text-[#475569]">Variantes</span>
                  <span className="font-black text-[#0F172A]">
                    {product.variants.length}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#475569]">Rango de precios</span>
                  <span className="text-right font-black text-[#0F172A]">
                    {priceRangeLabel}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#475569]">Existencia total</span>
                  <span className="font-black text-[#0F172A]">
                    {variantStocks.reduce((total, stock) => total + stock, 0)} unidades
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#475569]">Costo menor</span>
                  <span className="font-black text-[#0F172A]">
                    {variantCosts.length > 0
                      ? formatter.format(Math.min(...variantCosts))
                      : "Completa los costos"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#475569]">Costo mayor</span>
                  <span className="font-black text-[#0F172A]">
                    {variantCosts.length > 0
                      ? formatter.format(Math.max(...variantCosts))
                      : "Completa los costos"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#475569]">Estado general</span>
                  <span className="text-right font-black text-[#0F172A]">
                    {variantStatusLabel}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between gap-3">
                  <span className="text-[#475569]">Variantes</span>
                  <span className="font-black text-[#0F172A]">
                    {product.variants.length}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#475569]">Precio menor</span>
                  <span className="font-black text-[#0F172A]">
                    {formatter.format(
                      Math.min(
                        ...product.variants.map((variant) =>
                          parseNonNegativeNumber(variant.salePrice),
                        ),
                      ),
                    )}
                  </span>
                </div>
              </>
            )}
          </div>

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-4 text-sm font-bold text-[#991B1B]"
            >
              {error}
            </p>
          )}

          <div className="mt-5 grid gap-3">
            {canGoBack && (
              <button
                type="button"
                onClick={previousStep}
                className="rounded-full bg-white px-6 py-4 text-center text-base font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF]"
              >
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={currentStep < 3 ? validateBeforeNextStep : submit}
              disabled={isPending}
              className="rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-center text-base font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {currentStep < 3
                ? "Continuar"
                : isPending
                  ? "Guardando..."
                  : mode === "create"
                    ? "Guardar producto"
                    : "Guardar cambios"}
            </button>
            <Link
              href="/app/productos"
              className="rounded-full bg-white px-6 py-4 text-center text-base font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF]"
            >
              Cancelar
            </Link>
          </div>
        </section>

        {mode === "edit" && initialProduct && (
          <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <p className="font-black text-[#0F172A]">Estado del producto</p>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              Archivar conserva el historial y oculta el producto del catálogo activo.
              Al reactivar, esta versión inicial reactiva todas sus variantes.
            </p>
            {initialProduct.status === "active" ? (
              <button
                type="button"
                onClick={archive}
                disabled={isPending}
                className="mt-4 w-full rounded-full bg-[#FEE2E2] px-5 py-3 text-sm font-black text-[#991B1B] transition hover:bg-[#FECACA] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Archivar
              </button>
            ) : (
              <button
                type="button"
                onClick={restore}
                disabled={isPending}
                className="mt-4 w-full rounded-full bg-[#DCFCE7] px-5 py-3 text-sm font-black text-[#166534] transition hover:bg-[#BBF7D0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reactivar
              </button>
            )}
          </section>
        )}
      </aside>
    </div>
  );
}
