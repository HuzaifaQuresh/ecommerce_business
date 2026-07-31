import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { z } from "zod";
import { useCart } from "@/contexts/CartContext";
import { fmtPKR } from "@/lib/format";
import { placeOrder } from "@/api/orders";
import { validateVoucher } from "@/api/vouchers";
import { useCheckoutConfig } from "@/hooks/useSiteSettings";
import { computeCheckoutTotals, getPaymentFee } from "@/lib/checkout-totals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CheckCircle2, Tag, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer, PageHeader, EmptyState } from "@/components/site/PageLayout";
import {
  CheckoutOrderSummary,
  FreeShippingBanner,
} from "@/components/checkout/CheckoutOrderSummary";
import { PaymentMethodCard } from "@/components/checkout/PaymentMethodCard";
import { DeliveryMethodCard } from "@/components/checkout/DeliveryMethodCard";
import { PAYMENT_INSTRUCTIONS } from "@/lib/payment-instructions";
import { PK_PROVINCES } from "@/lib/pakistan-address";
import { estimateDeliveryDate, formatDeliveryDate } from "@/lib/order-fulfillment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Package } from "lucide-react";
import { optimizeProductImageUrl } from "@/lib/product-image";
import { StripePaymentWrapper } from "@/components/checkout/StripePaymentWrapper";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — NexusIoT" }] }),
  component: Checkout,
});

const schema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(20),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(80),
  postal_code: z.string().trim().max(12).optional().or(z.literal("")),
  landmark: z.string().trim().max(200).optional().or(z.literal("")),
});

function Checkout() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: config, isLoading: configLoading } = useCheckoutConfig();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "Punjab",
    postal_code: "",
    landmark: "",
  });

  // Auto-fill from saved profile + auth session
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, address, city, province, postal_code, landmark")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: p }) => {
        setForm((prev) => ({
          ...prev,
          customer_name: prev.customer_name || (p?.full_name ?? ""),
          email: prev.email || (user.email ?? ""),
          phone: prev.phone || (p?.phone ?? ""),
          address: prev.address || ((p as any)?.address ?? ""),
          city: prev.city || ((p as any)?.city ?? ""),
          province: prev.province || ((p as any)?.province ?? "Punjab"),
          postal_code: prev.postal_code || ((p as any)?.postal_code ?? ""),
          landmark: prev.landmark || ((p as any)?.landmark ?? ""),
        }));
      });
  }, [user]);
  const [voucherCode, setVoucherCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [done, setDone] = useState<{
    id: string;
    payment: string;
    total: number;
    expectedAt: string;
    deliveryLabel: string;
    snapshot: typeof form;
    lineItems: { title: string; quantity: number; price_pkr: number; image_url: string | null }[];
  } | null>(null);

  const expectedDeliveryAt = useMemo(
    () => estimateDeliveryDate(deliveryMethod).toISOString(),
    [deliveryMethod],
  );
  const expectedDeliveryLabel = formatDeliveryDate(expectedDeliveryAt, deliveryMethod);

  const enabledPayments = useMemo(
    () => (config?.payment_methods ?? []).filter((p) => p.enabled),
    [config],
  );
  const enabledDelivery = useMemo(
    () => (config?.delivery_methods ?? []).filter((d) => d.enabled),
    [config],
  );

  useEffect(() => {
    if (enabledPayments.length && !enabledPayments.some((p) => p.id === paymentMethod)) {
      setPaymentMethod(enabledPayments[0].id);
    }
  }, [enabledPayments, paymentMethod]);

  useEffect(() => {
    if (enabledDelivery.length && !enabledDelivery.some((d) => d.id === deliveryMethod)) {
      setDeliveryMethod(enabledDelivery[0].id);
    }
  }, [enabledDelivery, deliveryMethod]);

  const selectedDelivery = enabledDelivery.find((d) => d.id === deliveryMethod);
  const deliveryCharge = selectedDelivery?.charge_pkr ?? 250;

  const totals = useMemo(() => {
    if (!config) {
      return computeCheckoutTotals({
        subtotal,
        discount,
        deliveryCharge,
        taxRatePct: 17,
        paymentMethodId: paymentMethod,
        paymentMethods: enabledPayments,
        freeShippingMinPkr: 15000,
      });
    }
    return computeCheckoutTotals({
      subtotal,
      discount,
      deliveryCharge,
      taxRatePct: config.tax_rate_pct,
      paymentMethodId: paymentMethod,
      paymentMethods: config.payment_methods,
      freeShippingMinPkr: config.free_shipping_min_pkr,
      codHandlingFeePkr: config.cod_handling_fee_pkr,
    });
  }, [config, subtotal, discount, deliveryCharge, paymentMethod, enabledPayments]);

  const paymentLabel = enabledPayments.find((p) => p.id === paymentMethod)?.label ?? paymentMethod;
  const deliveryLabel = selectedDelivery?.label ?? "Standard";

  const applyVoucher = async () => {
    const res = await validateVoucher(voucherCode, subtotal);
    if (!res.ok) {
      toast.error(res.message);
      setDiscount(0);
      setAppliedCode(null);
      return;
    }
    setDiscount(res.discount);
    setAppliedCode(res.voucher.code);
    toast.success(`Voucher applied: −${fmtPKR(res.discount)}`);
  };

  if (items.length === 0 && !done) {
    return (
      <PageContainer size="md">
        <EmptyState
          title="No items to checkout"
          description="Your cart is empty. Add products before checking out."
          action={
            <Button size="lg" onClick={() => navigate({ to: "/products" })}>
              Browse products
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (done) {
    const instructions = PAYMENT_INSTRUCTIONS[done.payment];
    const s = done.snapshot;
    return (
      <PageContainer size="md">
        <div className="py-10 sm:py-12 max-w-xl mx-auto">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-600" />
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold">Order confirmed</h1>
            <p className="mt-2 text-muted-foreground">
              Order{" "}
              <span className="font-mono font-medium text-foreground">
                #{done.id.slice(0, 8).toUpperCase()}
              </span>{" "}
              · {fmtPKR(done.total)}
            </p>
            <p className="mt-1 text-sm capitalize text-muted-foreground">Payment: {paymentLabel}</p>
          </div>

          <div className="mt-8 grid gap-4 text-sm">
            <div className="rounded-xl border bg-card p-5 space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Expected delivery
              </p>
              <p className="text-lg font-semibold">
                {formatDeliveryDate(done.expectedAt, deliveryMethod)}
              </p>
              <p className="text-muted-foreground capitalize">{done.deliveryLabel}</p>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Shipping to
              </p>
              <p className="font-medium">
                {s.customer_name} · {s.phone}
              </p>
              <p className="text-muted-foreground">{s.address}</p>
              {s.landmark && <p className="text-muted-foreground">Near: {s.landmark}</p>}
              <p>
                {s.city}, {s.province}
                {s.postal_code ? ` · ${s.postal_code}` : ""}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <p className="font-semibold flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-primary" />
                Products — pending dispatch
              </p>
              <ul className="space-y-2">
                {done.lineItems.map((i, idx) => (
                  <li key={idx} className="flex gap-3 items-center">
                    <div className="h-12 w-12 rounded-md border bg-muted overflow-hidden shrink-0">
                      {i.image_url ? (
                        <img
                          src={optimizeProductImageUrl(i.image_url, "thumb")}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-muted-foreground/40">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{i.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty {i.quantity} · {fmtPKR(i.price_pkr * i.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs mt-3">
                Track dispatch and delivery per product from your order details page.
              </p>
            </div>
          </div>

          {instructions && (
            <div className="mt-4 text-left rounded-xl border bg-card p-5 text-sm space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Payment instructions
              </p>
              <p className="text-muted-foreground leading-relaxed">{instructions}</p>
            </div>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() =>
                navigate({ to: "/account/orders/$orderId", params: { orderId: done.id } })
              }
            >
              Order details
            </Button>
            <Button onClick={() => navigate({ to: "/" })}>Back to home</Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const order = await placeOrder({
        ...parsed.data,
        subtotal_pkr: totals.subtotal,
        shipping_pkr: totals.shipping,
        tax_pkr: totals.tax,
        payment_fee_pkr: totals.payment_fee,
        delivery_method: deliveryMethod,
        total_pkr: totals.total,
        discount_pkr: discount,
        voucher_code: appliedCode,
        payment_method: paymentMethod,
        user_id: user?.id ?? null,
        province: parsed.data.province,
        postal_code: parsed.data.postal_code || undefined,
        landmark: parsed.data.landmark || undefined,
        items: items.map((i) => ({
          product_id: i.id,
          title: i.title,
          price_pkr: i.price_pkr,
          quantity: i.quantity,
          image_url: i.image_url,
          product_slug: i.slug,
        })),
      });
      const lineSnapshot = items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        price_pkr: i.price_pkr,
        image_url: i.image_url,
      }));
      clear();

      if (paymentMethod === "card") {
        setPendingOrder({
          id: order.id,
          payment: paymentMethod,
          total: totals.total,
          expectedAt: order.expected_delivery_at ?? expectedDeliveryAt,
          deliveryLabel,
          snapshot: parsed.data,
          lineItems: lineSnapshot,
        });
        setStep(4);
      } else {
        setDone({
          id: order.id,
          payment: paymentMethod,
          total: totals.total,
          expectedAt: order.expected_delivery_at ?? expectedDeliveryAt,
          deliveryLabel,
          snapshot: parsed.data,
          lineItems: lineSnapshot,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = ["Contact", "Delivery & Payment", "Review"];
  const afterDiscount = Math.max(0, subtotal - discount);

  const voucherSlot = (
    <div className="flex gap-2">
      <Input
        placeholder="Voucher code"
        value={voucherCode}
        onChange={(e) => setVoucherCode(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={applyVoucher}
        title="Apply voucher"
      >
        <Tag className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <PageContainer size="lg">
      <PageHeader
        title="Secure checkout"
        description="Pakistan-wide delivery · PKR pricing · GST shown before you pay"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,380px)] gap-6 lg:gap-8">
        <div className="order-2 lg:order-1 rounded-xl border bg-card p-4 sm:p-6 space-y-5 shadow-[var(--shadow-card)]">
          <div
            className="flex items-center gap-2"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={3}
          >
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex-1 min-w-0">
                <div className={`h-1.5 rounded-full ${step >= n ? "bg-primary" : "bg-muted"}`} />
                <span className="hidden sm:block text-[10px] text-muted-foreground mt-1 truncate">
                  {stepLabels[n - 1] || "Payment"}
                </span>
              </div>
            ))}
          </div>

          {config && (
            <FreeShippingBanner minPkr={config.free_shipping_min_pkr} subtotal={afterDiscount} />
          )}

          {step === 1 && (
            <>
              <h2 className="font-semibold text-lg">1. Contact information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full name</Label>
                  <Input
                    className="mt-1.5"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Mobile (for delivery updates)</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="03XX XXXXXXX"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={() => setStep(2)} className="w-full min-h-[48px]">
                Continue to delivery & payment
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-semibold text-lg">2. Delivery address</h2>
              <div className="space-y-4">
                <div>
                  <Label>Street address</Label>
                  <Textarea
                    className="mt-1.5"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="House / plot, street, area"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      className="mt-1.5"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Province</Label>
                    <Select
                      value={form.province}
                      onValueChange={(v) => setForm({ ...form, province: v })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        {PK_PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Postal code (optional)</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="e.g. 54000"
                      value={form.postal_code}
                      onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Landmark (optional)</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Near mosque, mall, etc."
                      value={form.landmark}
                      onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <h2 className="font-semibold text-lg pt-2">Delivery method</h2>
              {configLoading ? (
                <p className="text-sm text-muted-foreground">Loading delivery options…</p>
              ) : (
                <RadioGroup
                  value={deliveryMethod}
                  onValueChange={setDeliveryMethod}
                  className="space-y-2"
                >
                  {enabledDelivery.map((d) => (
                    <DeliveryMethodCard
                      key={d.id}
                      method={d}
                      selected={deliveryMethod === d.id}
                      displayCharge={
                        afterDiscount >= (config?.free_shipping_min_pkr ?? 0) ? 0 : d.charge_pkr
                      }
                    />
                  ))}
                </RadioGroup>
              )}

              <h2 className="font-semibold text-lg pt-2">Payment method</h2>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className="space-y-2"
              >
                {enabledPayments.map((p) => (
                  <PaymentMethodCard
                    key={p.id}
                    method={p}
                    selected={paymentMethod === p.id}
                    feePreview={getPaymentFee(
                      p.id,
                      config?.payment_methods ?? enabledPayments,
                      afterDiscount,
                      config?.cod_handling_fee_pkr,
                    )}
                  />
                ))}
              </RadioGroup>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="min-h-[44px]">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 min-h-[48px]">
                  Review order
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-semibold text-lg">3. Review & place order</h2>
              <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
                <p>
                  <strong>{form.customer_name}</strong> · {form.phone}
                </p>
                <p className="text-muted-foreground">{form.email}</p>
                <p>
                  {form.address}
                  {form.landmark ? ` · Near ${form.landmark}` : ""}
                </p>
                <p>
                  {form.city}, {form.province}
                  {form.postal_code ? ` · ${form.postal_code}` : ""}
                </p>
                <hr className="border-border/60" />
                <p className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    <span className="text-muted-foreground">Est. delivery:</span>{" "}
                    {expectedDeliveryLabel}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Delivery:</span> {deliveryLabel}
                  {totals.free_shipping_applied && " (free shipping)"}
                </p>
                <p>
                  <span className="text-muted-foreground">Payment:</span> {paymentLabel}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="min-h-[44px]">
                  Back
                </Button>
                <Button onClick={submit} disabled={submitting} className="flex-1 min-h-[48px]">
                  {submitting
                    ? "Placing order…"
                    : paymentMethod === "card"
                      ? "Proceed to payment"
                      : `Place order — ${fmtPKR(totals.total)}`}
                </Button>
              </div>
            </>
          )}

          {step === 4 && pendingOrder && (
            <>
              <h2 className="font-semibold text-lg">4. Secure payment</h2>
              <StripePaymentWrapper
                orderId={pendingOrder.id}
                amountPkr={pendingOrder.total}
                amountLabel={fmtPKR(pendingOrder.total)}
                onSuccess={() => {
                  setDone(pendingOrder);
                }}
              />
            </>
          )}
        </div>

        <CheckoutOrderSummary
          className="order-1 lg:order-2"
          items={items}
          totals={totals}
          taxLabel={config?.tax_label ?? "Sales Tax (GST)"}
          voucherSlot={voucherSlot}
          appliedCode={appliedCode}
          paymentLabel={paymentLabel}
          deliveryLabel={deliveryLabel}
        />
      </div>
    </PageContainer>
  );
}
