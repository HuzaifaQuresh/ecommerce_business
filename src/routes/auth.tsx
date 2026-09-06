import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle2, Lock } from "lucide-react";
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
  }),
  component: Auth,
});

/** Maps Supabase error messages to friendly copy */
function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid email or password"))
    return "Incorrect email or password. Double-check and try again.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the verification link.";
  if (m.includes("user already registered"))
    return "An account with this email already exists. Use Sign In instead.";
  if (m.includes("password should be at least")) return "Password must be at least 6 characters.";
  if (m.includes("rate limit")) return "Too many attempts — wait a minute and try again.";
  return msg;
}

function Auth() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [activeTab, setActiveTab] = useState<string>(search.tab === "signup" ? "signup" : "signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title =
      activeTab === "signup"
        ? "Sign Up — SmartZone — IT Solutions, Smart Automation & Electronics"
        : "Sign In — SmartZone — IT Solutions, Smart Automation & Electronics";
  }, [activeTab]);

  /** Reads roles from DB and sends user to correct workspace */
  const redirectAfterAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate({ to: "/" });
      return;
    }

    if (search.redirect) {
      navigate({ to: search.redirect as "/" });
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const list = (roles ?? []).map((r) => r.role as AppRole);

    if (list.includes("super_admin") || list.includes("admin")) {
      navigate({ to: "/admin" });
      return;
    }
    if (list.includes("vendor")) {
      navigate({ to: "/vendor" });
      return;
    }
    navigate({ to: "/account" });
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
        return toast.error(friendlyError(error.message));
      }

      toast.success("Signed in successfully");
      await redirectAfterAuth();
    } catch (err: any) {
      setBusy(false);
      toast.error(friendlyError(err?.message || "Failed to sign in"));
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setBusy(false);
        toast.error(friendlyError(error.message));
      }
    } catch (err: any) {
      setBusy(false);
      toast.error(friendlyError(err?.message || "Failed to sign in with Google"));
    }
  };

  const signUp = async () => {
    if (!email.trim()) return toast.error("Enter your email address");
    if (!password) return toast.error("Choose a password");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: name.trim() },
        },
      });

      setBusy(false);

      if (error) {
        return toast.error(friendlyError(error.message));
      }

      if (data?.session || !isSupabaseConfigured()) {
        toast.success("Account created — welcome!");
        await redirectAfterAuth();
      } else {
        toast.success("Account created! Check your email for a confirmation link.");
      }
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
    <div className="min-h-[calc(100vh-8rem)] grid lg:grid-cols-2">
      {/* Left panel — branding tile */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white bg-gradient-to-br from-[#0B192C] via-[#0F2C59] to-[#0052B4] relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#00A3E0]/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#FF7A00]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link to="/" className="inline-block mb-8 group" aria-label="SmartZone Home">
            <SmartZoneLogo size="lg" dark={true} showTagline={true} />
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[#00A3E0] text-xs font-semibold uppercase tracking-wider mb-4 border border-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF7A00] animate-pulse" />
            Official Portal
          </div>

          <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
            SmartZone
            <span className="block text-xl xl:text-2xl font-semibold text-[#00A3E0] mt-1">
              IT Solutions, Smart Automation & Electronics
            </span>
          </h1>
          <p className="mt-4 text-slate-200 max-w-md leading-relaxed text-sm">
            Pakistan's premier IT solutions, smart automation & commerce portal. Sign in to manage
            orders, explore custom IoT solutions, and access your workspace.
          </p>

          <div className="mt-8 space-y-4 text-sm text-slate-200">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-[#00A3E0] shrink-0 mt-0.5 border border-white/10">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Secure Encrypted Authentication</p>
                <p className="text-xs text-slate-300">
                  Industry-standard credentials protection with Supabase Auth
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-[#FF7A00] shrink-0 mt-0.5 border border-white/10">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Real-Time Order Tracking</p>
                <p className="text-xs text-slate-300">
                  Monitor dispatch, track shipment status, and access receipts
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-[#38BDF8] shrink-0 mt-0.5 border border-white/10">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Personalized Workspace</p>
                <p className="text-xs text-slate-300">
                  Saved addresses, order history, and account settings in one place
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info in the tile */}
        <div className="relative z-10 pt-8 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
          <span>Best Tech, Best Future</span>
          <span className="text-slate-400">© {new Date().getFullYear()} SmartZone</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center px-4 py-10 sm:py-14 bg-slate-50/50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-6 lg:hidden">
            <Link to="/" aria-label="SmartZone Home">
              <SmartZoneLogo size="md" showTagline={true} />
            </Link>
          </div>

          <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={signInWithGoogle}
                  disabled={busy}
                  className="w-full min-h-[48px] font-medium flex items-center justify-center gap-2 hover:bg-muted/80"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Continue with Google
                </Button>

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
                    placeholder="e.g. Ahmed Khan"
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
        </div>
      </div>
    </div>
  );
}
