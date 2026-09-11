/**
 * /auth/reset-password
 * Set a new password after the recovery email link establishes a session.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { SmartZoneLogo } from "@/components/site/SmartZoneLogo";
import { SetNewPasswordForm } from "@/components/site/SetNewPasswordForm";
import {
  establishSessionFromUrl,
  markPasswordRecovery,
  readAuthRedirectParams,
} from "@/lib/password-recovery";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — SmartZone — IT Solutions, Smart Automation & Electronics" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stop = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        markPasswordRecovery();
        if (!cancelled) {
          setBlocked(false);
          setChecking(false);
        }
      }
    });

    void (async () => {
      const params = readAuthRedirectParams();
      if (params.get("code") || params.get("type") === "recovery" || params.get("token_hash")) {
        markPasswordRecovery();
      }
      await establishSessionFromUrl();
      if (cancelled) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setBlocked(!session);
      setChecking(false);
    })();

    return () => {
      cancelled = true;
      stop.data.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 bg-slate-50/50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Link to="/" aria-label="SmartZone Home">
            <SmartZoneLogo size="md" showTagline={true} />
          </Link>
        </div>

        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
          {checking ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#FF7A00]" />
              <p className="font-semibold">Preparing password reset…</p>
            </div>
          ) : blocked ? (
            <div className="py-4 text-center">
              <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-amber-500" />
              <h1 className="text-2xl font-bold">Reset link expired</h1>
              <p className="text-muted-foreground mt-2">
                This password reset link is invalid or has already been used. Request a new 6-digit
                code.
              </p>
              <Button
                className="mt-6 w-full min-h-[48px] bg-[#FF7A00] hover:bg-[#E56E00]"
                onClick={() => navigate({ to: "/auth/forgot-password", search: { tab: "signin" } })}
              >
                Request new code
              </Button>
            </div>
          ) : (
            <SetNewPasswordForm />
          )}
        </div>
      </div>
    </div>
  );
}
