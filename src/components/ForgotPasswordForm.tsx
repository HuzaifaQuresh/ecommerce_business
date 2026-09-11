import React, { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import { persistPendingVerification } from "@/lib/verify-email";
import { getPasswordResetRedirectTo } from "@/lib/password-recovery";

interface ForgotPasswordFormProps {
  onBack?: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
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

    setBusy(true);
    try {
      persistPendingVerification(email.trim().toLowerCase(), "recovery");
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: getPasswordResetRedirectTo(),
      });

      setBusy(false);

      if (error) {
        toast.error(error.message || "Failed to send password reset email");
        return;
      }

      if (!isSupabaseConfigured()) {
        window.location.href = "/auth/reset-password";
        return;
      }

      toast.success("Check your email to verify this reset request.");
      window.location.href = `/auth/verify-email?tab=signin&purpose=recovery&email=${encodeURIComponent(email.trim().toLowerCase())}`;
    } catch (err: any) {
      setBusy(false);
      toast.error(err?.message || "An unexpected error occurred");
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Check Your Email</CardTitle>
          <CardDescription>
            We have sent password reset instructions to{" "}
            <span className="font-semibold text-foreground">{email}</span>. Please check your inbox
            and follow the link to update your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                window.location.href = "/auth";
              }
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-md">
      <CardHeader className="text-center space-y-1">
        <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
          <KeyRound className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password?</CardTitle>
        <CardDescription>
          Enter your account email address and we will send you a secure link to reset your
          password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email Address</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />
          </div>

          <Button type="submit" disabled={busy} className="w-full h-11 font-medium">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Reset Link...
              </>
            ) : (
              "Send Reset Instructions"
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                window.location.href = "/auth";
              }
            }}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
