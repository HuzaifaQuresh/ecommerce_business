import { ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_51PlaceholderKey";

export const stripePromise = loadStripe(stripePublicKey);

interface StripeProviderProps {
  children: ReactNode;
  clientSecret?: string;
}

export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  const options = clientSecret ? { clientSecret } : undefined;
  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
