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
  calculateVariantProfit,
  emptyVariant,
  moneyFormatter,
  ProductFormInput,
  ProductStatus,
  ProductType,
  ProductVariantInput,
  productUnits,
  validateProductInput,
} from "@/lib/products/product-utils";

type ProductFormProps = {
  currency?: string;
  initialProduct?: ProductFormInput & { id: string };
  mode: "create" | "edit";
};

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

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
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClass}
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
          ["Precio elegido", formatter.format(variant.salePrice)],
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

export function ProductForm({
  currency = "COP",
  initialProduct,
  mode,
}: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ProductFormInput>(
    initialProduct || {
      brand: "",
      category: "",
      description: "",
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
    setProduct((current) => ({ ...current, [key]: value }));
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

  function addVariant() {
    setProduct((current) => ({
      ...current,
      productType: "variants",
      variants: [
        ...current.variants,
        {
          ...emptyVariant(),
          name: `Variante ${current.variants.length + 1}`,
        },
      ],
    }));
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
          name: `${current.variants[index].name} copia`,
          sku: "",
        },
      ],
    }));
    trackEvent("product_variant_added");
  }

  function removeVariant(index: number) {
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

  function submit() {
    setError("");
    const validation = validateProductInput(product);

    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    startTransition(async () => {
      trackEvent(mode === "create" ? "product_created" : "product_updated", {
        product_type: validation.value.productType,
        variant_count: validation.value.variants.length,
      });

      const result =
        mode === "create"
          ? await createProduct(validation.value)
          : await updateProduct(initialProduct?.id || "", validation.value);

      if (result && !result.ok) {
        setError(result.error || "No pudimos guardar el producto.");
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Información general
          </p>
          <div className="mt-5 grid gap-4">
            <Field label="Nombre del producto">
              <input
                value={product.name}
                onChange={(event) => updateProductField("name", event.target.value)}
                maxLength={120}
                className={inputClass}
                required
              />
            </Field>

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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Marca">
                <input
                  value={product.brand}
                  onChange={(event) => updateProductField("brand", event.target.value)}
                  maxLength={100}
                  className={inputClass}
                />
              </Field>
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

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Unidad de medida">
                <select
                  value={product.unit}
                  onChange={(event) => updateProductField("unit", event.target.value)}
                  className={inputClass}
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
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
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
                    <Field label="Nombre de variante">
                      <input
                        value={variant.name}
                        onChange={(event) =>
                          updateVariant(index, (current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        maxLength={100}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="SKU">
                      <input
                        value={variant.sku}
                        onChange={(event) =>
                          updateVariant(index, (current) => ({
                            ...current,
                            sku: event.target.value,
                          }))
                        }
                        maxLength={80}
                        className={inputClass}
                      />
                    </Field>
                    <NumberField
                      label="Costo de compra"
                      value={variant.purchaseCost}
                      onChange={(value) =>
                        updateVariant(index, (current) => ({
                          ...current,
                          purchaseCost: value,
                        }))
                      }
                    />
                    <NumberField
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
                      label="Comisión %"
                      value={variant.commissionPercent}
                      onChange={(value) =>
                        updateVariant(index, (current) => ({
                          ...current,
                          commissionPercent: value,
                        }))
                      }
                    />
                    <NumberField
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
                      label="Existencia actual"
                      value={variant.currentStock}
                      onChange={(value) =>
                        updateVariant(index, (current) => ({
                          ...current,
                          currentStock: value,
                        }))
                      }
                    />
                    <NumberField
                      label="Stock mínimo"
                      value={variant.minimumStock}
                      onChange={(value) =>
                        updateVariant(index, (current) => ({
                          ...current,
                          minimumStock: value,
                        }))
                      }
                    />
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
                  </div>
                  <ProfitPreview
                    currency={currency}
                    variant={variant}
                    onUseSuggestedPrice={() => {
                      const result = calculateVariantProfit(variant);
                      updateVariant(index, (current) => ({
                        ...current,
                        salePrice: Math.round(result.suggestedPrice),
                      }));
                      trackEvent("product_price_suggestion_used", {
                        product_type: product.productType,
                      });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {product.productType === "variants" && (
            <button
              type="button"
              onClick={addVariant}
              className="mt-5 rounded-full bg-[#EFF6FF] px-5 py-3 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-white"
            >
              Agregar variante
            </button>
          )}
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
                {product.productType === "simple" ? "Simple" : "Con variantes"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#475569]">Variantes</span>
              <span className="font-black text-[#0F172A]">{product.variants.length}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#475569]">Precio menor</span>
              <span className="font-black text-[#0F172A]">
                {formatter.format(
                  Math.min(...product.variants.map((variant) => variant.salePrice || 0)),
                )}
              </span>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-4 text-sm font-bold text-[#991B1B]">
              {error}
            </p>
          )}

          <div className="mt-5 grid gap-3">
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
