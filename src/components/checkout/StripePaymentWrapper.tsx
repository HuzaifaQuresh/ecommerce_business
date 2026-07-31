import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createPaymentIntent } from "@/api/stripe";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateOrderStatus } from "@/api/orders";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_placeholder");

function CheckoutForm({
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
      <Button disabled={!stripe || isProcessing} className="w-full min-h-[48px]">
        {isProcessing ? "Processing..." : `Pay ${amountLabel}`}
      </Button>
    </form>
  );
}

export function StripePaymentWrapper({
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
        toast.error("Failed to initialize payment");
      });
  }, [amountPkr]);

  if (!clientSecret) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Initializing secure payment gateway...
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm
        clientSecret={clientSecret}
        amountLabel={amountLabel}
        onSuccess={async () => {
          // Optimistically update order status
          await updateOrderStatus(orderId, "processing").catch(() => {});
          onSuccess();
        }}
      />
    </Elements>
  );
}
