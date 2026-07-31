import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DashboardPageHeader, SectionCard, EmptyState } from "@/components/site/PageLayout";
import { RoleBadge } from "@/components/dashboard/RoleBadge";
import { slugifyShop } from "@/lib/roles";
import { toast } from "sonner";
import { Store } from "lucide-react";
import { useState } from "react";
import { ImageOptimizerUploader } from "@/components/ui/ImageOptimizerUploader";

export const Route = createFileRoute("/vendor/settings")({ component: VendorSettings });

function VendorSettings() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { vendorId } = Route.useRouteContext();
  const [active, setActive] = useState(true);
  const [shopLogo, setShopLogo] = useState<string>("");
  const [shopBanner, setShopBanner] = useState<string>("");

  const { data: vendor, refetch } = useQuery({
    queryKey: ["vendor-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setActive(data.is_active);
        if (data.logo_url) setShopLogo(data.logo_url);
        if (data.banner_url) setShopBanner(data.banner_url);
      }
      return data;
    },
  });

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vendor) return;
    const fd = new FormData(e.currentTarget);
    const shop_name = String(fd.get("shop_name")).trim();
    const { error } = await supabase
      .from("vendors")
      .update({
        shop_name,
        slug: slugifyShop(shop_name),
        commission_pct: Number(fd.get("commission")),
        is_active: active,
      })
      .eq("id", vendor.id);
    if (error) return toast.error(error.message);
    toast.success("Shop profile saved");
    refetch();
    qc.invalidateQueries({ queryKey: ["vendor-stats"] });
  };

  if (!vendor && !vendorId) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader
          title="Shop profile"
          description="Your account does not have a vendor record yet."
        />
        <EmptyState
          icon={Store}
          title="Vendor shop not linked"
          description="Ask a super admin to assign you the vendor role in Admin → Users & Roles. A shop record is created automatically."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Shop profile"
        description="Manage how your vendor storefront appears in the platform."
        actions={<RoleBadge role="vendor" />}
      />

      <SectionCard>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="sm:col-span-2 space-y-4">
            <ImageOptimizerUploader
              value={shopLogo}
              onChange={setShopLogo}
              label="Store Logo (Next-Gen Upload)"
              description="Upload vendor store logo. Automatically converted to compressed WebP."
              maxWidth={600}
              maxHeight={600}
            />
            <ImageOptimizerUploader
              value={shopBanner}
              onChange={setShopBanner}
              label="Storefront Cover Banner"
              description="Upload high-res store cover banner. Optimized for fast lazy-loading."
              maxWidth={1920}
              maxHeight={800}
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Shop name</Label>
            <Input
              name="shop_name"
              defaultValue={vendor?.shop_name ?? ""}
              className="mt-1.5"
              required
            />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={vendor?.slug ?? ""} disabled className="mt-1.5 font-mono text-sm" />
          </div>
          <div>
            <Label>Commission %</Label>
            <Input
              name="commission"
              type="number"
              step="0.1"
              defaultValue={vendor?.commission_pct ?? 10}
              disabled={!isSuperAdmin}
              className="mt-1.5"
            />
            {!isSuperAdmin && (
              <p className="text-xs text-muted-foreground mt-1">
                Contact super admin to change commission.
              </p>
            )}
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Switch
              checked={active}
              onCheckedChange={setActive}
              disabled={!isSuperAdmin && !isAdmin}
            />
            <Label>Shop active on marketplace</Label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="min-h-[44px]">
              Save shop profile
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
