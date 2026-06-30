import { toSafeNumber } from "@/lib/products/product-utils";
import type { SalePaymentMethod } from "@/lib/sales";

export type CashSessionStatus = "closed" | "open" | "voided";
export type CashMovementDirection = "in" | "out";
export type CashMovementType =
  | "adjustment"
  | "manual_expense"
  | "manual_income"
  | "other"
  | "owner_withdrawal"
  | "refund"
  | "supplier_payment";
export type CashPaymentMethod = SalePaymentMethod;

export type CashFieldErrors = Record<string, string>;

export type CashSessionRow = {
  id: string;
  business_id: string;
  session_code: string;
  status: CashSessionStatus | string;
  opened_at: string;
  closed_at: string | null;
  opening_cash_amount: number | string | null;
  expected_cash_amount: number | string | null;
  counted_cash_amount: number | string | null;
  cash_difference_amount: number | string | null;
  expected_total_amount: number | string | null;
  counted_total_amount: number | string | null;
  total_difference_amount: number | string | null;
  opening_notes: string | null;
  closing_notes: string | null;
};

export type CashMovementRow = {
  id: string;
  movement_code: string;
  direction: CashMovementDirection | string;
  movement_type: CashMovementType | string;
  payment_method: CashPaymentMethod | string;
  amount: number | string | null;
  category: string | null;
  description: string | null;
  occurred_at: string;
};

export type CashSalePaymentRow = {
  id: string;
  amount: number | string | null;
  payment_method: CashPaymentMethod | string;
  paid_at: string;
  reference: string | null;
  sales?: {
    id: string;
    sale_code: string;
    status: string | null;
  } | null;
};

export type CashCountInput = {
  countedAmount: string;
  paymentMethod: CashPaymentMethod;
};

export type OpenCashSessionInput = {
  openingCashAmount: string;
  openingNotes: string;
};

export type CashMovementInput = {
  amount: string;
  category: string;
  description: string;
  direction: CashMovementDirection;
  movementType: CashMovementType;
  occurredAt: string;
  paymentMethod: CashPaymentMethod;
};

export type CloseCashSessionInput = {
  closingNotes: string;
  counts: CashCountInput[];
  sessionId: string;
};

export const cashPaymentMethods: { label: string; value: CashPaymentMethod }[] = [
  { label: "Efectivo", value: "cash" },
  { label: "Transferencia", value: "transfer" },
  { label: "Tarjeta", value: "card" },
  { label: "Nequi", value: "nequi" },
  { label: "Daviplata", value: "daviplata" },
  { label: "Otro", value: "other" },
];

export const cashMovementTypes: { direction?: CashMovementDirection; label: string; value: CashMovementType }[] = [
  { direction: "in", label: "Ingreso adicional", value: "manual_income" },
  { direction: "out", label: "Gasto", value: "manual_expense" },
  { direction: "out", label: "Pago a proveedor", value: "supplier_payment" },
  { direction: "out", label: "Retiro del dueño", value: "owner_withdrawal" },
  { label: "Devolución", value: "refund" },
  { label: "Ajuste", value: "adjustment" },
  { label: "Otro", value: "other" },
];

export function emptyOpenCashSession(): OpenCashSessionInput {
  return {
    openingCashAmount: "",
    openingNotes: "",
  };
}

export function emptyCashMovement(): CashMovementInput {
  return {
    amount: "",
    category: "",
    description: "",
    direction: "out",
    movementType: "manual_expense",
    occurredAt: "",
    paymentMethod: "cash",
  };
}

export function emptyCloseCashSession(sessionId: string): CloseCashSessionInput {
  return {
    closingNotes: "",
    counts: cashPaymentMethods.map((method) => ({
      countedAmount: "0",
      paymentMethod: method.value,
    })),
    sessionId,
  };
}

export function getPaymentMethodLabel(method?: string | null) {
  return cashPaymentMethods.find((item) => item.value === method)?.label || "Otro";
}

export function getMovementTypeLabel(type?: string | null) {
  return cashMovementTypes.find((item) => item.value === type)?.label || "Movimiento";
}

export function getCashSessionStatusLabel(status?: string | null) {
  if (status === "open") return "Abierta";
  if (status === "closed") return "Cerrada";
  if (status === "voided") return "Anulada";
  return "Sin estado";
}

export function formatCashDifference(value: unknown) {
  const amount = Number(value || 0);

  if (amount > 0) return "Sobra";
  if (amount < 0) return "Falta";
  return "Cuadra";
}

export function validateOpenCashSession(input: OpenCashSessionInput) {
  const fieldErrors: CashFieldErrors = {};

  if (!input.openingCashAmount.trim()) {
    fieldErrors.openingCashAmount = "Ingresa el saldo inicial.";
  }

  if (String(input.openingCashAmount).includes("-")) {
    fieldErrors.openingCashAmount = "El valor no puede ser negativo.";
  }

  if (Object.keys(fieldErrors).length) {
    return { error: "Revisa los campos marcados.", fieldErrors, ok: false as const };
  }

  return { ok: true as const };
}

export function validateCashMovement(input: CashMovementInput) {
  const fieldErrors: CashFieldErrors = {};

  if (!input.direction) fieldErrors.direction = "Selecciona un tipo de movimiento.";
  if (!input.movementType) fieldErrors.movementType = "Selecciona un motivo.";
  if (!input.paymentMethod) fieldErrors.paymentMethod = "Selecciona un método de pago.";
  if (!input.amount.trim()) fieldErrors.amount = "Ingresa el valor.";
  if (String(input.amount).includes("-") || toSafeNumber(input.amount) <= 0) {
    fieldErrors.amount = "El valor debe ser mayor que cero.";
  }

  if (Object.keys(fieldErrors).length) {
    return { error: "Revisa los campos marcados.", fieldErrors, ok: false as const };
  }

  return { ok: true as const };
}

export function validateCloseCashSession(input: CloseCashSessionInput) {
  const fieldErrors: CashFieldErrors = {};

  if (!input.sessionId) fieldErrors.sessionId = "No hay caja abierta.";

  input.counts.forEach((count, index) => {
    if (String(count.countedAmount).includes("-")) {
      fieldErrors[`counts.${index}.countedAmount`] = "El monto contado no puede ser negativo.";
    }
  });

  if (Object.keys(fieldErrors).length) {
    return { error: "Revisa los montos contados.", fieldErrors, ok: false as const };
  }

  return { ok: true as const };
}

export function calculateSessionSummary({
  movements,
  payments,
  session,
}: {
  movements: CashMovementRow[];
  payments: CashSalePaymentRow[];
  session: CashSessionRow;
}) {
  const byMethod = cashPaymentMethods.map((method) => {
    const sales = payments
      .filter((payment) => payment.payment_method === method.value)
      .reduce((total, payment) => total + toSafeNumber(payment.amount), 0);
    const manualIn = movements
      .filter((movement) => movement.payment_method === method.value && movement.direction === "in")
      .reduce((total, movement) => total + toSafeNumber(movement.amount), 0);
    const manualOut = movements
      .filter((movement) => movement.payment_method === method.value && movement.direction === "out")
      .reduce((total, movement) => total + toSafeNumber(movement.amount), 0);
    const opening = method.value === "cash" ? toSafeNumber(session.opening_cash_amount) : 0;

    return {
      expectedAmount: Math.max(opening + sales + manualIn - manualOut, 0),
      manualIn,
      manualOut,
      paymentMethod: method.value,
      sales,
    };
  });

  const totalSales = byMethod.reduce((total, item) => total + item.sales, 0);
  const totalManualIn = byMethod.reduce((total, item) => total + item.manualIn, 0);
  const totalManualOut = byMethod.reduce((total, item) => total + item.manualOut, 0);
  const expectedTotal = byMethod.reduce((total, item) => total + item.expectedAmount, 0);
  const expectedCash = byMethod.find((item) => item.paymentMethod === "cash")?.expectedAmount || 0;

  return {
    byMethod,
    expectedCash,
    expectedTotal,
    totalManualIn,
    totalManualOut,
    totalSales,
  };
}

export function calculateCashExpectedAmount({
  movements,
  payments,
  session,
}: {
  movements: CashMovementRow[];
  payments: CashSalePaymentRow[];
  session: CashSessionRow;
}) {
  return calculateSessionSummary({ movements, payments, session }).expectedCash;
}

export function buildCashTimeline({
  movements,
  payments,
}: {
  movements: CashMovementRow[];
  payments: CashSalePaymentRow[];
}) {
  return [
    ...payments.map((payment) => ({
      amount: toSafeNumber(payment.amount),
      direction: "in" as const,
      id: `payment-${payment.id}`,
      method: payment.payment_method,
      occurredAt: payment.paid_at,
      reference: payment.sales?.sale_code || payment.reference || "Venta",
      title: "Venta cobrada",
      type: "sale",
    })),
    ...movements.map((movement) => ({
      amount: toSafeNumber(movement.amount),
      direction: movement.direction === "in" ? ("in" as const) : ("out" as const),
      id: `movement-${movement.id}`,
      method: movement.payment_method,
      occurredAt: movement.occurred_at,
      reference: movement.movement_code,
      title: getMovementTypeLabel(movement.movement_type),
      type: "movement",
    })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}
