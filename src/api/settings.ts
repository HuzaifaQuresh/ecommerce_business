import { supabase } from "@/integrations/supabase/client";
import { MOCK_DELIVERY_METHODS, MOCK_PAYMENT_METHODS, MOCK_SITE_SETTINGS } from "@/lib/mock-data";
import { DEFAULT_CHECKOUT_CONFIG, parseJsonSetting } from "@/lib/checkout-totals";
import { sanitizeSiteSettings } from "@/lib/sanitize-settings";
import { materializeDataUrisInValue } from "@/lib/upload-image";
import type { CheckoutConfig, DeliveryMethod, PaymentMethod } from "@/types/commerce";

function numSetting(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  const n = Number(String(value).replace(/"/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function withTimeout<T>(promise: PromiseLike<T>, ms = 12000): Promise<T> {
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

export const SITE_SETTINGS_QUERY_KEY = ["site-settings"] as const;
export const SITE_SETTINGS_STALE_MS = 60_000;

export async function fetchSiteSettings() {
  try {
    const { data, error } = await withTimeout(
      supabase.from("site_settings").select("key,value"),
      2500,
    );
    if (error) throw error;
    if (data?.length) {
      const map: Record<string, unknown> = {};
      for (const row of data) map[row.key] = row.value;
      return sanitizeSiteSettings(map);
    }
  } catch {
    /* demo */
  }
  return sanitizeSiteSettings({ ...MOCK_SITE_SETTINGS });
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const cfg = await fetchCheckoutConfig();
  return cfg.payment_methods;
}

export async function fetchDeliveryMethods(): Promise<DeliveryMethod[]> {
  const cfg = await fetchCheckoutConfig();
  return cfg.delivery_methods;
}

export async function fetchCheckoutConfig(): Promise<CheckoutConfig> {
  try {
    const settings = await fetchSiteSettings();
    const payments = parseJsonSetting<PaymentMethod[]>(
      settings.payment_methods,
      MOCK_PAYMENT_METHODS,
    );
    const delivery = parseJsonSetting<DeliveryMethod[]>(
      settings.delivery_methods,
      MOCK_DELIVERY_METHODS,
    );
    if (payments.length || delivery.length) {
      return {
        tax_rate_pct: numSetting(settings.tax_rate_pct, DEFAULT_CHECKOUT_CONFIG.tax_rate_pct),
        tax_label: String(settings.tax_label ?? DEFAULT_CHECKOUT_CONFIG.tax_label).replace(
          /"/g,
          "",
        ),
        free_shipping_min_pkr: numSetting(
          settings.free_shipping_min_pkr,
          DEFAULT_CHECKOUT_CONFIG.free_shipping_min_pkr,
        ),
        cod_handling_fee_pkr: numSetting(settings.cod_handling_fee_pkr, 0),
        payment_methods: payments.length ? payments : MOCK_PAYMENT_METHODS,
        delivery_methods: delivery.length ? delivery : MOCK_DELIVERY_METHODS,
      };
    }
  } catch {
    /* demo */
  }
  return {
    ...DEFAULT_CHECKOUT_CONFIG,
    payment_methods: MOCK_PAYMENT_METHODS,
    delivery_methods: MOCK_DELIVERY_METHODS,
  };
}

export async function updateSiteSetting(key: string, value: unknown) {
  // Convert any leftover base64/data-URI images to CDN URLs before persist.
  let nextValue = value;
  try {
    nextValue = await materializeDataUrisInValue(value);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image upload failed";
    if (/sign in|session expired/i.test(message)) {
      throw new Error(message);
    }
    if (/exp["']?\s*claim|timestamp check failed|jwt expired/i.test(message)) {
      throw new Error("Session expired. Sign in again, then re-upload the image and save.");
    }
    throw new Error(`${message}. Re-upload the image via the picker, then save again.`);
  }

  const serialized = typeof nextValue === "string" ? nextValue : JSON.stringify(nextValue ?? null);
  if (/data:image\/[a-z0-9+.-]+;base64,/i.test(serialized)) {
    throw new Error(
      "Image must be a CDN URL (upload via the image picker). Base64 images are not saved.",
    );
  }
  if (serialized.length > 400_000) {
    throw new Error("Setting payload is too large. Use shorter text or CDN image URLs.");
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value: nextValue as never, updated_at: new Date().toISOString() });
  if (error) throw error;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("nexus-settings-update"));
  }
}
