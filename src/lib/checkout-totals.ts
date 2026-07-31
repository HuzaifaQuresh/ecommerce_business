import { DEFAULT_DELIVERY_METHODS, DEFAULT_PAYMENT_METHODS } from "@/lib/checkout-defaults";
import type { CheckoutConfig, CheckoutTotals, PaymentMethod } from "@/types/commerce";

export function parseJsonSetting<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export function getPaymentFee(
  methodId: string,
  methods: PaymentMethod[],
  amountAfterDiscount: number,
  codHandlingFee = 0,
): number {
  const m = methods.find((p) => p.id === methodId);
  if (!m) return 0;
  if (methodId === "cod" && codHandlingFee > 0) return codHandlingFee;
  const flat = Number(m.fee_pkr ?? 0);
  const pct = Number(m.fee_pct ?? 0);
  return Math.round(flat + (amountAfterDiscount * pct) / 100);
}

export function computeCheckoutTotals(input: {
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  taxRatePct: number;
  paymentMethodId: string;
  paymentMethods: PaymentMethod[];
  freeShippingMinPkr: number;
  codHandlingFeePkr?: number;
}): CheckoutTotals {
  const {
    subtotal,
    discount,
    deliveryCharge,
    taxRatePct,
    paymentMethodId,
    paymentMethods,
    freeShippingMinPkr,
    codHandlingFeePkr = 0,
  } = input;

  const afterDiscount = Math.max(0, subtotal - discount);
  const free_shipping_applied = afterDiscount >= freeShippingMinPkr;
  const shipping = free_shipping_applied ? 0 : deliveryCharge;
  const tax = Math.round((afterDiscount * taxRatePct) / 100);
  const payment_fee = getPaymentFee(
    paymentMethodId,
    paymentMethods,
    afterDiscount,
    codHandlingFeePkr,
  );
  const total = afterDiscount + shipping + tax + payment_fee;

  return {
    subtotal,
    discount,
    delivery_charge: deliveryCharge,
    shipping,
    tax,
    payment_fee,
    total,
    free_shipping_applied,
  };
}

export const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
  tax_rate_pct: 17,
  tax_label: "Sales Tax (GST)",
  free_shipping_min_pkr: 15_000,
  cod_handling_fee_pkr: 0,
  payment_methods: DEFAULT_PAYMENT_METHODS,
  delivery_methods: DEFAULT_DELIVERY_METHODS,
};
