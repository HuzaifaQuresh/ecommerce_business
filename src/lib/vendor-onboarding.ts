import { supabase } from "@/integrations/supabase/client";

export type VendorShopRow = {
  id: string;
  user_id: string;
  shop_name: string;
  slug: string;
  commission_pct: number;
  is_active: boolean;
  created_at: string;
};

export type VendorApplicationRow = {
  id: string;
  user_id: string;
  shop_name: string;
  business_email: string;
  phone: string;
  cnic_or_tax_id: string;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function rpcError(error: { message?: string } | null | undefined, fallback: string) {
  return new Error(error?.message?.trim() || fallback);
}

function asJson(data: unknown) {
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

export async function listVendorShops(): Promise<VendorShopRow[]> {
  const { data, error } = await supabase
    .from("vendors")
    .select("id,user_id,shop_name,slug,commission_pct,is_active,created_at")
    .order("created_at", { ascending: false });
  if (error) throw rpcError(error, "Could not load vendor shops");
  return (data ?? []).map((row) => ({
    ...row,
    commission_pct: Number(row.commission_pct ?? 10),
    is_active: Boolean(row.is_active),
  }));
}

export async function listVendorApplications(): Promise<VendorApplicationRow[]> {
  const { data, error } = await supabase
    .from("vendor_applications")
    .select("id,user_id,shop_name,business_email,phone,cnic_or_tax_id,description,status,created_at")
    .order("created_at", { ascending: false });
  if (error) throw rpcError(error, "Could not load vendor applications");
  return (data ?? []) as VendorApplicationRow[];
}

export async function fetchOwnVendorApplication(userId: string) {
  const { data, error } = await supabase
    .from("vendor_applications")
    .select("id,user_id,shop_name,business_email,phone,cnic_or_tax_id,description,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw rpcError(error, "Could not load your application");
  return (data ?? null) as VendorApplicationRow | null;
}

export async function submitVendorApplication(input: {
  shopName: string;
  businessEmail: string;
  phone: string;
  cnicOrTax: string;
  description: string;
}) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Sign in to submit a vendor application.");

  const payload = {
    user_id: user.id,
    shop_name: input.shopName.trim(),
    business_email: input.businessEmail.trim().toLowerCase(),
    phone: input.phone.trim(),
    cnic_or_tax_id: input.cnicOrTax.trim(),
    description: input.description.trim() || null,
    status: "pending",
  };

  const { data, error } = await supabase
    .from("vendor_applications")
    .insert(payload)
    .select("id,user_id,shop_name,business_email,phone,cnic_or_tax_id,description,status,created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existing = await fetchOwnVendorApplication(user.id);
      if (existing) return existing;
      throw new Error("You already have a pending vendor application under review.");
    }
    throw rpcError(error, "Could not submit vendor application");
  }
  return data as VendorApplicationRow;
}

export async function provisionVendor(input: {
  email: string;
  shopName: string;
  phone?: string;
  cnic?: string;
  description?: string;
  commissionPct?: number;
}) {
  const { data, error } = await supabase.rpc("admin_provision_vendor", {
    _email: input.email.trim().toLowerCase(),
    _shop_name: input.shopName.trim(),
    _phone: input.phone?.trim() || null,
    _cnic: input.cnic?.trim() || null,
    _description: input.description?.trim() || null,
    _commission_pct: Number.isFinite(input.commissionPct) ? Number(input.commissionPct) : 10,
  });
  if (error) throw rpcError(error, "Could not add vendor");
  const json = asJson(data);
  if (json.ok === false) {
    throw new Error(String(json.error || "Could not add vendor"));
  }
  return json;
}

export async function reviewVendorApplication(appId: string, approve: boolean, notes?: string) {
  const { data, error } = await supabase.rpc("admin_review_vendor_application", {
    _app_id: appId,
    _approve: approve,
    _notes: notes?.trim() || null,
  });
  if (error) throw rpcError(error, approve ? "Could not approve vendor" : "Could not reject application");
  const json = asJson(data);
  if (json.ok === false) {
    throw new Error(String(json.error || "Could not update application"));
  }
  return json;
}

export async function setVendorShopActive(shopId: string, isActive: boolean) {
  const { error } = await supabase.from("vendors").update({ is_active: isActive }).eq("id", shopId);
  if (error) throw rpcError(error, isActive ? "Could not enable shop" : "Could not disable shop");
}

export async function deleteVendorShop(shopId: string) {
  const { error } = await supabase.from("vendors").delete().eq("id", shopId);
  if (error) throw rpcError(error, "Could not delete vendor shop");
}

export async function deleteVendorApplication(appId: string) {
  const { error } = await supabase.from("vendor_applications").delete().eq("id", appId);
  if (error) throw rpcError(error, "Could not delete application");
}

export type VendorDraft = {
  shopName: string;
  businessEmail: string;
  phone: string;
  cnicOrTax: string;
  description: string;
  fullName?: string;
};

const VENDOR_DRAFT_KEY = "sz_vendor_draft";

export function isGoogleAuthUser(user: {
  identities?: Array<{ provider?: string }> | null;
  app_metadata?: Record<string, unknown> | null;
} | null | undefined) {
  if (!user) return false;
  if ((user.identities ?? []).some((row) => row.provider === "google")) return true;
  const provider = user.app_metadata?.provider;
  if (provider === "google") return true;
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes("google");
}

export function isPublicVendorPath(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/vendor/auth" || path === "/vendor/apply";
}

export function persistVendorDraft(draft: VendorDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(VENDOR_DRAFT_KEY, JSON.stringify(draft));
}

export function readVendorDraft(): VendorDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VENDOR_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VendorDraft;
    return {
      shopName: String(parsed?.shopName ?? ""),
      businessEmail: String(parsed?.businessEmail ?? ""),
      phone: String(parsed?.phone ?? ""),
      cnicOrTax: String(parsed?.cnicOrTax ?? ""),
      description: String(parsed?.description ?? ""),
      fullName: parsed?.fullName ? String(parsed.fullName) : undefined,
    };
  } catch {
    return null;
  }
}

export function clearVendorDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(VENDOR_DRAFT_KEY);
}

function metaFlag(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  return value === true || value === "true" || value === 1 || value === "1";
}

function metaText(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  return typeof value === "string" ? value.trim() : "";
}

export function vendorDraftFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): VendorDraft | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const stored = readVendorDraft();
  if (!metaFlag(meta, "vendor_intent") && !stored) return stored;
  const shopName = metaText(meta, "shop_name") || stored?.shopName || "";
  if (!shopName) return stored;
  return {
    shopName,
    businessEmail: metaText(meta, "business_email") || stored?.businessEmail || user.email || "",
    phone: metaText(meta, "phone") || stored?.phone || "",
    cnicOrTax: metaText(meta, "cnic") || stored?.cnicOrTax || "",
    description: metaText(meta, "shop_description") || stored?.description || "",
    fullName: metaText(meta, "full_name") || stored?.fullName,
  };
}

export function vendorSignupMetadata(draft: VendorDraft, fullName: string) {
  return {
    full_name: fullName,
    vendor_intent: true,
    shop_name: draft.shopName.trim(),
    business_email: draft.businessEmail.trim().toLowerCase(),
    phone: draft.phone.trim(),
    cnic: draft.cnicOrTax.trim(),
    shop_description: draft.description.trim(),
  };
}

export async function finalizeVendorRegistration(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: Array<{ provider?: string }> | null;
  app_metadata?: Record<string, unknown> | null;
}) {
  const existing = await fetchOwnVendorApplication(user.id);
  if (existing && existing.status !== "rejected") {
    clearVendorDraft();
    return existing;
  }
  // Google is identity only. The seller must complete shop details and press Submit.
  if (isGoogleAuthUser(user)) return existing;
  const draft = vendorDraftFromUser(user);
  if (
    !draft?.shopName.trim() ||
    !draft.phone.trim() ||
    !draft.cnicOrTax.trim() ||
    !draft.description.trim()
  ) {
    return existing;
  }
  try {
    const app = await submitVendorApplication({
      shopName: draft.shopName,
      businessEmail: draft.businessEmail || user.email || "",
      phone: draft.phone,
      cnicOrTax: draft.cnicOrTax,
      description: draft.description,
    });
    clearVendorDraft();
    await supabase.auth.updateUser({ data: { vendor_intent: false } });
    return app;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.toLowerCase().includes("already")) {
      clearVendorDraft();
      return fetchOwnVendorApplication(user.id);
    }
    throw err;
  }
}
