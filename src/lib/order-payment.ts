import { DEFAULT_PAYMENT_METHODS } from "@/lib/checkout-defaults";

/** Human-readable checkout payment method label. */
export function paymentMethodLabel(method: string | null | undefined): string {
  const id = String(method ?? "cod").toLowerCase().trim();
  return (
    DEFAULT_PAYMENT_METHODS.find((p) => p.id === id)?.label ??
    id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Recompute expected total from stored line fields.
 * Used to flag / correct mismatched order totals in admin.
 */
export function recalculateOrderTotal(parts: {
  subtotal_pkr?: number | null;
  shipping_pkr?: number | null;
  tax_pkr?: number | null;
  payment_fee_pkr?: number | null;
  discount_pkr?: number | null;
  total_pkr?: number | null;
}): {
  expected: number;
  stored: number;
  matches: boolean;
  breakdown: {
    subtotal: number;
    shipping: number;
    tax: number;
    payment_fee: number;
    discount: number;
  };
} {
  const subtotal = Math.max(0, Number(parts.subtotal_pkr ?? 0));
  const shipping = Math.max(0, Number(parts.shipping_pkr ?? 0));
  const tax = Math.max(0, Number(parts.tax_pkr ?? 0));
  const payment_fee = Math.max(0, Number(parts.payment_fee_pkr ?? 0));
  const discount = Math.max(0, Number(parts.discount_pkr ?? 0));
  const expected = Math.round(subtotal - discount + shipping + tax + payment_fee);
  const stored = Math.round(Number(parts.total_pkr ?? expected));
  return {
    expected,
    stored,
    matches: expected === stored,
    breakdown: { subtotal, shipping, tax, payment_fee, discount },
  };
}
