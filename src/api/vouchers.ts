import { supabase } from "@/integrations/supabase/client";
import { MOCK_VOUCHERS } from "@/lib/mock-data";
import type { Voucher } from "@/types/commerce";

function withTimeout<T>(promise: Promise<T>, ms = 800): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout of ${ms}ms exceeded`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export async function fetchActiveVouchers() {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("vouchers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    );
    if (error) throw error;
    if (data?.length) return data as Voucher[];
  } catch {
    /* demo */
  }
  return MOCK_VOUCHERS.filter((v) => v.is_active);
}

function applyVoucher(
  v: Voucher,
  subtotal: number,
): { ok: true; discount: number; voucher: Voucher } | { ok: false; message: string } {
  if (v.expires_at && new Date(v.expires_at) < new Date())
    return { ok: false, message: "Voucher expired" };
  if (v.max_uses != null && v.used_count >= v.max_uses)
    return { ok: false, message: "Voucher fully redeemed" };
  if (subtotal < Number(v.min_order_pkr)) {
    return {
      ok: false,
      message: `Minimum order ${Number(v.min_order_pkr).toLocaleString()} PKR required`,
    };
  }
  let discount = Number(v.discount_flat_pkr);
  if (v.discount_pct > 0)
    discount = Math.max(discount, Math.round(subtotal * (v.discount_pct / 100)));
  return { ok: true, discount, voucher: v };
}

export async function validateVoucher(
  code: string,
  subtotal: number,
): Promise<{ ok: true; discount: number; voucher: Voucher } | { ok: false; message: string }> {
  const normalized = code.toUpperCase().trim();
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("vouchers")
        .select("*")
        .eq("code", normalized)
        .eq("is_active", true)
        .maybeSingle(),
    );
    if (error) throw error;
    if (data) return applyVoucher(data as Voucher, subtotal);
  } catch {
    /* demo */
  }
  const mock = MOCK_VOUCHERS.find((v) => v.code === normalized && v.is_active);
  if (!mock) return { ok: false, message: "Invalid voucher code" };
  return applyVoucher(mock, subtotal);
}

export function calcVoucherDiscount(v: Voucher, subtotal: number) {
  let discount = Number(v.discount_flat_pkr);
  if (v.discount_pct > 0)
    discount = Math.max(discount, Math.round(subtotal * (v.discount_pct / 100)));
  return discount;
}
