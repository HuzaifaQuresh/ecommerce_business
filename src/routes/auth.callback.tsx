/**
 * /auth/callback
 * Handles all Supabase Auth redirect flows:
 *  - Email confirmation   (type=signup)
 *  - Password reset       (type=recovery)
 *  - Magic link           (type=magiclink)
 *
 * Supabase embeds tokens in the URL hash (#access_token=…&type=…).
 * This component reads them, exchanges them for a session, and redirects.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Authenticating… — NexusIoT" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "error" | "done">("processing");
  const [message, setMessage] = useState("Verifying your link…");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";

    // Parse fragment params: #access_token=…&type=recovery&…
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const errorDesc = params.get("error_description");

    if (errorDesc) {
      setStatus("error");
      setMessage(decodeURIComponent(errorDesc));
      return;
    }

    if (!accessToken) {
      // Maybe Supabase already exchanged the session (PKCE flow)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          handleType(type ?? "signup");
        } else {
          setStatus("error");
          setMessage("Invalid or expired link. Please request a new one.");
        }
      });
      return;
    }

    // Set the session from tokens in the URL
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken ?? "" })
      .then(({ error }) => {
        if (error) {
          setStatus("error");
          setMessage(error.message);
        } else {
          handleType(type ?? "signup");
        }
      });
  }, []);

  const handleType = (type: string) => {
    if (type === "recovery") {
      setMessage("Password reset verified — redirecting…");
      setStatus("done");
      setTimeout(() => navigate({ to: "/auth/reset-password" }), 800);
    } else {
      // signup, magiclink, invite → send to role-based dashboard
      setMessage("Email confirmed — signing you in…");
      setStatus("done");
      setTimeout(async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          navigate({ to: "/auth" });
          return;
        }
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        const list = (roles ?? []).map((r) => r.role as string);
        if (list.includes("super_admin") || list.includes("admin")) {
          navigate({ to: "/admin" });
        } else if (list.includes("vendor")) {
          navigate({ to: "/vendor" });
        } else {
          navigate({ to: "/account" });
        }
      }, 800);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center rounded-2xl border bg-card p-10 shadow-lg">
        {status === "processing" && (
          <>
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <p className="font-semibold text-lg">Verifying…</p>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
            <p className="font-semibold text-lg">Success</p>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="font-semibold text-lg">Link invalid or expired</p>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
            <div className="flex flex-col gap-2 mt-6">
              <Button onClick={() => navigate({ to: "/auth/forgot-password" })}>
                Request new link
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: "/auth" })}>
                Back to Sign In
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
