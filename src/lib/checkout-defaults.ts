import type { DeliveryMethod, PaymentMethod } from "@/types/commerce";

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay the courier in cash when your package arrives.",
    enabled: true,
    fee_pkr: 0,
  },
  {
    id: "easypaisa",
    label: "EasyPaisa",
    description: "Transfer via EasyPaisa — use order ID as payment reference.",
    enabled: true,
    fee_pkr: 0,
  },
  {
    id: "jazzcash",
    label: "JazzCash",
    description: "JazzCash mobile account — details on order confirmation.",
    enabled: true,
    fee_pkr: 0,
  },
  {
    id: "bank",
    label: "Bank Transfer",
    description: "HBL, Meezan, or Allied Bank — IBAN shared after checkout.",
    enabled: true,
    fee_pkr: 0,
  },
  {
    id: "card",
    label: "Debit / Credit Card",
    description: "Visa, Mastercard, and local debit cards (2.5% processing fee).",
    enabled: true,
    fee_pct: 2.5,
  },
];

export const DEFAULT_DELIVERY_METHODS: DeliveryMethod[] = [
  {
    id: "standard",
    label: "Standard Delivery",
    description: "Nationwide courier partners",
    eta: "3–5 business days",
    charge_pkr: 250,
    enabled: true,
  },
  {
    id: "express",
    label: "Express Delivery",
    description: "Lahore, Karachi, Islamabad, Rawalpindi",
    eta: "1–2 business days",
    charge_pkr: 450,
    enabled: true,
  },
  {
    id: "pickup",
    label: "Warehouse Pickup",
    description: "NexusIoT Islamabad office — bring order confirmation",
    eta: "Same day (business hours)",
    charge_pkr: 0,
    enabled: true,
  },
];
