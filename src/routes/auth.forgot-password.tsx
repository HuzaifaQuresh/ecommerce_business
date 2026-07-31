import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cpu, Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — NexusIoT" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return toast.error("Enter your email address");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(e, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Cpu className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">NexusIoT</span>
        </div>

        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500 mb-4" />
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="text-muted-foreground mt-2 leading-relaxed">
                We sent a password reset link to{" "}
                <strong className="text-foreground">{email}</strong>.
                <br />
                Click the link in the email to set a new password.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Didn't receive it? Check spam or{" "}
                <button
                  className="underline hover:text-primary"
                  onClick={() => {
                    setSent(false);
                  }}
                >
                  try again
                </button>
                .
              </p>
              <Button className="mt-6 w-full" onClick={() => navigate({ to: "/auth" })}>
                Back to Sign In
              </Button>
            </div>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-2 mb-4 text-muted-foreground hover:text-foreground"
              >
                <Link to="/auth">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sign In
                </Link>
              </Button>

              <h1 className="text-2xl font-bold">Forgot your password?</h1>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Enter the email address you signed up with and we'll send you a reset link.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="reset-email" className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email address
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    className="mt-1.5"
                  />
                </div>
                <Button onClick={send} disabled={busy} className="w-full min-h-[48px]">
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
