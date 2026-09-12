import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { googleAuthError } from "@/lib/google-auth";
import { getAuthRedirectTo, rememberAuthNext } from "@/lib/auth-redirect";
import { persistPendingVerification, resendSignupEmail, completeEmailSignup, verifyEmailError } from "@/lib/verify-email";
import { GoogleAuthButton } from "@/components/site/GoogleAuthButton";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Loader2,
  Store,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { SmartZoneLogo } from "@/components/site/SmartZoneLogo";
import {
  fetchOwnVendorApplication,
  isGoogleAuthUser,
  persistVendorDraft,
  readVendorDraft,
  submitVendorApplication,
  vendorSignupMetadata,
} from "@/lib/vendor-onboarding";
import { resolvePostLoginPath } from "@/lib/post-login";
import { displayNameFromUser } from "@/lib/auth-profile";

export const Route = createFileRoute("/vendor/auth")({
  head: () => ({
    meta: [
      { title: "Seller Center — SmartZone" },
      { property: "og:title", content: "Seller Center — SmartZone" },
      {
        property: "og:description",
        content: "Register your shop or sign in to the SmartZone vendor workspace.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
    error_description: typeof s.error_description === "string" ? s.error_description : undefined,
    error_code: typeof s.error_code === "string" ? s.error_code : undefined,
  }),
  component: VendorAuthPage,
});

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid email or password"))
    return "Incorrect email or password. Use Forgot password if you shop with this email already.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the verification link.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "This email already has a SmartZone account. Sign in — your shop details are saved for Super Admin review.";
  if (m.includes("password should be at least")) return "Password must be at least 6 characters.";
  if (m.includes("rate limit")) return "Too many attempts — wait a minute and try again.";
  return msg;
}

function sellerFieldError(input: {
  name: string;
  shopName: string;
  email: string;
  phone: string;
  cnicOrTax: string;
  description: string;
  password?: string;
  confirmPassword?: string;
  requirePassword: boolean;
}) {
  if (!input.name.trim()) return "Enter the owner / contact name";
  if (!input.shopName.trim()) return "Enter your shop name";
  if (!input.email.trim()) return "Enter your business email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return "Enter a valid business email";
  if (!input.phone.trim() || input.phone.replace(/\D/g, "").length < 10) {
    return "Enter a valid Phone / WhatsApp number";
  }
  if (!input.cnicOrTax.trim() || input.cnicOrTax.replace(/[^a-zA-Z0-9]/g, "").length < 5) {
    return "Enter a valid CNIC or NTN";
  }
  if (!input.description.trim() || input.description.trim().length < 8) {
    return "Describe the products you will sell";
  }
  if (input.requirePassword) {
    if (!input.password) return "Choose a password";
    if ((input.password || "").length < 6) return "Password must be at least 6 characters";
    if (input.password !== input.confirmPassword) return "Passwords do not match";
  }
  return null;
}

function isExistingAuthAccount(
  error: { message?: string } | null | undefined,
  user: { identities?: Array<unknown> | null } | null | undefined,
) {
  const msg = (error?.message || "").toLowerCase();
  if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already exists")) {
    return true;
  }
  return Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
}

function VendorAuthPage() {
  const { user, isVendor, isAdmin, loading, signOut, refreshSession } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/vendor/auth" });
  const [activeTab, setActiveTab] = useState<string>(search.tab === "register" ? "register" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnicOrTax, setCnicOrTax] = useState("");
  const [description, setDescription] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);
  const [existingAccountHint, setExistingAccountHint] = useState(false);

  const googleUser = isGoogleAuthUser(user);
  const googleWelcome = useRef(false);

  useEffect(() => {
    rememberAuthNext("/vendor/auth");
    const oauthError = search.error_description || search.error;
    if (oauthError) setOauthNotice(googleAuthError(oauthError, search.error_code));
  }, [search.error, search.error_code, search.error_description]);

  const { data: application, isLoading: loadingApp, refetch } = useQuery({
    queryKey: ["own-vendor-application", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchOwnVendorApplication(user!.id),
  });

  useEffect(() => {
    if (loading) return;
    if (isVendor) {
      navigate({ to: "/vendor" });
      return;
    }
    if (isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [isAdmin, isVendor, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const googleName = displayNameFromUser(user);
    const draft = readVendorDraft();
    setName((prev) => prev || draft?.fullName || googleName);
    setEmail((prev) => prev || user.email || draft?.businessEmail || "");
    if (draft) {
      setShopName((prev) => prev || draft.shopName);
      setPhone((prev) => prev || draft.phone);
      setCnicOrTax((prev) => prev || draft.cnicOrTax);
      setDescription((prev) => prev || draft.description);
    }
    if (!application || application.status === "rejected") {
      setActiveTab("register");
      if (googleUser && !googleWelcome.current) {
        googleWelcome.current = true;
        toast.message("Google connected. Fill the remaining shop details, then submit for Super Admin review.");
      }
    }
  }, [user, application, googleUser]);

  const continueSignedIn = async () => {
    const dest = await resolvePostLoginPath({ intent: "vendor", explicitNext: "/vendor/auth" });
    navigate({ to: dest as "/" });
  };

  const signIn = async () => {
    if (!email.trim() || !password) return toast.error("Enter your seller email and password");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          persistPendingVerification(email.trim().toLowerCase(), "signup");
          await resendSignupEmail(email.trim().toLowerCase());
          toast.error("Verify your email first — we sent a new confirmation link.");
          navigate({
            to: "/auth/verify-email",
            search: {
              tab: "signin",
              email: email.trim().toLowerCase(),
              purpose: "signup",
              redirect: "/vendor/auth",
            },
          });
          return;
        }
        return toast.error(friendlyError(error.message));
      }
      toast.success("Signed in to Seller Center");
      await continueSignedIn();
    } catch (err: unknown) {
      toast.error(friendlyError(err instanceof Error ? err.message : "Failed to sign in"));
    } finally {
      setBusy(false);
    }
  };

  const saveSellerDraft = () => {
    persistVendorDraft({
      shopName,
      businessEmail: (email || user?.email || "").trim().toLowerCase(),
      phone,
      cnicOrTax,
      description,
      fullName: name.trim(),
    });
  };

  const submitShopForCurrentUser = async () => {
    const issue = sellerFieldError({
      name,
      shopName,
      email: email || user?.email || "",
      phone,
      cnicOrTax,
      description,
      requirePassword: false,
    });
    if (issue) throw new Error(issue);
    await submitVendorApplication({
      shopName,
      businessEmail: (email || user?.email || "").trim().toLowerCase(),
      phone,
      cnicOrTax,
      description,
    });
    toast.success("Shop application submitted. Super Admin will review it before the vendor workspace opens.");
    await refreshSession();
    await refetch();
  };

  const prepareGoogleSellerSignup = async () => {
    saveSellerDraft();
    rememberAuthNext("/vendor/auth?tab=register");
    return true;
  };

  const goVerifySellerEmail = async (address: string) => {
    persistPendingVerification(address, "signup");
    await resendSignupEmail(address);
    toast.success("Verify your email. After confirmation, Super Admin will receive your shop application.");
    navigate({
      to: "/auth/verify-email",
      search: { tab: "signup", email: address, purpose: "signup", redirect: "/vendor/auth" },
    });
  };

  const attachShopToExistingAccount = async (address: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: address,
      password,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed")) {
        await goVerifySellerEmail(address);
        return;
      }
      setActiveTab("signin");
      setExistingAccountHint(true);
      toast.message(
        "This email already shops on SmartZone. Sign in with your existing password — shop details are saved for Super Admin review.",
      );
      return;
    }
    await submitShopForCurrentUser();
  };

  const register = async () => {
    const issue = sellerFieldError({
      name: name || displayNameFromUser(user),
      shopName,
      email: email || user?.email || "",
      phone,
      cnicOrTax,
      description,
      password,
      confirmPassword,
      requirePassword: !user,
    });
    if (issue) return toast.error(issue);

    if (user) {
      setBusy(true);
      try {
        await submitShopForCurrentUser();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Could not submit shop application");
      } finally {
        setBusy(false);
      }
      return;
    }

    const address = email.trim().toLowerCase();
    const draft = {
      shopName,
      businessEmail: address,
      phone,
      cnicOrTax,
      description,
      fullName: name.trim(),
    };
    persistVendorDraft(draft);
    rememberAuthNext("/vendor/auth");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: address,
        password,
        options: {
          emailRedirectTo: getAuthRedirectTo("/auth/callback"),
          data: vendorSignupMetadata(draft, name.trim()),
        },
      });
      if (isExistingAuthAccount(error, data.user)) {
        await attachShopToExistingAccount(address);
        return;
      }
      if (error) return toast.error(friendlyError(error.message));
      const mail = await completeEmailSignup(address, data.user?.id);
      if (!mail.ok) toast.message(verifyEmailError(mail.error, "signup"));
      toast.success("Seller account created. Verify your email so Super Admin can review your shop.");
      navigate({
        to: "/auth/verify-email",
        search: { tab: "signup", email: address, purpose: "signup", redirect: "/vendor/auth" },
      });
    } catch (err: unknown) {
      toast.error(friendlyError(err instanceof Error ? err.message : "Could not register shop"));
    } finally {
      setBusy(false);
    }
  };

  const pending = application?.status === "pending";
  const approved = application?.status === "approved";
  const rejected = application?.status === "rejected";
  const showStatus = Boolean(user && application && !rejected);

  return (
    <div className="min-h-screen bg-[#0B192C] px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center">
          <Link to="/" aria-label="SmartZone Home">
            <SmartZoneLogo size="md" dark showTagline />
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
          <div className="mb-5 space-y-1 text-center">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700">
              <Store className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B192C]">Seller Center</h1>
            <p className="text-sm text-muted-foreground">
              Vendor sign-in and shop registration. Customer shopping accounts stay on the storefront.
            </p>
          </div>

          {loading || (user && loadingApp) ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF7A00]" />
            </div>
          ) : showStatus ? (
            <div
              className={`space-y-5 rounded-xl border p-6 text-center ${
                approved ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <div
                className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
                  approved ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {approved ? <CheckCircle2 className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold">
                  {approved ? "Shop approved" : "Application under review"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {approved
                    ? "Your vendor workspace is being linked. Sign out and back in if it does not open automatically."
                    : `${application.shop_name} is with SmartZone operations. Typical review is 24–48 business hours.`}
                </p>
              </div>
              <div className="space-y-2 rounded-xl border bg-background/80 p-4 text-left text-xs">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Shop</span>
                  <span className="font-semibold">{application.shop_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold uppercase tracking-wider">{application.status}</span>
                </div>
              </div>
              {approved ? (
                <Button className="w-full gap-2 bg-[#0B192C] hover:bg-[#0F2C59]" onClick={() => navigate({ to: "/vendor" })}>
                  Open vendor workspace <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid h-11 w-full grid-cols-2">
                <TabsTrigger value="signin" className="min-h-[40px]">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="min-h-[40px]">
                  Register shop
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                {oauthNotice ? (
                  <p className="mb-3 text-sm leading-snug text-destructive" role="alert">
                    {oauthNotice}
                  </p>
                ) : null}
                {user ? (
                  <div className="mb-5 rounded-xl border border-[#0052B4]/20 bg-[#0052B4]/5 px-4 py-3 text-sm">
                    <p className="font-semibold text-[#0B192C]">
                      Signed in as {user.email}
                      {googleUser ? " · Google" : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {googleUser
                        ? "Owner name and business email came from Google. Complete the remaining shop details for Super Admin review."
                        : "Complete shop details below to apply. This does not change your customer shopping account."}
                    </p>
                    <button
                      type="button"
                      className="mt-2 text-xs font-medium text-[#0052B4] hover:underline"
                      onClick={() => void signOut()}
                    >
                      Use a different account
                    </button>
                  </div>
                ) : null}
              </div>

              <TabsContent value="signin" className="mt-0 space-y-4">
                {user ? (
                  <p className="text-sm text-muted-foreground">
                    You are already signed in. Open Register shop to submit seller details.
                  </p>
                ) : (
                  <>
                    {existingAccountHint ? (
                      <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-[#0B192C]">
                        This email already has a SmartZone account. Sign in with that password or
                        Continue with Google. Your shop details stay saved and go to Super Admin for
                        approval — Seller Center does not open until then.
                      </p>
                    ) : null}
                    <GoogleAuthButton
                      nextPath="/vendor/auth"
                      disabled={busy}
                      hint="Existing sellers can open Seller Center with the Google account on this shop."
                    />
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">Or with email</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v-si-email">Seller email</Label>
                      <Input
                        id="v-si-email"
                        type="email"
                        autoComplete="username"
                        placeholder="shop@company.pk"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="v-si-pw">Password</Label>
                        <Link
                          to="/auth/forgot-password"
                          search={{ tab: "signin" }}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="v-si-pw"
                          type={showPw ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      onClick={() => void signIn()}
                      disabled={busy}
                      className="min-h-[48px] w-full bg-[#FF7A00] text-base font-semibold text-white hover:bg-[#E56E00]"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                        </>
                      ) : (
                        "Sign in to Seller Center"
                      )}
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="register" className="mt-0 space-y-4">
                {rejected ? (
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <p>Previous application was not approved. Update shop details and submit again.</p>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0B192C]">
                  <ShieldCheck className="h-4 w-4 text-[#FF7A00]" /> Shop registration
                </div>
                {!user ? (
                  <>
                    <GoogleAuthButton
                      nextPath="/vendor/auth?tab=register"
                      disabled={busy}
                      label="Continue with Google"
                      onBeforeStart={prepareGoogleSellerSignup}
                      hint="Google only signs you in and fills owner name + email. Shop request is not sent until you complete the form below and submit."
                    />
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">Or register with email</span>
                      </div>
                    </div>
                  </>
                ) : googleUser ? (
                  <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-[#0B192C]">
                    Google sign-in is complete. Fill shop name, phone, CNIC / NTN, and products, then submit.
                    Super Admin approves before Seller Center opens.
                  </p>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="v-name">Owner / contact name *</Label>
                  <Input
                    id="v-name"
                    autoComplete="name"
                    placeholder="Username"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {googleUser ? (
                    <p className="text-[11px] text-muted-foreground">Filled from your Google profile. You can edit it.</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="v-shop">Shop name *</Label>
                    <Input
                      id="v-shop"
                      placeholder="Apex Automation Store"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="v-email">Business email *</Label>
                    <Input
                      id="v-email"
                      type="email"
                      autoComplete="email"
                      placeholder="shop@company.pk"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={Boolean(user?.email)}
                    />
                    {googleUser ? (
                      <p className="text-[11px] text-muted-foreground">Locked to the Google account that will operate this shop.</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-phone">Phone / WhatsApp *</Label>
                    <Input
                      id="v-phone"
                      placeholder="+92 300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-cnic">CNIC / NTN *</Label>
                    <Input
                      id="v-cnic"
                      placeholder="42101-XXXXXXX-X"
                      value={cnicOrTax}
                      onChange={(e) => setCnicOrTax(e.target.value)}
                    />
                  </div>
                </div>
                {!user ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="v-pw">Password *</Label>
                      <Input
                        id="v-pw"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v-pw2">Confirm password *</Label>
                      <Input
                        id="v-pw2"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </>
                ) : googleUser ? (
                  <p className="rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Password is not needed with Google. Complete the shop fields and press submit to send the request.
                  </p>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="v-desc">Products you will sell *</Label>
                  <Textarea
                    id="v-desc"
                    rows={3}
                    placeholder="Smart switches, cameras, sensors, industrial gateways…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => void register()}
                  disabled={busy}
                  className="min-h-[48px] w-full bg-[#FF7A00] text-base font-semibold text-white hover:bg-[#E56E00]"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : user ? (
                    "Submit shop for Super Admin review"
                  ) : (
                    "Create seller account"
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Google signs you in first. The shop request goes to Super Admin only after you fill the remaining
                  details and press submit.
                </p>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Shopping as a customer?{" "}
          <Link to="/auth" search={{ tab: "signin" }} className="font-semibold text-[#00A3E0] hover:underline">
            Customer sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
