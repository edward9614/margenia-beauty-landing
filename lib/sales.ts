import {
  areUnitsCompatible,
  convertMeasurement,
  getUnitSymbol,
  type MeasurementUnit,
} from "@/lib/measurements";
import { toSafeNumber, type ProductVariantRow } from "@/lib/products/product-utils";

export type SalePaymentStatus = "paid" | "partial" | "pending";
export type SaleStatus = "completed" | "voided";
export type SaleChannel = "feria" | "instagram" | "local" | "online_store" | "otro" | "whatsapp";
export type SalePaymentMethod = "cash" | "card" | "daviplata" | "nequi" | "other" | "transfer";
export type SaleItemType = "combo" | "product";

export type SaleCatalogProduct = ProductVariantRow & {
  product_name: string;
  product_status: string | null;
  track_inventory: boolean | null;
  unit: string | null;
};

export type SaleCatalogComboItem = {
  id: string;
  product_id: string;
  variant_id: string;
  quantity: number | string | null;
  quantity_unit: string | null;
  quantity_in_inventory_unit: number | string | null;
  status: string | null;
  product_variants?: (ProductVariantRow & {
    products?: {
      id: string;
      name: string;
      status: string | null;
      track_inventory: boolean | null;
    } | null;
  }) | null;
};

export type SaleCatalogCombo = {
  id: string;
  name: string;
  sale_price: number | string | null;
  packaging_cost?: number | string | null;
  status: string | null;
  combo_items?: SaleCatalogComboItem[] | null;
};

export type SaleCartItem = {
  id: string;
  itemType: SaleItemType;
  productId?: string;
  variantId?: string;
  comboId?: string;
  name: string;
  variantName?: string;
  sku?: string;
  quantity: string;
  quantityUnit: MeasurementUnit;
  unitPrice: string;
  discountAmount: string;
  taxPercent: string;
  position: number;
};

export type SaleFormInput = {
  customerName: string;
  customerPhone: string;
  customerNote: string;
  channel: SaleChannel;
  discountAmount: string;
  shippingAmount: string;
  paymentStatus: SalePaymentStatus;
  paidAmount: string;
  paymentMethod: SalePaymentMethod | "";
  paymentReference: string;
  notes: string;
  items: SaleCartItem[];
};

export type SaleFieldErrors = Record<string, string>;

export type SaleLinePreview = {
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  quantityInInventoryUnit: number;
  stockError?: string;
};

export type SaleTotals = {
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
};

export type SaleRow = {
  id: string;
  business_id?: string;
  sale_code: string;
  sale_date: string;
  customer_name: string | null;
  customer_phone: string | null;
  channel: SaleChannel | string | null;
  payment_status: SalePaymentStatus | string | null;
  status: SaleStatus | string | null;
  subtotal_amount: number | string | null;
  discount_amount: number | string | null;
  tax_amount: number | string | null;
  shipping_amount: number | string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  total_cost: number | string | null;
  gross_profit: number | string | null;
  gross_margin_percent: number | string | null;
  notes: string | null;
  void_reason?: string | null;
  sale_items?: SaleItemRow[] | null;
  sale_payments?: SalePaymentRow[] | null;
};

export type SaleItemRow = {
  id: string;
  item_type: SaleItemType | string;
  item_name: string;
  variant_name: string | null;
  sku: string | null;
  quantity: number | string | null;
  quantity_unit: string | null;
  unit_price: number | string | null;
  total_amount: number | string | null;
  total_cost: number | string | null;
  gross_profit: number | string | null;
  position: number | null;
};

export type SalePaymentRow = {
  id: string;
  amount: number | string | null;
  payment_method: SalePaymentMethod | string;
  paid_at: string;
  reference: string | null;
};

export const saleChannels: { label: string; value: SaleChannel }[] = [
  { label: "Local", value: "local" },
  { label: "Instagram", value: "instagram" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Tienda online", value: "online_store" },
  { label: "Feria", value: "feria" },
  { label: "Otro", value: "otro" },
];

export const salePaymentMethods: { label: string; value: SalePaymentMethod }[] = [
  { label: "Efectivo", value: "cash" },
  { label: "Transferencia", value: "transfer" },
  { label: "Tarjeta", value: "card" },
  { label: "Nequi", value: "nequi" },
  { label: "Daviplata", value: "daviplata" },
  { label: "Otro", value: "other" },
];

export function emptySaleForm(): SaleFormInput {
  return {
    channel: "local",
    customerName: "",
    customerNote: "",
    customerPhone: "",
    discountAmount: "0",
    items: [],
    notes: "",
    paidAmount: "0",
    paymentMethod: "",
    paymentReference: "",
    paymentStatus: "paid",
    shippingAmount: "0",
  };
}

export function formatSaleCode(sequence: number, date = new Date()) {
  return `V-${date.getFullYear()}-${String(sequence).padStart(6, "0")}`;
}

export function calculateQuantityInInventoryUnit({
  quantity,
  quantityUnit,
  variant,
}: {
  quantity: string | number;
  quantityUnit: string;
  variant: ProductVariantRow;
}) {
  const parsedQuantity = toSafeNumber(quantity);

  if (variant.inventory_mode !== "measured") {
    return parsedQuantity;
  }

  const inventoryUnit = variant.inventory_unit || "unit";

  if (!areUnitsCompatible(quantityUnit, inventoryUnit)) {
    return 0;
  }

  return convertMeasurement(parsedQuantity, quantityUnit, inventoryUnit);
}

export function calculateSaleLineProduct(
  item: SaleCartItem,
  variant?: SaleCatalogProduct,
): SaleLinePreview {
  const quantity = toSafeNumber(item.quantity);
  const unitPrice = toSafeNumber(item.unitPrice);
  const discountAmount = toSafeNumber(item.discountAmount);
  const taxPercent = toSafeNumber(item.taxPercent);
  const quantityInInventoryUnit = variant
    ? calculateQuantityInInventoryUnit({
        quantity,
        quantityUnit: item.quantityUnit,
        variant,
      })
    : 0;
  const subtotalAmount = quantity * unitPrice;
  const taxableBase = Math.max(subtotalAmount - discountAmount, 0);
  const taxAmount = taxableBase * (taxPercent / 100);
  const totalAmount = taxableBase + taxAmount;
  const totalCost = quantityInInventoryUnit * toSafeNumber(variant?.purchase_cost);
  const grossProfit = totalAmount - totalCost;
  const grossMarginPercent = totalAmount > 0 ? (grossProfit / totalAmount) * 100 : 0;
  const stock = toSafeNumber(variant?.current_stock);
  const stockError =
    variant && variant.track_inventory !== false && quantityInInventoryUnit > stock
      ? "No hay suficiente inventario."
      : "";

  return {
    discountAmount,
    grossMarginPercent,
    grossProfit,
    quantityInInventoryUnit,
    stockError,
    subtotalAmount,
    taxAmount,
    totalAmount,
    totalCost,
  };
}

export function calculateSaleLineCombo(
  item: SaleCartItem,
  combo?: SaleCatalogCombo,
): SaleLinePreview {
  const quantity = toSafeNumber(item.quantity);
  const unitPrice = toSafeNumber(item.unitPrice);
  const discountAmount = toSafeNumber(item.discountAmount);
  const taxPercent = toSafeNumber(item.taxPercent);
  const subtotalAmount = quantity * unitPrice;
  const taxableBase = Math.max(subtotalAmount - discountAmount, 0);
  const taxAmount = taxableBase * (taxPercent / 100);
  const totalAmount = taxableBase + taxAmount;
  const totalCost = (combo?.combo_items || []).reduce((total, comboItem) => {
    const required = toSafeNumber(comboItem.quantity_in_inventory_unit) * quantity;
    const cost = toSafeNumber(comboItem.product_variants?.purchase_cost);
    return total + required * cost;
  }, 0);
  const grossProfit = totalAmount - totalCost;
  const grossMarginPercent = totalAmount > 0 ? (grossProfit / totalAmount) * 100 : 0;
  const stockError = getComboStockPossible(combo) === 0 ? "No hay suficiente inventario." : "";

  return {
    discountAmount,
    grossMarginPercent,
    grossProfit,
    quantityInInventoryUnit: quantity,
    stockError,
    subtotalAmount,
    taxAmount,
    totalAmount,
    totalCost,
  };
}

export function getComboStockPossible(combo?: SaleCatalogCombo) {
  if (!combo || !combo.combo_items?.length) {
    return 0;
  }

  const controlled = combo.combo_items
    .map((item) => {
      const variant = item.product_variants;
      const trackInventory = variant?.products?.track_inventory ?? true;

      if (!variant || trackInventory === false) {
        return null;
      }

      const required = toSafeNumber(item.quantity_in_inventory_unit);

      if (required <= 0) {
        return 0;
      }

      return Math.floor(toSafeNumber(variant.current_stock) / required);
    })
    .filter((value): value is number => value !== null);

  if (!controlled.length) {
    return null;
  }

  return Math.max(Math.min(...controlled), 0);
}

export function calculateSaleTotals({
  combos,
  form,
  products,
}: {
  combos: SaleCatalogCombo[];
  form: SaleFormInput;
  products: SaleCatalogProduct[];
}): SaleTotals {
  const lines = form.items.map((item) => {
    if (item.itemType === "combo") {
      return calculateSaleLineCombo(
        item,
        combos.find((combo) => combo.id === item.comboId),
      );
    }

    return calculateSaleLineProduct(
      item,
      products.find((variant) => variant.id === item.variantId),
    );
  });
  const subtotalAmount = lines.reduce((total, line) => total + line.subtotalAmount, 0);
  const lineDiscounts = lines.reduce((total, line) => total + line.discountAmount, 0);
  const globalDiscount = toSafeNumber(form.discountAmount);
  const discountAmount = lineDiscounts + globalDiscount;
  const taxAmount = lines.reduce((total, line) => total + line.taxAmount, 0);
  const shippingAmount = toSafeNumber(form.shippingAmount);
  const totalAmount = Math.max(
    lines.reduce((total, line) => total + line.totalAmount, 0) - globalDiscount + shippingAmount,
    0,
  );
  const paidAmount =
    form.paymentStatus === "paid" ? totalAmount : form.paymentStatus === "pending" ? 0 : toSafeNumber(form.paidAmount);
  const balanceDue = Math.max(totalAmount - paidAmount, 0);
  const totalCost = lines.reduce((total, line) => total + line.totalCost, 0);
  const grossProfit = totalAmount - totalCost;
  const grossMarginPercent = totalAmount > 0 ? (grossProfit / totalAmount) * 100 : 0;

  return {
    balanceDue,
    discountAmount,
    grossMarginPercent,
    grossProfit,
    paidAmount,
    shippingAmount,
    subtotalAmount,
    taxAmount,
    totalAmount,
    totalCost,
  };
}

export function calculatePaymentStatus(totalAmount: number, paidAmount: number): SalePaymentStatus {
  if (paidAmount <= 0) {
    return "pending";
  }

  if (paidAmount >= totalAmount) {
    return "paid";
  }

  return "partial";
}

export function validateSaleCart({
  combos,
  form,
  products,
}: {
  combos: SaleCatalogCombo[];
  form: SaleFormInput;
  products: SaleCatalogProduct[];
}) {
  const fieldErrors: SaleFieldErrors = {};

  if (!form.items.length) {
    fieldErrors.items = "Agrega al menos un producto o combo.";
  }

  form.items.forEach((item, index) => {
    const prefix = `items.${index}`;
    const quantity = toSafeNumber(item.quantity);
    const unitPrice = toSafeNumber(item.unitPrice);

    if (quantity <= 0) {
      fieldErrors[`${prefix}.quantity`] = "La cantidad debe ser mayor que cero.";
    }

    if (unitPrice <= 0) {
      fieldErrors[`${prefix}.unitPrice`] = "El precio debe ser mayor que cero.";
    }

    if (item.itemType === "product") {
      const variant = products.find((current) => current.id === item.variantId);

      if (!variant || variant.status !== "active" || variant.product_status !== "active") {
        fieldErrors[`${prefix}.item`] = "Este producto ya no está activo.";
      }

      const line = calculateSaleLineProduct(item, variant);

      if (line.stockError) {
        fieldErrors[`${prefix}.stock`] = line.stockError;
      }
    } else {
      const combo = combos.find((current) => current.id === item.comboId);

      if (!combo || combo.status !== "active") {
        fieldErrors[`${prefix}.item`] = "Este combo ya no está activo.";
      }

      const stockPossible = getComboStockPossible(combo);

      if (stockPossible !== null && quantity > stockPossible) {
        fieldErrors[`${prefix}.stock`] = "No hay suficiente inventario.";
      }
    }
  });

  const totals = calculateSaleTotals({ combos, form, products });

  if ((form.paymentStatus === "partial" || form.paymentStatus === "pending") && !form.customerName.trim()) {
    fieldErrors.customerName = "Agrega el nombre del cliente para ventas pendientes.";
  }

  if ((form.paymentStatus === "paid" || form.paymentStatus === "partial") && !form.paymentMethod) {
    fieldErrors.paymentMethod = "Selecciona un método de pago.";
  }

  if (form.paymentStatus === "partial") {
    const paidAmount = toSafeNumber(form.paidAmount);

    if (paidAmount <= 0 || paidAmount >= totals.totalAmount) {
      fieldErrors.paidAmount = "El monto pagado no puede ser mayor al total.";
    }
  }

  return {
    error: Object.values(fieldErrors)[0] || "",
    fieldErrors,
    ok: Object.keys(fieldErrors).length === 0,
    totals,
  };
}

export function salePaymentStatusLabel(status: string | null | undefined) {
  if (status === "partial") return "Pago parcial";
  if (status === "pending") return "Pendiente";
  return "Pagada";
}

export function saleStatusLabel(status: string | null | undefined) {
  return status === "voided" ? "Anulada" : "Completada";
}

export function saleChannelLabel(channel: string | null | undefined) {
  return saleChannels.find((item) => item.value === channel)?.label || "Local";
}

export function salePaymentMethodLabel(method: string | null | undefined) {
  return salePaymentMethods.find((item) => item.value === method)?.label || "Sin pago";
}

export function saleUnitLabel(unit: string | null | undefined) {
  return getUnitSymbol(unit || "unit");
}
