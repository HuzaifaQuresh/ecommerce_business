import { ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "";

export const stripePromise = stripePublicKey.startsWith("pk_")
  ? loadStripe(stripePublicKey)
  : Promise.resolve(null);

interface StripeProviderProps {
  children: ReactNode;
  clientSecret?: string;
}

/** Only mount Stripe Elements on checkout — wrapping the whole storefront crashes the root error boundary. */
export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  if (!clientSecret) return children;
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      {children}
    </Elements>
  );
}
