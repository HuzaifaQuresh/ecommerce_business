import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";

let stripe: Stripe | null = null;
function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is required");
    stripe = new Stripe(key, { apiVersion: "2023-10-16" as any });
  }
  return stripe;
}

export const createPaymentIntent = createServerFn({ method: "POST" })
  .validator((d: { amount_pkr: number }) => d)
  .handler(async ({ data }) => {
    const s = getStripe();
    // Stripe expects amount in smallest currency unit.
    // PKR doesn't have decimals typically, but Stripe expects integers.
    // Ensure we send the correct value.
    const paymentIntent = await s.paymentIntents.create({
      amount: Math.round(data.amount_pkr * 100),
      currency: "pkr",
      automatic_payment_methods: { enabled: true },
    });
    return { clientSecret: paymentIntent.client_secret };
  });
