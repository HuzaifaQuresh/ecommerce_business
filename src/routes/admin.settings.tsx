import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCheckoutConfig, fetchSiteSettings, updateSiteSetting } from "@/api/settings";
import { fetchProducts } from "@/api/products";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DashboardPageHeader, SectionCard } from "@/components/site/PageLayout";
import { CompactMerchImage } from "@/components/ui/CompactMerchImage";
import { toast } from "sonner";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { DeliveryMethod, PaymentMethod } from "@/types/commerce";
import { CreditCard, ChevronDown, ChevronUp, Percent, Plus, Trash2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageOptimizerUploader } from "@/components/ui/ImageOptimizerUploader";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_OFFICE_ADDRESS,
  SOCIAL_KEYS,
  SOCIAL_LABELS,
  normalizeHttpUrl,
  officeAddressFromSettings,
  socialLinksFromSettings,
} from "@/lib/storefront-contact";
import {
  HOME_SHOP_CATEGORIES_KEY,
  HOME_TOP_BRANDS_KEY,
  brandInitials,
  catalogImageByBrand,
  catalogImageByCategory,
  defaultShopCategoryOverrides,
  defaultTopBrandOverrides,
  mergeSwstShopCategories,
  parseMerchOverrides,
  type ShopByCategoryOverride,
  type TopBrandOverride,
} from "@/lib/home-showcase";
import {
  HOME_HERO_SLIDES_KEY,
  defaultHeroSlides,
  emptyHeroSlide,
  resolveHeroSlides,
  type HomeHeroSlide,
} from "@/lib/home-banners";
import {
  HOME_PROMO_BANNERS_KEY,
  HOME_SOLUTIONS_KEY,
  defaultHomeSolutions,
  defaultPromoPair,
  emptyHomeSolution,
  emptyPromoSlide,
  clampDelaySec,
  resolveHomeSolutions,
  resolvePromoPair,
  type PromoSlide,
} from "@/lib/home-rotators";
import {
  IOT_PAGE_BANDS_KEY,
  defaultIotPageBands,
  emptyIotPageBand,
  resolveIotPageBands,
} from "@/lib/iot-page-bands";

function BannerTextToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
      <div>
        <p className="text-xs font-semibold">Hide text</p>
        <p className="text-[11px] text-muted-foreground">ON = image only. OFF = title, copy &amp; buttons.</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function PromoSlotEditor({
  title,
  slides,
  onChange,
}: {
  title: string;
  slides: PromoSlide[];
  onChange: (next: PromoSlide[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      {slides.map((slide, index) => (
        <div key={`${title}-${index}`} className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Image {index + 1}</span>
            <DeleteMerchRowButton
              label={`Delete ${title} image ${index + 1}`}
              onClick={() => onChange(slides.filter((_, i) => i !== index))}
            />
          </div>
          <CompactMerchImage
            wide
            size={72}
            maxWidth={1600}
            maxHeight={900}
            value={slide.image_url}
            onChange={(url) =>
              onChange(slides.map((row, i) => (i === index ? { ...row, image_url: url } : row)))
            }
          />
          <div className="grid sm:grid-cols-2 gap-2">
            <Input
              className="h-9"
              placeholder="Title"
              value={slide.title}
              onChange={(e) =>
                onChange(slides.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)))
              }
            />
            <Input
              className="h-9"
              placeholder="/products"
              value={slide.link}
              onChange={(e) =>
                onChange(slides.map((row, i) => (i === index ? { ...row, link: e.target.value } : row)))
              }
            />
            <Input
              className="h-9 sm:col-span-2"
              placeholder="SHOP NOW"
              value={slide.button_text}
              onChange={(e) =>
                onChange(
                  slides.map((row, i) => (i === index ? { ...row, button_text: e.target.value } : row)),
                )
              }
            />
          </div>
          <BannerTextToggle
            checked={slide.hide_text}
            onCheckedChange={(hide_text) =>
              onChange(slides.map((row, i) => (i === index ? { ...row, hide_text } : row)))
            }
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...slides, emptyPromoSlide()])}
      >
        <Plus className="h-4 w-4 mr-1.5" /> Add image
      </Button>
    </div>
  );
}

function DeleteMerchRowButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      aria-label={label}
      onClick={onClick}
    >
      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
      Delete
    </Button>
  );
}

function SettingsJumpNav() {
  const items = [
    { id: "settings-store", label: "Store" },
    { id: "settings-homepage", label: "Homepage" },
    { id: "settings-iot", label: "IoT Solutions page" },
    { id: "settings-checkout", label: "Checkout" },
  ];
  return (
    <nav className="sticky top-0 z-20 flex flex-wrap gap-2 rounded-xl border bg-card/95 p-2 shadow-sm backdrop-blur">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="rounded-lg border bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:border-[#FF7A00]/40 hover:text-[#0B192C]"
          onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function SettingsGroup({
  id,
  kicker,
  title,
  livePath,
  tone = "neutral",
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  livePath: string;
  tone?: "neutral" | "home" | "iot";
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn(
        "scroll-mt-8 space-y-4 rounded-2xl border-2 p-3 sm:p-5",
        tone === "home" && "border-[#FF7A00]/35 bg-[#FF7A00]/[0.04]",
        tone === "iot" && "border-[#0052B4]/35 bg-[#0052B4]/[0.04]",
        tone === "neutral" && "border-slate-200 bg-slate-50/50",
      )}
    >
      <div className="border-b border-black/5 pb-3">
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            tone === "iot" ? "text-[#0052B4]" : "text-[#FF7A00]",
          )}
        >
          {kicker}
        </p>
        <h2 className="mt-1 text-xl font-black text-[#0B192C]">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Controls this live page:{" "}
          <span className="font-mono font-semibold text-foreground">{livePath}</span>
        </p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function AdminSettings() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["site-settings"], queryFn: fetchSiteSettings });
  const { data: checkout } = useQuery({
    queryKey: ["checkout-config"],
    queryFn: fetchCheckoutConfig,
  });

  const [meta, setMeta] = useState({
    site_name: "SmartZone",
    contact_email: "info@smartzone.pk",
    contact_phone: "",
    office_address: DEFAULT_OFFICE_ADDRESS,
    office_maps_url: "",
    social_facebook: "",
    social_instagram: "",
    social_linkedin: "",
    social_youtube: "",
    social_twitter: "",
    whatsapp_number: "",
    whatsapp_message: "Hello SmartZone Team",
    whatsapp_enabled: true,
    tax_rate_pct: "17",
    tax_label: "Sales Tax (GST)",
    free_shipping_min_pkr: "15000",
    cod_handling_fee_pkr: "0",
    google_analytics_id: "",
  });
  const [siteLogo, setSiteLogo] = useState("");
  const [heroSlides, setHeroSlides] = useState<HomeHeroSlide[]>(defaultHeroSlides);
  const [promoPair, setPromoPair] = useState(defaultPromoPair);
  const [homeSolutions, setHomeSolutions] = useState(defaultHomeSolutions);
  const [iotPageBands, setIotPageBands] = useState(defaultIotPageBands);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [delivery, setDelivery] = useState<DeliveryMethod[]>([]);
  const [homeCategories, setHomeCategories] = useState<ShopByCategoryOverride[]>(
    defaultShopCategoryOverrides,
  );
  const [homeBrands, setHomeBrands] = useState<TopBrandOverride[]>(defaultTopBrandOverrides);

  const { data: catalogProducts } = useQuery({
    queryKey: ["all-products"],
    queryFn: fetchProducts,
  });
  const categoryFallbacks = useMemo(
    () => catalogImageByCategory(catalogProducts ?? []),
    [catalogProducts],
  );
  const brandFallbacks = useMemo(
    () => catalogImageByBrand(catalogProducts ?? []),
    [catalogProducts],
  );

  useEffect(() => {
    if (!settings && !checkout) return;
    const social = socialLinksFromSettings(settings);
    setMeta({
      site_name: String(settings?.site_name ?? "SmartZone").replace(/"/g, ""),
      contact_email: String(settings?.contact_email ?? "").replace(/"/g, ""),
      contact_phone: String(settings?.contact_phone ?? "").replace(/"/g, ""),
      office_address: officeAddressFromSettings(settings),
      office_maps_url: String(settings?.office_maps_url ?? "")
        .replace(/^"+|"+$/g, "")
        .trim(),
      social_facebook: social.facebook,
      social_instagram: social.instagram,
      social_linkedin: social.linkedin,
      social_youtube: social.youtube,
      social_twitter: social.twitter,
      whatsapp_number: String(
        settings?.whatsapp_number ?? settings?.contact_phone ?? "",
      ).replace(/"/g, ""),
      whatsapp_message: String(settings?.whatsapp_message ?? "Hello SmartZone Team").replace(
        /"/g,
        "",
      ),
      whatsapp_enabled: String(settings?.whatsapp_enabled ?? "true").replace(/"/g, "") !== "false",
      tax_rate_pct: String(checkout?.tax_rate_pct ?? settings?.tax_rate_pct ?? 17),
      tax_label: String(checkout?.tax_label ?? settings?.tax_label ?? "Sales Tax (GST)").replace(
        /"/g,
        "",
      ),
      free_shipping_min_pkr: String(checkout?.free_shipping_min_pkr ?? 15000),
      cod_handling_fee_pkr: String(checkout?.cod_handling_fee_pkr ?? 0),
      google_analytics_id: String(settings?.google_analytics_id ?? "")
        .replace(/^"+|"+$/g, "")
        .trim(),
    });
    if (settings?.site_logo) setSiteLogo(String(settings.site_logo).replace(/"/g, ""));
    if (checkout?.payment_methods) setPayments(checkout.payment_methods);
    if (checkout?.delivery_methods) setDelivery(checkout.delivery_methods);

    setHeroSlides(resolveHeroSlides(settings));
    setPromoPair(resolvePromoPair(settings));
    setHomeSolutions(resolveHomeSolutions(settings));
    setIotPageBands(resolveIotPageBands(settings));

    setHomeCategories(
      parseMerchOverrides<ShopByCategoryOverride>(settings?.home_shop_categories) ??
        defaultShopCategoryOverrides(),
    );
    setHomeBrands(
      parseMerchOverrides<TopBrandOverride>(settings?.home_top_brands) ?? defaultTopBrandOverrides(),
    );
  }, [settings, checkout]);

  const saveMeta = async () => {
    try {
      await updateSiteSetting("site_name", JSON.stringify(meta.site_name));
      await updateSiteSetting("contact_email", JSON.stringify(meta.contact_email));
      await updateSiteSetting("contact_phone", JSON.stringify(meta.contact_phone));
      await updateSiteSetting("social_links", {
        facebook: normalizeHttpUrl(meta.social_facebook),
        instagram: normalizeHttpUrl(meta.social_instagram),
        linkedin: normalizeHttpUrl(meta.social_linkedin),
        youtube: normalizeHttpUrl(meta.social_youtube),
        twitter: normalizeHttpUrl(meta.social_twitter),
      });
      await updateSiteSetting("whatsapp_number", JSON.stringify(meta.whatsapp_number));
      await updateSiteSetting("whatsapp_message", JSON.stringify(meta.whatsapp_message));
      await updateSiteSetting("whatsapp_enabled", meta.whatsapp_enabled);
      await updateSiteSetting("tax_rate_pct", meta.tax_rate_pct);
      await updateSiteSetting("tax_label", JSON.stringify(meta.tax_label));
      await updateSiteSetting("free_shipping_min_pkr", meta.free_shipping_min_pkr);
      await updateSiteSetting("cod_handling_fee_pkr", meta.cod_handling_fee_pkr);
      if (siteLogo) await updateSiteSetting("site_logo", JSON.stringify(siteLogo));
      toast.success("Site & checkout settings saved successfully");
      await qc.refetchQueries({ queryKey: ["site-settings"] });
      await qc.refetchQueries({ queryKey: ["checkout-config"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveLocation = async () => {
    try {
      await updateSiteSetting("office_address", meta.office_address.trim());
      await updateSiteSetting("office_maps_url", normalizeHttpUrl(meta.office_maps_url));
      await updateSiteSetting(
        "google_analytics_id",
        JSON.stringify(meta.google_analytics_id.trim()),
      );
      toast.success("Store location updated on header, footer, and Contact Us");
      await qc.refetchQueries({ queryKey: ["site-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save location");
    }
  };

  const saveHomeHero = async () => {
    try {
      const slides = heroSlides.map((slide) => ({
        badge: slide.badge.trim(),
        title: slide.title.trim(),
        heading: slide.heading.trim(),
        desc: slide.desc.trim(),
        image_url: slide.image_url.trim(),
        button_text: slide.button_text.trim() || "SHOP NOW",
        link: slide.link.trim() || "/products",
        hide_text: Boolean(slide.hide_text),
      }));
      await updateSiteSetting(HOME_HERO_SLIDES_KEY, slides);
      await updateSiteSetting("hero_banner", slides[0]?.image_url || "");
      toast.success("Homepage banners saved — live storefront will update now");
      await qc.refetchQueries({ queryKey: ["site-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const savePromoPair = async () => {
    try {
      await updateSiteSetting(HOME_PROMO_BANNERS_KEY, {
        delay_sec: clampDelaySec(promoPair.delay_sec, 4),
        left: promoPair.left,
        right: promoPair.right,
      });
      toast.success("Category / hot-selling promo banners saved");
      await qc.refetchQueries({ queryKey: ["site-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveHomeSolutions = async () => {
    try {
      await updateSiteSetting(HOME_SOLUTIONS_KEY, {
        delay_sec: clampDelaySec(homeSolutions.delay_sec, 5),
        items: homeSolutions.items,
      });
      toast.success("Homepage solutions saved");
      await qc.refetchQueries({ queryKey: ["site-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveIotPageBands = async () => {
    try {
      await updateSiteSetting(IOT_PAGE_BANDS_KEY, {
        delay_sec: clampDelaySec(iotPageBands.delay_sec, 5),
        bands: iotPageBands.bands.map((band) => ({
          ...band,
          images: band.images.map((url) => url.trim()).filter(Boolean),
        })),
      });
      toast.success("IoT Solutions page bands saved");
      await qc.refetchQueries({ queryKey: ["site-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveHomeCategories = async () => {
    try {
      await updateSiteSetting(
        HOME_SHOP_CATEGORIES_KEY,
        homeCategories.map((item) => ({
          label: item.label.trim(),
          category: item.category.trim(),
          image_url: item.image_url?.trim() || "",
        })),
      );
      toast.success("Homepage categories saved");
      await qc.refetchQueries({ queryKey: ["site-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveHomeBrands = async () => {
    try {
      await updateSiteSetting(
        HOME_TOP_BRANDS_KEY,
        homeBrands.map((item) => ({
          name: item.name.trim(),
          manufacturer: item.manufacturer.trim(),
          initials: item.initials?.trim() || brandInitials(item.name),
          image_url: item.image_url?.trim() || "",
        })),
      );
      toast.success("Homepage brands saved");
      await qc.refetchQueries({ queryKey: ["site-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const savePayments = async () => {
    try {
      await updateSiteSetting("payment_methods", payments);
      toast.success("Payment methods updated successfully");
      await qc.refetchQueries({ queryKey: ["payment-methods"] });
      await qc.refetchQueries({ queryKey: ["checkout-config"] });
      await qc.refetchQueries({ queryKey: ["site-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const saveDelivery = async () => {
    try {
      await updateSiteSetting("delivery_methods", delivery);
      toast.success("Delivery options updated successfully");
      await qc.refetchQueries({ queryKey: ["checkout-config"] });
      await qc.refetchQueries({ queryKey: ["site-settings"] });
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
    <div className="space-y-8 max-w-5xl">
      <DashboardPageHeader
        title="Site & checkout configuration"
        description="Jump to a group below. Homepage merch and the IoT Solutions page are separate — they do not share images."
      />

      <SettingsJumpNav />

      <SettingsGroup
        id="settings-store"
        kicker="Store"
        title="Contact, logo & WhatsApp"
        livePath="Header / footer (every page)"
      >
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
          <div className="sm:col-span-2">
            <Label>Google Analytics 4 ID</Label>
            <Input
              className="mt-1.5"
              placeholder="G-XXXXXXXXXX"
              value={meta.google_analytics_id}
              onChange={(e) => setMeta({ ...meta, google_analytics_id: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Optional. Saves to site settings and loads GA4 on the storefront (SEO audits / traffic).
            </p>
          </div>
        </div>
        <Button onClick={saveMeta} className="mt-4">
          Save general
        </Button>
      </SectionCard>

      <SectionCard title="Store location">
        <p className="text-sm text-muted-foreground mb-4">
          This is the address on the storefront header, footer, and Contact Us dialog. Save here to
          change it site-wide.
        </p>
        <div className="space-y-4">
          <div>
            <Label>Office address</Label>
            <Textarea
              className="mt-1.5 min-h-[88px]"
              value={meta.office_address}
              onChange={(e) => setMeta({ ...meta, office_address: e.target.value })}
              placeholder={DEFAULT_OFFICE_ADDRESS}
            />
          </div>
          <div>
            <Label>Google Maps URL (optional)</Label>
            <Input
              className="mt-1.5"
              inputMode="url"
              placeholder="https://maps.google.com/..."
              value={meta.office_maps_url}
              onChange={(e) => setMeta({ ...meta, office_maps_url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Leave empty to open a Google Maps search for the address above.
            </p>
          </div>
        </div>
        <Button onClick={() => void saveLocation()} className="mt-4 bg-[#0B192C] hover:bg-[#0F2C59]">
          Save location
        </Button>
      </SectionCard>

      <SectionCard title="Social media">
        <p className="text-sm text-muted-foreground mb-4">
          Icons appear in the header and footer only when a URL is saved. Leave a field empty to
          hide that network.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {SOCIAL_KEYS.map((key) => (
              <div key={key}>
                <Label>{SOCIAL_LABELS[key]} URL</Label>
                <Input
                  className="mt-1.5"
                  inputMode="url"
                  placeholder={`https://www.${key === "twitter" ? "x.com" : `${key}.com`}/smartzone`}
                  value={meta[`social_${key}`]}
                  onChange={(e) => setMeta({ ...meta, [`social_${key}`]: e.target.value })}
                />
              </div>
          ))}
        </div>
        <Button onClick={saveMeta} className="mt-4">
          Save social links
        </Button>
      </SectionCard>

      <SectionCard title="WhatsApp storefront button">
        <p className="text-sm text-muted-foreground mb-4">
          The green chat icon on the storefront uses this number. Change it here and it updates
          instantly for customers.
        </p>
        <div className="flex items-center justify-between rounded-lg border p-3 mb-4">
          <div>
            <p className="text-sm font-medium">Show WhatsApp button</p>
            <p className="text-xs text-muted-foreground">Hide it from the public store if off.</p>
          </div>
          <Switch
            checked={meta.whatsapp_enabled}
            onCheckedChange={(v) => setMeta({ ...meta, whatsapp_enabled: v })}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>WhatsApp number</Label>
            <Input
              className="mt-1.5"
              placeholder="+92 332 3059259"
              value={meta.whatsapp_number}
              onChange={(e) => setMeta({ ...meta, whatsapp_number: e.target.value })}
            />
          </div>
          <div>
            <Label>Default greeting</Label>
            <Input
              className="mt-1.5"
              value={meta.whatsapp_message}
              onChange={(e) => setMeta({ ...meta, whatsapp_message: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={saveMeta} className="mt-4">
          Save WhatsApp
        </Button>
      </SectionCard>

      <SectionCard title="Media & Image CDN Optimization">
        <ImageOptimizerUploader
          value={siteLogo}
          onChange={setSiteLogo}
          label="Super Admin / Marketplace Branding Logo"
          description="Upload main site logo. Auto-converts to WebP with native lazy loading."
          maxWidth={500}
          maxHeight={500}
        />
        <Button onClick={saveMeta} className="mt-4">
          Save logo
        </Button>
      </SectionCard>
      </SettingsGroup>

      <SettingsGroup
        id="settings-homepage"
        kicker="Homepage"
        title="smartzone.pk storefront"
        livePath="/"
        tone="home"
      >
      <SectionCard title="Hero banners">
        <p className="text-sm text-muted-foreground mb-4">
          These slides are exactly what customers see on smartzone.pk. Add multiple photos, edit
          copy, reorder, or delete. Empty image uses the navy gradient.
        </p>
        <div className="space-y-4">
          {heroSlides.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
              No banners. Add a slide below, or the homepage hero stays hidden.
            </p>
          ) : null}
          {heroSlides.map((slide, index) => (
            <div key={`hero-${index}`} className="rounded-lg border p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">Slide {index + 1}</p>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    disabled={index === 0}
                    aria-label="Move slide up"
                    onClick={() =>
                      setHeroSlides((list) => {
                        if (index === 0) return list;
                        const next = [...list];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        return next;
                      })
                    }
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    disabled={index === heroSlides.length - 1}
                    aria-label="Move slide down"
                    onClick={() =>
                      setHeroSlides((list) => {
                        if (index >= list.length - 1) return list;
                        const next = [...list];
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        return next;
                      })
                    }
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <DeleteMerchRowButton
                    label={`Delete banner ${index + 1}`}
                    onClick={() => {
                      setHeroSlides((list) => list.filter((_, i) => i !== index));
                      toast.message("Banner removed. Click Save homepage banners.");
                    }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Banner image</Label>
                <CompactMerchImage
                  wide
                  size={88}
                  maxWidth={1600}
                  maxHeight={900}
                  value={slide.image_url}
                  onChange={(url) =>
                    setHeroSlides((list) =>
                      list.map((row, i) => (i === index ? { ...row, image_url: url } : row)),
                    )
                  }
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Badge</Label>
                  <Input
                    className="mt-1 h-9"
                    value={slide.badge}
                    onChange={(e) =>
                      setHeroSlides((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, badge: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    className="mt-1 h-9"
                    value={slide.title}
                    onChange={(e) =>
                      setHeroSlides((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, title: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Heading</Label>
                  <Input
                    className="mt-1 h-9"
                    value={slide.heading}
                    onChange={(e) =>
                      setHeroSlides((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, heading: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    className="mt-1 min-h-[72px]"
                    value={slide.desc}
                    onChange={(e) =>
                      setHeroSlides((list) =>
                        list.map((row, i) => (i === index ? { ...row, desc: e.target.value } : row)),
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Button text</Label>
                  <Input
                    className="mt-1 h-9"
                    value={slide.button_text}
                    onChange={(e) =>
                      setHeroSlides((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, button_text: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Button link</Label>
                  <Input
                    className="mt-1 h-9"
                    placeholder="/products"
                    value={slide.link}
                    onChange={(e) =>
                      setHeroSlides((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, link: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <BannerTextToggle
                    checked={slide.hide_text}
                    onCheckedChange={(hide_text) =>
                      setHeroSlides((list) =>
                        list.map((row, i) => (i === index ? { ...row, hide_text } : row)),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setHeroSlides((list) => [...list, emptyHeroSlide()])}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add banner image
          </Button>
          <Button onClick={saveHomeHero}>Save homepage banners</Button>
        </div>
      </SectionCard>

      <SectionCard title="Dual promo banners">
        <p className="text-sm text-muted-foreground mb-4">
          Two rotating image banners between Shop by Categories and Hot Selling. Each side can hold
          multiple photos. Delay is shared and applies on the live homepage.
        </p>
        <div className="mb-4 max-w-xs">
          <Label className="text-xs">Rotate every (seconds)</Label>
          <Input
            type="number"
            min={2}
            max={20}
            className="mt-1 h-9"
            value={promoPair.delay_sec}
            onChange={(e) =>
              setPromoPair((prev) => ({ ...prev, delay_sec: Number(e.target.value) || 4 }))
            }
          />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <PromoSlotEditor
            title="Left banner"
            slides={promoPair.left}
            onChange={(left) => setPromoPair((prev) => ({ ...prev, left }))}
          />
          <PromoSlotEditor
            title="Right banner"
            slides={promoPair.right}
            onChange={(right) => setPromoPair((prev) => ({ ...prev, right }))}
          />
        </div>
        <Button className="mt-4" onClick={savePromoPair}>
          Save promo banners
        </Button>
      </SectionCard>

      <SectionCard title="Solutions strip (above footer)">
        <p className="text-sm text-muted-foreground mb-4">
          Homepage only — the rotating strip above the footer. This is not the /iot-solutions page.
          Featured image rotates on a timer; cards below list every item.
        </p>
        <div className="mb-4 max-w-xs">
          <Label className="text-xs">Featured rotate every (seconds)</Label>
          <Input
            type="number"
            min={2}
            max={20}
            className="mt-1 h-9"
            value={homeSolutions.delay_sec}
            onChange={(e) =>
              setHomeSolutions((prev) => ({ ...prev, delay_sec: Number(e.target.value) || 5 }))
            }
          />
        </div>
        <div className="space-y-4">
          {homeSolutions.items.map((item, index) => (
            <div key={`sol-${index}`} className="rounded-lg border p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">Solution {index + 1}</p>
                <DeleteMerchRowButton
                  label={`Delete solution ${item.title || index + 1}`}
                  onClick={() =>
                    setHomeSolutions((prev) => ({
                      ...prev,
                      items: prev.items.filter((_, i) => i !== index),
                    }))
                  }
                />
              </div>
              <CompactMerchImage
                wide
                size={80}
                maxWidth={1600}
                maxHeight={900}
                value={item.image_url}
                onChange={(url) =>
                  setHomeSolutions((prev) => ({
                    ...prev,
                    items: prev.items.map((row, i) => (i === index ? { ...row, image_url: url } : row)),
                  }))
                }
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Badge</Label>
                  <Input
                    className="mt-1 h-9"
                    value={item.badge}
                    onChange={(e) =>
                      setHomeSolutions((prev) => ({
                        ...prev,
                        items: prev.items.map((row, i) =>
                          i === index ? { ...row, badge: e.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    className="mt-1 h-9"
                    value={item.title}
                    onChange={(e) =>
                      setHomeSolutions((prev) => ({
                        ...prev,
                        items: prev.items.map((row, i) =>
                          i === index ? { ...row, title: e.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    className="mt-1 min-h-[64px]"
                    value={item.desc}
                    onChange={(e) =>
                      setHomeSolutions((prev) => ({
                        ...prev,
                        items: prev.items.map((row, i) =>
                          i === index ? { ...row, desc: e.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Button text</Label>
                  <Input
                    className="mt-1 h-9"
                    value={item.button_text}
                    onChange={(e) =>
                      setHomeSolutions((prev) => ({
                        ...prev,
                        items: prev.items.map((row, i) =>
                          i === index ? { ...row, button_text: e.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Link</Label>
                  <Input
                    className="mt-1 h-9"
                    value={item.link}
                    onChange={(e) =>
                      setHomeSolutions((prev) => ({
                        ...prev,
                        items: prev.items.map((row, i) =>
                          i === index ? { ...row, link: e.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <BannerTextToggle
                    checked={item.hide_text}
                    onCheckedChange={(hide_text) =>
                      setHomeSolutions((prev) => ({
                        ...prev,
                        items: prev.items.map((row, i) =>
                          i === index ? { ...row, hide_text } : row,
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setHomeSolutions((prev) => ({ ...prev, items: [...prev.items, emptyHomeSolution()] }))
            }
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add solution
          </Button>
          <Button onClick={saveHomeSolutions}>Save homepage solutions</Button>
        </div>
      </SectionCard>

      <SectionCard title="Shop by Categories">
        <p className="text-sm text-muted-foreground mb-4">
          Circular photos on the storefront. Add, edit, or delete any row — nothing is locked to
          code. Leave the image blank to use the first catalog product photo for that category.
        </p>
        <div className="space-y-4">
          {homeCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
              No homepage categories. Add one below, or the Shop by Categories strip stays hidden.
            </p>
          ) : null}
          {homeCategories.map((item, index) => (
            <div key={`cat-${index}`} className="rounded-lg border p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">Category {index + 1}</p>
                <DeleteMerchRowButton
                  label={`Delete ${item.label || item.category || "category"}`}
                  onClick={() => {
                    setHomeCategories((list) => list.filter((_, i) => i !== index));
                    toast.message("Category removed from this list. Click Save homepage categories.");
                  }}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3 min-w-0">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input
                    className="mt-1 h-9"
                    value={item.label}
                    onChange={(e) =>
                      setHomeCategories((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, label: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Catalog category key</Label>
                  <Input
                    className="mt-1 h-9"
                    value={item.category}
                    onChange={(e) =>
                      setHomeCategories((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, category: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs mb-1.5 block">Category image</Label>
                  <CompactMerchImage
                    round
                    value={item.image_url || ""}
                    fallbackUrl={categoryFallbacks[item.category]}
                    onChange={(url) =>
                      setHomeCategories((list) =>
                        list.map((row, i) => (i === index ? { ...row, image_url: url } : row)),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setHomeCategories((list) => [
                ...list,
                { label: "New category", category: "New Category", image_url: "" },
              ])
            }
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add category
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setHomeCategories((list) => mergeSwstShopCategories(list));
              toast.message("Missing chips added, Security Cameras renamed to Wireless CCTV. Click Save homepage categories.");
            }}
          >
            Add missing category chips
          </Button>
          <Button onClick={saveHomeCategories}>Save homepage categories</Button>
        </div>
      </SectionCard>

      <SectionCard title="Top Brands">
        <p className="text-sm text-muted-foreground mb-4">
          Brand logos on the storefront in full color. Add, edit, or delete any row. Upload a logo,
          or leave blank to fall back to a catalog product photo / initials.
        </p>
        <div className="space-y-4">
          {homeBrands.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
              No homepage brands. Add one below, or the Top Brands strip stays hidden.
            </p>
          ) : null}
          {homeBrands.map((item, index) => (
            <div key={`brand-${index}`} className="rounded-lg border p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">Brand {index + 1}</p>
                <DeleteMerchRowButton
                  label={`Delete ${item.name || "brand"}`}
                  onClick={() => {
                    setHomeBrands((list) => list.filter((_, i) => i !== index));
                    toast.message("Brand removed from this list. Click Save homepage brands.");
                  }}
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-3 min-w-0">
                <div>
                  <Label className="text-xs">Brand name</Label>
                  <Input
                    className="mt-1 h-9"
                    value={item.name}
                    onChange={(e) =>
                      setHomeBrands((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, name: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Manufacturer filter</Label>
                  <Input
                    className="mt-1 h-9"
                    value={item.manufacturer}
                    onChange={(e) =>
                      setHomeBrands((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, manufacturer: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Initials fallback</Label>
                  <Input
                    className="mt-1 h-9"
                    value={item.initials || ""}
                    onChange={(e) =>
                      setHomeBrands((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, initials: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs mb-1.5 block">Brand logo</Label>
                  <CompactMerchImage
                    value={item.image_url || ""}
                    fallbackUrl={brandFallbacks[item.manufacturer]}
                    onChange={(url) =>
                      setHomeBrands((list) =>
                        list.map((row, i) => (i === index ? { ...row, image_url: url } : row)),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setHomeBrands((list) => [
                ...list,
                { name: "New brand", manufacturer: "", initials: "NB", image_url: "" },
              ])
            }
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add brand
          </Button>
          <Button onClick={saveHomeBrands}>Save homepage brands</Button>
        </div>
      </SectionCard>
      </SettingsGroup>

      <SettingsGroup
        id="settings-iot"
        kicker="IoT Solutions page"
        title="Hero photos & solution cards"
        livePath="/iot-solutions"
        tone="iot"
      >
      <SectionCard title="Solution cards (hero + grid)">
        <p className="text-sm text-muted-foreground mb-4">
          Only the /iot-solutions page. Not the homepage Solutions strip. Each card is one full
          photo that rotates. Delay is shared for hero + cards.
        </p>
        <div className="mb-4 max-w-xs">
          <Label className="text-xs">Rotate every (seconds)</Label>
          <Input
            type="number"
            min={2}
            max={20}
            className="mt-1 h-9"
            value={iotPageBands.delay_sec}
            onChange={(e) =>
              setIotPageBands((prev) => ({ ...prev, delay_sec: Number(e.target.value) || 5 }))
            }
          />
        </div>
        <div className="space-y-5">
          {iotPageBands.bands.map((band, index) => (
            <div key={`iot-band-${index}`} className="rounded-lg border p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Card {index + 1}
                  {band.badge ? ` — ${band.badge}` : ""}
                </p>
                <DeleteMerchRowButton
                  label={`Delete band ${band.title || index + 1}`}
                  onClick={() =>
                    setIotPageBands((prev) => ({
                      ...prev,
                      bands: prev.bands.filter((_, i) => i !== index),
                    }))
                  }
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Badge</Label>
                  <Input
                    className="mt-1 h-9"
                    value={band.badge}
                    onChange={(e) =>
                      setIotPageBands((prev) => ({
                        ...prev,
                        bands: prev.bands.map((row, i) =>
                          i === index ? { ...row, badge: e.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    className="mt-1 h-9"
                    value={band.title}
                    onChange={(e) =>
                      setIotPageBands((prev) => ({
                        ...prev,
                        bands: prev.bands.map((row, i) =>
                          i === index ? { ...row, title: e.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    className="mt-1 min-h-[64px]"
                    value={band.desc}
                    onChange={(e) =>
                      setIotPageBands((prev) => ({
                        ...prev,
                        bands: prev.bands.map((row, i) =>
                          i === index ? { ...row, desc: e.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Button text</Label>
                  <Input
                    className="mt-1 h-9"
                    value={band.button_text}
                    onChange={(e) =>
                      setIotPageBands((prev) => ({
                        ...prev,
                        bands: prev.bands.map((row, i) =>
                          i === index ? { ...row, button_text: e.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Catalog category</Label>
                  <Input
                    className="mt-1 h-9"
                    value={band.shop_category}
                    onChange={(e) =>
                      setIotPageBands((prev) => ({
                        ...prev,
                        bands: prev.bands.map((row, i) =>
                          i === index ? { ...row, shop_category: e.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <BannerTextToggle
                    checked={band.hide_text}
                    onCheckedChange={(hide_text) =>
                      setIotPageBands((prev) => ({
                        ...prev,
                        bands: prev.bands.map((row, i) =>
                          i === index ? { ...row, hide_text } : row,
                        ),
                      }))
                    }
                  />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground pt-1">
                Rotating photos (one frame — images cycle, not side-by-side)
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {band.images.map((url, imgIndex) => (
                  <div key={`band-${index}-img-${imgIndex}`} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Image {imgIndex + 1}</span>
                      <DeleteMerchRowButton
                        label={`Delete ${band.title || "band"} image ${imgIndex + 1}`}
                        onClick={() =>
                          setIotPageBands((prev) => ({
                            ...prev,
                            bands: prev.bands.map((row, i) =>
                              i === index
                                ? { ...row, images: row.images.filter((_, j) => j !== imgIndex) }
                                : row,
                            ),
                          }))
                        }
                      />
                    </div>
                    <CompactMerchImage
                      wide
                      size={72}
                      maxWidth={1600}
                      maxHeight={900}
                      value={url}
                      onChange={(next) =>
                        setIotPageBands((prev) => ({
                          ...prev,
                          bands: prev.bands.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  images: row.images.map((img, j) => (j === imgIndex ? next : img)),
                                }
                              : row,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setIotPageBands((prev) => ({
                    ...prev,
                    bands: prev.bands.map((row, i) =>
                      i === index ? { ...row, images: [...row.images, ""] } : row,
                    ),
                  }))
                }
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add photo
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setIotPageBands((prev) => ({ ...prev, bands: [...prev.bands, emptyIotPageBand()] }))
            }
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add solution card
          </Button>
          <Button onClick={saveIotPageBands}>Save IoT page cards</Button>
        </div>
      </SectionCard>
      </SettingsGroup>

      <SettingsGroup
        id="settings-checkout"
        kicker="Checkout"
        title="Tax, payments & delivery"
        livePath="/checkout"
      >
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
      </SettingsGroup>
    </div>
  );
}
