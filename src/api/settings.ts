import { supabase } from "@/integrations/supabase/client";
import { MOCK_DELIVERY_METHODS, MOCK_PAYMENT_METHODS, MOCK_SITE_SETTINGS } from "@/lib/mock-data";
import { DEFAULT_CHECKOUT_CONFIG, parseJsonSetting } from "@/lib/checkout-totals";
import type { CheckoutConfig, DeliveryMethod, PaymentMethod } from "@/types/commerce";

function numSetting(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  const n = Number(String(value).replace(/"/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

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

export async function fetchSiteSettings() {
  try {
    const { data, error } = await withTimeout(supabase.from("site_settings").select("key,value"));
    if (error) throw error;
    if (data?.length) {
      const map: Record<string, unknown> = {};
      for (const row of data) map[row.key] = row.value;
      return map;
    }
  } catch {
    /* demo */
  }
  return { ...MOCK_SITE_SETTINGS };
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
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value: value as never, updated_at: new Date().toISOString() });
  if (error) throw error;
}
