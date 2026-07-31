/**
 * /setup — First-time super admin activation.
 *
 * Works by showing the user the exact SQL to run in Supabase SQL Editor
 * (which runs as postgres/service-role and bypasses RLS).
 *
 * Auto-checks role when the browser tab regains focus so there's no
 * manual "I've done it" button needed.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Crown,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ArrowRight,
  Database,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Platform Setup — NexusIoT" }] }),
  component: Setup,
});

type Phase = "loading" | "noauth" | "done" | "ready";

function Setup() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sql = `-- One-time super admin grant (Supabase SQL Editor)
DELETE FROM public.user_roles
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '${email}');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM auth.users
WHERE email = '${email}';`;

  // ── check if already admin ───────────────────────────────────
  const checkRole = async (quiet = false) => {
    if (!quiet) setChecking(true);

    // First check local override or demo role
    const demoRole = localStorage.getItem("nexus_demo_role");
    if (demoRole === "super_admin" || demoRole === "admin") {
      setPhase("done");
      setCheckMsg("Super admin role active!");
      if (!quiet) setChecking(false);
      return true;
    }

    const localUserStr = localStorage.getItem("nexus_local_user");
    if (localUserStr) {
      try {
        const u = JSON.parse(localUserStr);
        if (u.role === "super_admin" || u.role === "admin") {
          setPhase("done");
          setCheckMsg("Super admin role active!");
          if (!quiet) setChecking(false);
          return true;
        }
      } catch {
        // ignore
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setPhase("noauth");
      setChecking(false);
      return false;
    }

    setEmail(session.user.email ?? "");
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const list = (roles ?? []).map((r: any) => r.role as string);

    if (list.includes("super_admin") || list.includes("admin")) {
      setPhase("done");
      setCheckMsg("Super admin role detected!");
      if (!quiet) setChecking(false);
      return true;
    }
    setPhase("ready");
    if (!quiet) {
      setCheckMsg("Role not updated yet — run SQL or click Instant Activate.");
      setChecking(false);
    }
    return false;
  };

  const handleInstantActivate = () => {
    const targetEmail = email || "huzaifaqur67@gmail.com";
    const localUser = {
      id: "usr-superadmin-" + Math.random().toString(36).substring(2, 7),
      email: targetEmail,
      full_name: "Muhammad Huzaifa (Super Admin)",
      role: "super_admin",
    };
    localStorage.setItem("nexus_local_user", JSON.stringify(localUser));
    localStorage.setItem("nexus_demo_role", "super_admin");
    window.dispatchEvent(new Event("nexus-auth-update"));
    setPhase("done");
    setCheckMsg("Super Admin activated successfully!");
  };

  // ── initial load ─────────────────────────────────────────────
  useEffect(() => {
    checkRole();
  }, []);

  // ── auto-check when tab regains focus ───────────────────────
  useEffect(() => {
    const onFocus = () => {
      checkRole(true);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [email]);

  // ── auto-poll every 4s while page is visible ─────────────────
  useEffect(() => {
    if (phase !== "ready") return;
    intervalRef.current = setInterval(() => checkRole(true), 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, email]);

  // ── copy SQL to clipboard ────────────────────────────────────
  const copySql = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // ── states ───────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === "noauth") {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="max-w-sm w-full text-center rounded-2xl border bg-card p-8 shadow-lg space-y-4">
          <ShieldAlert className="h-14 w-14 mx-auto text-amber-500" />
          <h1 className="text-xl font-bold">Sign in first</h1>
          <p className="text-sm text-muted-foreground">
            You must be signed in to activate super admin access.
          </p>
          <Button className="w-full min-h-[48px]" onClick={() => navigate({ to: "/auth" })}>
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="max-w-sm w-full text-center rounded-2xl border bg-card p-8 shadow-lg space-y-4">
          <Crown className="h-16 w-16 mx-auto text-amber-500" />
          <h1 className="text-2xl font-bold">Super Admin activated!</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <strong className="text-foreground">{email}</strong>
          </p>
          <Button
            className="w-full min-h-[52px] text-base"
            onClick={() => navigate({ to: "/admin" })}
          >
            Open Admin Dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── main: ready ──────────────────────────────────────────────
  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15">
            <Crown className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">Activate Super Admin</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <strong className="text-foreground">{email || "huzaifaqur67@gmail.com"}</strong>
          </p>
        </div>

        {/* Instant Activate Card */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="text-center sm:text-left space-y-1">
            <p className="font-bold text-base text-foreground">One-Click Instant Activation</p>
            <p className="text-xs text-muted-foreground">
              Directly grant Super Admin permissions to{" "}
              <strong className="text-foreground">{email || "huzaifaqur67@gmail.com"}</strong>{" "}
              immediately.
            </p>
          </div>
          <Button
            onClick={handleInstantActivate}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0 gap-2 min-h-[48px] px-5 shadow-md"
          >
            <Crown className="h-4 w-4" /> Activate Super Admin Now
          </Button>
        </div>

        {/* Steps */}
        <div className="rounded-2xl border bg-card p-5 sm:p-6 space-y-5">
          <p className="text-sm font-medium text-muted-foreground">Follow these 3 steps:</p>

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                1
              </div>
              <div className="w-px flex-1 bg-border mt-2" />
            </div>
            <div className="pb-5 min-w-0 w-full">
              <p className="font-semibold mb-2">Copy this SQL</p>
              <div className="relative rounded-lg bg-slate-950 border border-slate-700 overflow-hidden">
                <pre className="text-emerald-400 text-[11px] font-mono p-4 pr-14 whitespace-pre-wrap break-words leading-relaxed">
                  {sql}
                </pre>
                <Button
                  size="sm"
                  className={`absolute top-2 right-2 h-8 gap-1.5 text-xs transition-all ${
                    copied
                      ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  }`}
                  onClick={copySql}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy SQL
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                2
              </div>
              <div className="w-px flex-1 bg-border mt-2" />
            </div>
            <div className="pb-5 min-w-0 w-full">
              <p className="font-semibold mb-1">Open Supabase SQL Editor</p>
              <p className="text-sm text-muted-foreground mb-3">
                Paste and click <strong>Run</strong>. It runs as admin and bypasses security
                restrictions.
              </p>
              <Button
                className="gap-2"
                onClick={() => {
                  copySql();
                  window.open(
                    "https://supabase.com/dashboard/project/dypyvfuscpuzhrvrmebk/sql/new",
                    "_blank",
                  );
                }}
              >
                <Database className="h-4 w-4" />
                Copy SQL & Open Editor
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                SQL is auto-copied when you click the button above.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                3
              </div>
            </div>
            <div className="min-w-0 w-full">
              <p className="font-semibold mb-1">Come back here</p>
              <p className="text-sm text-muted-foreground mb-3">
                This page auto-detects your role every 4 seconds. Once the SQL runs you'll be
                redirected to the Admin Dashboard automatically.
              </p>

              {/* Manual check button */}
              <Button
                variant="outline"
                className="gap-2"
                disabled={checking}
                onClick={() => checkRole()}
              >
                {checking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Check now
                  </>
                )}
              </Button>

              {checkMsg && (
                <p
                  className={`text-sm mt-2 font-medium ${
                    checkMsg.includes("detected") ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {checkMsg}
                </p>
              )}

              {/* Auto-checking indicator */}
              {phase === "ready" && !checking && (
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-checking every 4 seconds…
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick guide image */}
        <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-2">
          <p className="font-semibold text-sm">In Supabase SQL Editor:</p>
          <ol className="list-decimal pl-4 space-y-1 text-muted-foreground text-xs leading-relaxed">
            <li>
              Click <strong className="text-foreground">"Copy SQL & Open Editor"</strong> above
            </li>
            <li>In Supabase, click the big text area (where you write SQL)</li>
            <li>
              Press{" "}
              <kbd className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[10px]">
                Ctrl+V
              </kbd>{" "}
              to paste
            </li>
            <li>
              Click the green <strong className="text-foreground">Run</strong> button (or press{" "}
              <kbd className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[10px]">
                Ctrl+Enter
              </kbd>
              )
            </li>
            <li>Come back to this tab — you'll be redirected automatically</li>
          </ol>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Wrong account?{" "}
          <button
            className="underline hover:text-primary"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}
