import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createPaymentIntent } from "@/api/stripe";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateOrderStatus } from "@/api/orders";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_placeholder");

function InnerStripeCheckoutForm({
  clientSecret,
  onSuccess,
  amountLabel,
}: {
  clientSecret: string;
  onSuccess: () => void;
  amountLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message ?? "Payment failed");
      setIsProcessing(false);
    } else {
      toast.success("Payment successful!");
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full min-h-[48px]">
        {isProcessing ? "Processing..." : `Pay ${amountLabel}`}
      </Button>
    </form>
  );
}

export function StripeCheckoutForm({
  orderId,
  amountPkr,
  onSuccess,
  amountLabel,
}: {
  orderId: string;
  amountPkr: number;
  onSuccess: () => void;
  amountLabel: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    createPaymentIntent({ data: { amount_pkr: amountPkr } })
      .then((res) => {
        setClientSecret(res.clientSecret);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to initialize payment gateway");
      });
  }, [amountPkr]);

  if (!clientSecret) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center animate-pulse">
        Initializing secure Stripe payment gateway...
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <InnerStripeCheckoutForm
        clientSecret={clientSecret}
        amountLabel={amountLabel}
        onSuccess={async () => {
          await updateOrderStatus(orderId, "processing").catch(() => {});
          onSuccess();
        }}
      />
    </Elements>
  );
}
