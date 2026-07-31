import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCheckoutConfig, fetchSiteSettings, updateSiteSetting } from "@/api/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DashboardPageHeader, SectionCard } from "@/components/site/PageLayout";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import type { DeliveryMethod, PaymentMethod } from "@/types/commerce";
import { CreditCard, Percent, Truck, Image as ImageIcon, Sparkles } from "lucide-react";
import { ImageOptimizerUploader } from "@/components/ui/ImageOptimizerUploader";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function AdminSettings() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["site-settings"], queryFn: fetchSiteSettings });
  const { data: checkout } = useQuery({
    queryKey: ["checkout-config"],
    queryFn: fetchCheckoutConfig,
  });

  const [meta, setMeta] = useState({
    site_name: "NexusIoT",
    contact_email: "",
    contact_phone: "",
    tax_rate_pct: "17",
    tax_label: "Sales Tax (GST)",
    free_shipping_min_pkr: "15000",
    cod_handling_fee_pkr: "0",
  });
  const [siteLogo, setSiteLogo] = useState("");
  const [heroBanner, setHeroBanner] = useState("");
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [delivery, setDelivery] = useState<DeliveryMethod[]>([]);

  useEffect(() => {
    if (!settings && !checkout) return;
    setMeta({
      site_name: String(settings?.site_name ?? "NexusIoT").replace(/"/g, ""),
      contact_email: String(settings?.contact_email ?? "").replace(/"/g, ""),
      contact_phone: String(settings?.contact_phone ?? "").replace(/"/g, ""),
      tax_rate_pct: String(checkout?.tax_rate_pct ?? settings?.tax_rate_pct ?? 17),
      tax_label: checkout?.tax_label ?? "Sales Tax (GST)",
      free_shipping_min_pkr: String(checkout?.free_shipping_min_pkr ?? 15000),
      cod_handling_fee_pkr: String(checkout?.cod_handling_fee_pkr ?? 0),
    });
    if (checkout?.payment_methods) setPayments(checkout.payment_methods);
    if (checkout?.delivery_methods) setDelivery(checkout.delivery_methods);
  }, [settings, checkout]);

  const saveMeta = async () => {
    try {
      await updateSiteSetting("site_name", JSON.stringify(meta.site_name));
      await updateSiteSetting("contact_email", JSON.stringify(meta.contact_email));
      await updateSiteSetting("contact_phone", JSON.stringify(meta.contact_phone));
      await updateSiteSetting("tax_rate_pct", meta.tax_rate_pct);
      await updateSiteSetting("tax_label", JSON.stringify(meta.tax_label));
      await updateSiteSetting("free_shipping_min_pkr", meta.free_shipping_min_pkr);
      await updateSiteSetting("cod_handling_fee_pkr", meta.cod_handling_fee_pkr);
      toast.success("Checkout & tax settings saved");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["checkout-config"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const savePayments = async () => {
    try {
      await updateSiteSetting("payment_methods", payments);
      toast.success("Payment methods updated");
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      qc.invalidateQueries({ queryKey: ["checkout-config"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const saveDelivery = async () => {
    try {
      await updateSiteSetting("delivery_methods", delivery);
      toast.success("Delivery options updated");
      qc.invalidateQueries({ queryKey: ["checkout-config"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const patchPayment = (id: string, patch: Partial<PaymentMethod>) => {
    setPayments((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const patchDelivery = (id: string, patch: Partial<DeliveryMethod>) => {
    setDelivery((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <DashboardPageHeader
        title="Site & checkout configuration"
        description="Payment methods, delivery charges, tax, and storefront contact details."
      />

      <SectionCard title="General">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Site name</Label>
            <Input
              className="mt-1.5"
              value={meta.site_name}
              onChange={(e) => setMeta({ ...meta, site_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Contact email</Label>
            <Input
              className="mt-1.5"
              value={meta.contact_email}
              onChange={(e) => setMeta({ ...meta, contact_email: e.target.value })}
            />
          </div>
          <div>
            <Label>Contact phone</Label>
            <Input
              className="mt-1.5"
              value={meta.contact_phone}
              onChange={(e) => setMeta({ ...meta, contact_phone: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={saveMeta} className="mt-4">
          Save general
        </Button>
      </SectionCard>

      <SectionCard title="Media & Image CDN Optimization">
        <div className="space-y-4">
          <ImageOptimizerUploader
            value={siteLogo}
            onChange={setSiteLogo}
            label="Super Admin / Marketplace Branding Logo"
            description="Upload main site logo. Auto-converts to WebP with native lazy loading."
            maxWidth={500}
            maxHeight={500}
          />
          <ImageOptimizerUploader
            value={heroBanner}
            onChange={setHeroBanner}
            label="Home Page Hero Banner"
            description="Upload hero banner image. Compressed before upload for fast page load."
            maxWidth={1920}
            maxHeight={900}
          />
        </div>
        <Button onClick={saveMeta} className="mt-4">
          Save Media Assets
        </Button>
      </SectionCard>

      <SectionCard title="Tax & free delivery">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Percent className="h-3.5 w-3.5" /> Tax rate (%)
            </Label>
            <Input
              type="number"
              className="mt-1.5"
              value={meta.tax_rate_pct}
              onChange={(e) => setMeta({ ...meta, tax_rate_pct: e.target.value })}
            />
          </div>
          <div>
            <Label>Tax label (shown at checkout)</Label>
            <Input
              className="mt-1.5"
              value={meta.tax_label}
              onChange={(e) => setMeta({ ...meta, tax_label: e.target.value })}
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5" /> Free delivery above (PKR)
            </Label>
            <Input
              type="number"
              className="mt-1.5"
              value={meta.free_shipping_min_pkr}
              onChange={(e) => setMeta({ ...meta, free_shipping_min_pkr: e.target.value })}
            />
          </div>
          <div>
            <Label>COD handling fee (PKR)</Label>
            <Input
              type="number"
              className="mt-1.5"
              value={meta.cod_handling_fee_pkr}
              onChange={(e) => setMeta({ ...meta, cod_handling_fee_pkr: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={saveMeta} className="mt-4">
          Save tax & shipping rules
        </Button>
      </SectionCard>

      <SectionCard title="Payment methods">
        <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          EasyPaisa, JazzCash, bank transfer, card, and cash on delivery.
        </p>
        <div className="space-y-4">
          {payments.map((p) => (
            <div key={p.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.label}</span>
                <Switch
                  checked={p.enabled}
                  onCheckedChange={(v) => patchPayment(p.id, { enabled: v })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs">Flat fee (PKR)</Label>
                  <Input
                    type="number"
                    className="mt-1 h-9"
                    value={p.fee_pkr ?? 0}
                    onChange={(e) => patchPayment(p.id, { fee_pkr: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fee % of subtotal</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="mt-1 h-9"
                    value={p.fee_pct ?? 0}
                    onChange={(e) => patchPayment(p.id, { fee_pct: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={savePayments} className="mt-4">
          Save payment methods
        </Button>
      </SectionCard>

      <SectionCard title="Delivery options">
        <div className="space-y-4">
          {delivery.map((d) => (
            <div key={d.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{d.label}</span>
                <Switch
                  checked={d.enabled}
                  onCheckedChange={(v) => patchDelivery(d.id, { enabled: v })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Charge (PKR)</Label>
                  <Input
                    type="number"
                    className="mt-1 h-9"
                    value={d.charge_pkr}
                    onChange={(e) => patchDelivery(d.id, { charge_pkr: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">ETA text</Label>
                  <Input
                    className="mt-1 h-9"
                    value={d.eta ?? ""}
                    onChange={(e) => patchDelivery(d.id, { eta: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={saveDelivery} className="mt-4">
          Save delivery options
        </Button>
      </SectionCard>
    </div>
  );
}
