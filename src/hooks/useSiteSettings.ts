import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCheckoutConfig,
  fetchPaymentMethods,
  fetchSiteSettings,
  SITE_SETTINGS_QUERY_KEY,
  SITE_SETTINGS_STALE_MS,
} from "@/api/settings";

export function useSiteSettings() {
  const qc = useQueryClient();
  useEffect(() => {
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEY });
    };
    window.addEventListener("nexus-settings-update", refresh);
    return () => window.removeEventListener("nexus-settings-update", refresh);
  }, [qc]);
  return useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: fetchSiteSettings,
    staleTime: SITE_SETTINGS_STALE_MS,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: fetchPaymentMethods,
    staleTime: 0,
  });
}

export function useCheckoutConfig() {
  return useQuery({
    queryKey: ["checkout-config"],
    queryFn: fetchCheckoutConfig,
    staleTime: 0,
  });
}
