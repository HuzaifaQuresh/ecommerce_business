import { createFileRoute, Link, Outlet, useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { googleAuthError } from "@/lib/google-auth";
import { consumeAuthNext, getAuthRedirectTo, rememberAuthNext, safeInternalPath } from "@/lib/auth-redirect";
import { GoogleAuthButton } from "@/components/site/GoogleAuthButton";
import {
  persistPendingVerification,
  resendSignupEmail,
  completeEmailSignup,
  verifyEmailError,
} from "@/lib/verify-email";
import { needsEmailVerification } from "@/lib/email-verified";
import { isPasswordRecoveryPending, markPasswordRecovery, readAuthRedirectParams } from "@/lib/password-recovery";
import { loginIntentFromPath, resolvePostLoginPath } from "@/lib/post-login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { SmartZoneLogo } from "@/components/site/SmartZoneLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — SmartZone — IT Solutions, Smart Automation & Electronics" },
      { property: "og:title", content: "Sign In — SmartZone" },
      {
        property: "og:description",
        content:
          "Sign in to SmartZone to manage your orders, smart home IoT hardware, and custom IT automation solutions.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    tab: typeof s.tab === "string" ? s.tab : undefined,
    code: typeof s.code === "string" ? s.code : undefined,
    type: typeof s.type === "string" ? s.type : undefined,
    token_hash: typeof s.token_hash === "string" ? s.token_hash : undefined,
    token: typeof s.token === "string" ? s.token : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
    error_description: typeof s.error_description === "string" ? s.error_description : undefined,
    error_code: typeof s.error_code === "string" ? s.error_code : undefined,
    email: typeof s.email === "string" ? s.email : undefined,
    purpose: typeof s.purpose === "string" ? s.purpose : undefined,
  }),
  component: AuthLayout,
});

function AuthLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/auth" && pathname !== "/auth/") return <Outlet />;
  return (
    <>
      <RecoveryRedirect />
      <Auth />
    </>
  );
}

function RecoveryRedirect() {
  useEffect(() => {
    const params = readAuthRedirectParams();
    const type = params.get("type");
    const hasAuthToken = Boolean(
      params.get("code") || params.get("token_hash") || params.get("access_token") || params.get("token"),
    );
    if (type === "recovery") {
      markPasswordRecovery();
      window.location.replace(`/auth/reset-password${window.location.search}${window.location.hash}`);
      return;
    }
    if (hasAuthToken) {
      window.location.replace(`/auth/callback${window.location.search}${window.location.hash}`);
    }
  }, []);
  return null;
}

/** Maps Supabase error messages to friendly copy */
function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid email or password"))
    return "Incorrect email or password. If you do not have an account yet, use Sign Up first.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the verification link.";
  if (m.includes("user already registered"))
    return "An account with this email already exists. Use Sign In instead.";
  if (m.includes("password should be at least")) return "Password must be at least 6 characters.";
  if (m.includes("rate limit")) return "Too many attempts — wait a minute and try again.";
  if (
    m.includes("provider is not enabled") ||
    m.includes("unsupported provider") ||
    m.includes("validation_failed")
  )
    return "Google sign-in is not enabled yet. Add a Google OAuth Client ID in Supabase Auth → Providers → Google.";
  return msg;
}

function Auth() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [activeTab, setActiveTab] = useState<string>(search.tab === "signup" ? "signup" : "signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  useEffect(() => {
    document.title =
      activeTab === "signup"
        ? "Sign Up — SmartZone — IT Solutions, Smart Automation & Electronics"
        : "Sign In — SmartZone — IT Solutions, Smart Automation & Electronics";
  }, [activeTab]);

  useEffect(() => {
    rememberAuthNext(search.redirect);
    const oauthError = search.error_description || search.error;
    if (oauthError) {
      setOauthNotice(googleAuthError(oauthError, search.error_code));
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      if (isPasswordRecoveryPending()) {
        navigate({ to: "/auth/reset-password", search: { tab: "signin" } });
        return;
      }
      if (needsEmailVerification(data.session.user)) {
        const address = data.session.user.email?.trim().toLowerCase();
        if (address) persistPendingVerification(address, "signup");
        void supabase.auth.signOut({ scope: "global" }).then(() => {
          navigate({
            to: "/auth/verify-email",
            search: { tab: "signup", email: address, purpose: "signup", redirect: search.redirect },
          });
        });
        return;
      }
      void redirectAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  /** Reads roles from DB and sends user to correct workspace */
  const redirectAfterAuth = async () => {
    const next = consumeAuthNext() || safeInternalPath(search.redirect);
    const dest = await resolvePostLoginPath({
      intent: loginIntentFromPath(next),
      explicitNext: next,
    });
    navigate({ to: dest as "/", resetScroll: true });
  };

  const signIn = async () => {
    if (!email.trim() || !password) return toast.error("Enter your email and password");
    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      setBusy(false);

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          persistPendingVerification(email.trim().toLowerCase(), "signup");
          await resendSignupEmail(email.trim().toLowerCase());
          toast.error("Please verify your email first — we sent a new confirmation link.");
          navigate({
            to: "/auth/verify-email",
            search: { tab: "signin", email: email.trim().toLowerCase(), purpose: "signup" },
          });
          return;
        }
        if (isPasswordRecoveryPending()) {
          return toast.error(
            "Open the password reset link in your email first. After you set a new password, sign in with that new password — not the old one.",
          );
        }
        return toast.error(friendlyError(error.message));
      }

      toast.success("Signed in successfully");
      await redirectAfterAuth();
    } catch (err: any) {
      setBusy(false);
      toast.error(friendlyError(err?.message || "Failed to sign in"));
    }
  };

  const signUp = async () => {
    const fullName = name.trim();
    const address = email.trim().toLowerCase();
    if (!fullName) return toast.error("Enter your full name");
    if (!address) return toast.error("Enter your email address");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      return toast.error("Enter a valid email address");
    }
    if (!password) return toast.error("Choose a password");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: address,
        password,
        options: {
          emailRedirectTo: getAuthRedirectTo("/auth/callback"),
          data: { full_name: fullName },
        },
      });

      if (error) {
        setBusy(false);
        return toast.error(friendlyError(error.message));
      }

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setBusy(false);
        return toast.error("An account with this email already exists. Use Sign In instead.");
      }

      const mail = await completeEmailSignup(address, data.user?.id);
      setBusy(false);
      if (!mail.ok) {
        toast.message(verifyEmailError(mail.error, "signup"));
      } else if (mail.alreadyVerified) {
        toast.success("This email is already verified. Sign in to continue.");
        setActiveTab("signin");
        return;
      } else {
        toast.success("Account created. Check your inbox — verify your email before you can sign in.");
      }
      navigate({
        to: "/auth/verify-email",
        search: { tab: "signup", email: address, purpose: "signup", redirect: search.redirect },
      });
    } catch (err: any) {
      setBusy(false);
      toast.error(friendlyError(err?.message || "Failed to create account"));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (activeTab === "signin") signIn();
      else signUp();
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10 sm:py-14 bg-slate-50/50">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Link to="/" aria-label="SmartZone Home">
              <SmartZoneLogo size="md" showTagline={true} />
            </Link>
          </div>

          <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
            {search.redirect === "/checkout" && (
              <div className="mb-5 rounded-xl border border-[#FF7A00]/30 bg-[#FF7A00]/8 px-4 py-3 text-sm text-[#0B192C]">
                <p className="font-semibold">Sign in to complete your order</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your cart is saved. After Sign In or Sign Up you will return to checkout.
                </p>
              </div>
            )}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full h-11">
                <TabsTrigger value="signin" className="min-h-[40px]">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="min-h-[40px]">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                {oauthNotice ? (
                  <p className="mb-3 text-sm text-destructive leading-snug" role="alert">
                    {oauthNotice}
                  </p>
                ) : null}
                <GoogleAuthButton nextPath={search.redirect} disabled={busy} />

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or with email</span>
                  </div>
                </div>
              </div>

              {/* ─── Sign In ─── */}
              <TabsContent value="signin" className="space-y-4 mt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="si-email">Email Address</Label>
                  <Input
                    id="si-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="si-pw">Password</Label>
                    <Link
                      to="/auth/forgot-password"
                      search={{ tab: "signin" }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="si-pw"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
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
                  onClick={signIn}
                  disabled={busy}
                  className="w-full min-h-[48px] text-base font-semibold bg-[#FF7A00] hover:bg-[#E56E00] text-white shadow-xs transition-all"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("signup")}
                    className="text-xs text-[#0052B4] font-bold hover:underline cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </TabsContent>

              {/* ─── Sign Up ─── */}
              <TabsContent value="signup" className="space-y-4 mt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Full Name</Label>
                  <Input
                    id="su-name"
                    autoComplete="name"
                    placeholder="Username"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email Address</Label>
                  <Input
                    id="su-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="su-pw">Password</Label>
                  <div className="relative">
                    <Input
                      id="su-pw"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
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

                <div className="space-y-1.5">
                  <Label htmlFor="su-pw2">Confirm password</Label>
                  <Input
                    id="su-pw2"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <Button
                  onClick={signUp}
                  disabled={busy}
                  className="w-full min-h-[48px] text-base font-semibold bg-[#FF7A00] hover:bg-[#E56E00] text-white shadow-xs transition-all"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                  We email a 6-digit code and a Confirm email button. You cannot sign in until that
                  mailbox is verified.
                </p>

                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("signin")}
                    className="text-xs text-[#0052B4] font-bold hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
            By signing in or creating an account, you agree to SmartZone's Terms of Service and
            Privacy Policy.
          </p>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Are you a seller?{" "}
            <Link to="/vendor/auth" className="font-semibold text-[#0052B4] hover:underline">
              Open Seller Center
            </Link>
          </p>
        </div>
    </div>
  );
}
