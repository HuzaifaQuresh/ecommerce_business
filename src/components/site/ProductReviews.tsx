import { useState, useEffect } from "react";
import { Star, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitProductReview } from "@/api/reviews";
import { useAuth } from "@/hooks/useAuth";
import type { ProductReview } from "@/types/commerce";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

function initials(name?: string) {
  if (!name || typeof name !== "string") return "U";
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ProductReviews({
  productId,
  avgRating = 4.8,
  reviews = [],
}: {
  productId?: string;
  avgRating?: number;
  reviews?: ProductReview[];
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const list = reviews;
  const computedAvg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : avgRating;
  const total = list.length;
  const dist = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: list.filter((r) => r.rating === s).length,
  }));

  const [form, setForm] = useState({ name: "", rating: 5, body: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((prev) => {
        if (!prev.name) {
          const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
          return { ...prev, name };
        }
        return prev;
      });
    }
  }, [user]);

  const onSubmit = async () => {
    if (!productId || !form.name.trim() || !form.body.trim()) {
      toast.error("Name and review required");
      return;
    }
    setSubmitting(true);
    try {
      await submitProductReview({
        product_id: productId,
        customer_name: form.name.trim(),
        rating: form.rating,
        body: form.body.trim(),
        user_id: user?.id || null,
      });
      toast.success("Review submitted");
      setForm({
        name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "",
        rating: 5,
        body: "",
      });
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12 rounded-xl border bg-card p-4 sm:p-6">
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pb-8 border-b">
        <div className="text-center md:border-r md:pr-8">
          <div className="text-5xl font-bold text-primary">{computedAvg.toFixed(1)}</div>
          <div className="flex justify-center gap-0.5 mt-2 text-amber-500">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i <= Math.round(computedAvg) ? "fill-current" : ""}`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">Based on {total} reviews</div>
        </div>
        <div className="md:col-span-2 space-y-2">
          {dist.map(({ star, count }) => {
            const pct = total ? (count / total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-12 text-muted-foreground">{star} star</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {list.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center py-10 text-center text-muted-foreground border rounded-xl bg-muted/20">
          <Star className="h-10 w-10 mb-3 text-muted-foreground/30" />
          <p className="font-medium text-foreground">No reviews yet</p>
          <p className="text-sm mt-1">Be the first to leave a review for this product.</p>
        </div>
      )}
      <div className="mt-6 space-y-5">
        {list.map((r) => (
          <div key={r.id} className="flex gap-4 pb-5 border-b last:border-b-0">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {initials(r.customer_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{r.customer_name}</span>
                {r.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    <BadgeCheck className="h-3 w-3" /> Verified Buyer
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDate(r.created_at)}
                </span>
              </div>
              <div className="flex gap-0.5 mt-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-current" : "text-muted"}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.body}</p>
            </div>
          </div>
        ))}
      </div>

      {productId && (
        <div className="mt-8 pt-6 border-t space-y-3">
          <h3 className="font-semibold">Write a review</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Your name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Rating</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label>Review</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      )}
    </section>
  );
}
