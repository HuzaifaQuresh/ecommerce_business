import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchOrderWithItems } from "@/api/orders";
import type { OrderWithItems } from "@/types/commerce";
import { ORDER_STATUS_META, formatDeliveryDate, formatAddressBlock } from "@/lib/order-fulfillment";
import {
  Package,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ClipboardCheck,
  AlertCircle,
  Undo2,
  Calendar,
  CreditCard,
  MapPin,
  ClipboardCopy,
} from "lucide-react";

interface TrackOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrackOrderDialog({ open, onOpenChange }: TrackOrderDialogProps) {
  const [orderId, setOrderId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<OrderWithItems | null>(null);

  // Auto-populate for testing convenience if user opens first time
  const fillSample = (oid: string, em: string) => {
    setOrderId(oid);
    setEmail(em);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return toast.error("Please enter an Order ID");
    if (!email.trim() || !email.includes("@"))
      return toast.error("Please enter a valid email address");

    setIsLoading(true);
    setErrorMsg(null);
    setOrder(null);

    try {
      const found = await fetchOrderWithItems(orderId.trim());
      if (found && found.email.trim().toLowerCase() === email.trim().toLowerCase()) {
        setOrder(found);
        toast.success("Order retrieved successfully!");
      } else {
        setErrorMsg(
          "We couldn't find an order with those credentials. Please verify your Order ID and Email.",
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred while fetching the order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Tracking number copied to clipboard!");
  };

  const steps = [
    { key: "pending", label: "Ordered", icon: ClipboardCheck },
    { key: "processing", label: "Processing", icon: Clock },
    { key: "shipped", label: "Dispatched", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle2 },
  ];

  const currentStatus = order?.status || "pending";
  const currentStepNum = ORDER_STATUS_META[currentStatus]?.step ?? 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) {
          setOrder(null);
          setErrorMsg(null);
          // Clear forms optionally or retain for easy retry
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" id="track-order-dialog">
        {!order ? (
          /* Search / Lookup view */
          <div className="p-6 sm:p-8 bg-white">
            <DialogHeader className="text-left mb-6">
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Track Your Order
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-500">
                Enter your Order ID and the email address used during checkout to view real-time
                shipping updates.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-lg bg-rose-50 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 border border-rose-100">
                <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="track-order-id" className="text-xs font-semibold text-slate-700">
                  Order ID
                </label>
                <Input
                  id="track-order-id"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g., mock-order-001"
                  className="h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="track-email" className="text-xs font-semibold text-slate-700">
                  Email Address
                </label>
                <Input
                  id="track-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., ahmed@example.com"
                  className="h-10 text-xs sm:text-sm"
                />
              </div>

              <Button
                id="track-search-submit"
                type="submit"
                className="w-full h-10 mt-2 bg-primary hover:bg-primary/90 text-white font-semibold flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-white" />
                    Finding Order...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Locate Shipment
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Assist */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Quick Demo Accounts (Click to fill)
              </h4>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => fillSample("mock-order-001", "ahmed@example.com")}
                  className="flex-1 text-left p-2.5 rounded-md border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition text-xs"
                >
                  <p className="font-semibold text-slate-700">Ahmed Raza (Delivered)</p>
                  <p className="text-slate-500 mt-0.5">ID: mock-order-001 · ahmed@example.com</p>
                </button>
                <button
                  type="button"
                  onClick={() => fillSample("mock-order-002", "sana@example.com")}
                  className="flex-1 text-left p-2.5 rounded-md border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition text-xs"
                >
                  <p className="font-semibold text-slate-700">Sana Iqbal (Processing)</p>
                  <p className="text-slate-500 mt-0.5">ID: mock-order-002 · sana@example.com</p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Live Timeline Tracker View */
          <div className="bg-slate-50">
            {/* Top Bar Header */}
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div>
                <button
                  type="button"
                  onClick={() => setOrder(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-1"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Track another order
                </button>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Order Status: <span className="text-primary font-mono">{order.id}</span>
                </h3>
              </div>
              <div className="bg-slate-100 px-3 py-1 rounded-full text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                {currentStatus}
              </div>
            </div>

            {/* Stepper Timeline Graphics */}
            <div className="bg-white px-6 py-8 border-b border-slate-100">
              {currentStatus === "cancelled" ? (
                <div className="text-center py-4 text-rose-600">
                  <AlertCircle className="h-10 w-10 mx-auto mb-2" />
                  <p className="font-bold text-base">This Order Has Been Cancelled</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Please contact customer support at 0332-3059259 for inquiries.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-8 right-8 h-1 bg-slate-100 hidden md:block">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width: `${((currentStepNum - 1) / (steps.length - 1)) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Steps Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-2 relative">
                    {steps.map((st, i) => {
                      const StepIcon = st.icon;
                      const stepIndex = i + 1;
                      const isCompleted = currentStepNum >= stepIndex;
                      const isCurrent = currentStepNum === stepIndex;

                      return (
                        <div
                          key={st.key}
                          className="flex md:flex-col items-start md:items-center text-left md:text-center group"
                        >
                          {/* Circle wrapper */}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition z-10 ${
                              isCompleted
                                ? "bg-primary border-primary text-white shadow-md shadow-primary/25"
                                : "bg-white border-slate-200 text-slate-400"
                            } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                          >
                            <StepIcon className="h-4.5 w-4.5" />
                          </div>

                          {/* Labels */}
                          <div className="ml-4 md:ml-0 md:mt-3">
                            <p
                              className={`text-xs font-bold ${isCompleted ? "text-slate-900" : "text-slate-400"}`}
                            >
                              {st.label}
                            </p>
                            <span className="text-[10px] text-slate-500 mt-0.5 block max-w-[140px] leading-tight md:mx-auto">
                              {ORDER_STATUS_META[st.key as keyof typeof ORDER_STATUS_META]?.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Tracking & Carrier Info */}
            {order.tracking_number && (
              <div className="mx-6 mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-md">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Tracking Information
                    </h4>
                    <p className="font-mono text-sm font-semibold text-slate-800 mt-0.5">
                      {order.tracking_number}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(order.tracking_number!)}
                  className="h-8 text-xs font-medium bg-white text-slate-700 hover:text-primary gap-1.5"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copy tracking
                </Button>
              </div>
            )}

            {/* Grid of details */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Delivery Details */}
              <div className="bg-white p-4 rounded-lg border border-slate-200/50 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  Shipment Details
                </h4>

                <div className="grid grid-cols-2 gap-y-3.5 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block">Order Date</span>
                    <span className="font-medium text-slate-700 mt-0.5 block">
                      {new Date(order.created_at).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Expected Delivery</span>
                    <span className="font-semibold text-primary mt-0.5 block">
                      {formatDeliveryDate(order.expected_delivery_at, order.delivery_method)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Delivery Method</span>
                    <span className="font-medium text-slate-700 capitalize mt-0.5 block">
                      {order.delivery_method} Shipping
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Payment Mode</span>
                    <span className="font-medium text-slate-700 uppercase mt-0.5 block">
                      {order.payment_method === "cod"
                        ? "Cash On Delivery (COD)"
                        : order.payment_method}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block font-semibold">Shipping Address</span>
                    <span className="text-slate-600 block leading-relaxed mt-0.5">
                      {order.customer_name} · {order.phone}
                    </span>
                    <span className="text-slate-500 block leading-tight mt-0.5">
                      {formatAddressBlock(order).join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="bg-white p-4 rounded-lg border border-slate-200/50 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 mb-3">
                    <Package className="h-4 w-4 text-slate-500" />
                    Items Ordered ({order.items?.length || 0})
                  </h4>

                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                    {order.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-2.5 items-center justify-between text-xs sm:text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{item.title}</p>
                          <p className="text-slate-400 text-[11px]">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-mono font-medium text-slate-700 shrink-0">
                          PKR {(item.price_pkr * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono">
                      PKR {(order.subtotal_pkr || 0).toLocaleString()}
                    </span>
                  </div>
                  {order.discount_pkr ? (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount ({order.voucher_code})</span>
                      <span className="font-mono">-PKR {order.discount_pkr.toLocaleString()}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-mono">
                      PKR {(order.shipping_pkr || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold text-sm sm:text-base border-t border-dashed pt-2 mt-2">
                    <span>Total Amount</span>
                    <span className="font-mono text-primary">
                      PKR {(order.total_pkr || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400">Need help? Dial 0332-3059259</span>
              <Button size="sm" onClick={() => onOpenChange(false)} className="h-8">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
