import { useQuery } from "@tanstack/react-query";
import { fetchCheckoutConfig, fetchPaymentMethods, fetchSiteSettings } from "@/api/settings";

export function useSiteSettings() {
  return useQuery({ queryKey: ["site-settings"], queryFn: fetchSiteSettings, staleTime: 0 });
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
