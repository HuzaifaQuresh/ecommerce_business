import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle2, ShieldCheck, XCircle, Eye, EyeOff } from "lucide-react";
import { persistPendingVerification, resendSignupEmail, completeEmailSignup, verifyEmailError } from "@/lib/verify-email";
import { getAuthRedirectTo } from "@/lib/auth-redirect";

interface LoginFormProps {
  onSuccess?: () => void;
  defaultMode?: "signin" | "signup";
}

export function LoginForm({ onSuccess, defaultMode = "signin" }: LoginFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password strength helper calculations
  const hasLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const strengthCount = [hasLength, hasLower, hasUpper, hasNumber, hasSpecial].filter(
    Boolean,
  ).length;

  const getStrengthLabel = () => {
    if (!password) return "";
    if (strengthCount <= 2) return "Weak";
    if (strengthCount <= 3) return "Fair";
    if (strengthCount <= 4) return "Good";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (strengthCount <= 2) return "bg-red-500";
    if (strengthCount <= 3) return "bg-orange-500";
    if (strengthCount <= 4) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (mode === "signup" && strengthCount < 3) {
      toast.error("Please choose a stronger password before creating your account");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        setBusy(false);

        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            persistPendingVerification(email.trim().toLowerCase(), "signup");
            await resendSignupEmail(email.trim().toLowerCase());
            toast.error("Please verify your email first. We sent a new confirmation link.");
            window.location.href = `/auth/verify-email?tab=signin&purpose=signup&email=${encodeURIComponent(email.trim().toLowerCase())}`;
            return;
          }
          toast.error(error.message || "Failed to sign in");
          return;
        }

        toast.success("Signed in successfully!");
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/account";
        }
      } else {
        // Sign Up with email verification
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo: getAuthRedirectTo("/auth/callback"),
          },
        });

        if (error) {
          setBusy(false);
          toast.error(error.message || "Failed to sign up");
          return;
        }

        const mail = await completeEmailSignup(email.trim().toLowerCase(), data.user?.id);
        setBusy(false);
        if (!mail.ok) {
          toast.message(verifyEmailError(mail.error, "signup"));
        } else {
          toast.success("Account created. Verify your email to continue.");
        }
        window.location.href = `/auth/verify-email?tab=signup&purpose=signup&email=${encodeURIComponent(email.trim().toLowerCase())}`;
      }
    } catch (err: any) {
      setBusy(false);
      toast.error(err?.message || "An unexpected error occurred");
    }
  };

  if (verificationSent) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Check Your Inbox</CardTitle>
          <CardDescription>
            We've sent a verification email to{" "}
            <span className="font-semibold text-foreground">{email}</span>. Please click the link
            inside to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setVerificationSent(false);
              setMode("signin");
            }}
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-md">
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">
          {mode === "signin" ? "Welcome Back" : "Create Account"}
        </CardTitle>
        <CardDescription>
          {mode === "signin"
            ? "Sign in to your account to continue"
            : "Register a new account with email verification"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg">
          <button
            type="button"
            className={`py-2 text-xs font-medium rounded-md transition-all ${
              mode === "signin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`py-2 text-xs font-medium rounded-md transition-all ${
              mode === "signup"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <GoogleAuthButton disabled={busy} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={busy}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "signin" && (
                <a href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {mode === "signup" && password.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Password Strength:</span>
                  <span className="font-semibold">{getStrengthLabel()}</span>
                </div>
                <div className="grid grid-cols-5 gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${strengthCount >= 1 ? getStrengthColor() : "bg-transparent"}`}
                  />
                  <div
                    className={`h-full transition-all ${strengthCount >= 2 ? getStrengthColor() : "bg-transparent"}`}
                  />
                  <div
                    className={`h-full transition-all ${strengthCount >= 3 ? getStrengthColor() : "bg-transparent"}`}
                  />
                  <div
                    className={`h-full transition-all ${strengthCount >= 4 ? getStrengthColor() : "bg-transparent"}`}
                  />
                  <div
                    className={`h-full transition-all ${strengthCount >= 5 ? getStrengthColor() : "bg-transparent"}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-muted-foreground">
                  <div
                    className={`flex items-center gap-1 ${hasLength ? "text-emerald-600 font-medium" : ""}`}
                  >
                    {hasLength ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-muted-foreground/40 shrink-0" />
                    )}
                    <span>At least 8 chars</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 ${hasUpper && hasLower ? "text-emerald-600 font-medium" : ""}`}
                  >
                    {hasUpper && hasLower ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-muted-foreground/40 shrink-0" />
                    )}
                    <span>Upper & lowercase</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 ${hasNumber ? "text-emerald-600 font-medium" : ""}`}
                  >
                    {hasNumber ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-muted-foreground/40 shrink-0" />
                    )}
                    <span>At least one number</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 ${hasSpecial ? "text-emerald-600 font-medium" : ""}`}
                  >
                    {hasSpecial ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-muted-foreground/40 shrink-0" />
                    )}
                    <span>Special character</span>
                  </div>
                </div>
              </div>
            )}

            {mode === "signin" && (
              <p className="text-[11px] text-muted-foreground">
                Must be at least 6 characters long.
              </p>
            )}
          </div>

          <Button type="submit" disabled={busy} className="w-full h-11 font-medium">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                {mode === "signin" ? "Signing In..." : "Creating Account..."}
              </>
            ) : mode === "signin" ? (
              "Sign In with Email"
            ) : (
              "Create Account & Verify"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
