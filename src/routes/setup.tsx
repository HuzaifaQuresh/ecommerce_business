/**
 * /setup — First-time platform owner provisioning only.
 * Hidden from the storefront. Customers cannot self-promote.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { isPlatformOwnerEmail } from "@/lib/auth-roles";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle2, Loader2, ArrowRight, Shield, Store } from "lucide-react";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Platform Setup — SmartZone" }] }),
  component: Setup,
});

type Phase = "loading" | "noauth" | "done" | "owner" | "closed";

function Setup() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const inspect = async () => {
    if (!isSupabaseConfigured()) {
      const demoRole = localStorage.getItem("nexus_demo_role");
      const localUserStr = localStorage.getItem("nexus_local_user");
      let localRole = "";
      let localEmail = "";
      if (localUserStr) {
        try {
          const u = JSON.parse(localUserStr) as { role?: string; email?: string };
          localRole = u.role ?? "";
          localEmail = u.email ?? "";
        } catch {
          /* ignore */
        }
      }
      if (demoRole === "super_admin" || demoRole === "admin" || localRole === "super_admin" || localRole === "admin") {
        setEmail(localEmail);
        setPhase("done");
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setPhase("noauth");
        return;
      }
      setEmail(session.user.email ?? "");
      setPhase(isPlatformOwnerEmail(session.user.email) ? "owner" : "closed");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setPhase("noauth");
      return;
    }
    setEmail(session.user.email ?? "");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
    const list = (roles ?? []).map((r: { role: string }) => r.role);
    if (list.includes("super_admin") || list.includes("admin")) {
      setPhase("done");
      return;
    }
    setPhase(isPlatformOwnerEmail(session.user.email) ? "owner" : "closed");
  };

  useEffect(() => {
    void inspect();
  }, []);

  const activate = async () => {
    setBusy(true);
    setMessage("");
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc("bootstrap_super_admin" as any);
      const payload = data as { ok?: boolean; error?: string } | null;
      if (error || payload?.ok === false) {
        setBusy(false);
        setMessage(error?.message || payload?.error || "Could not complete setup.");
        if (/already exists/i.test(error?.message || payload?.error || "")) {
          setPhase("closed");
        }
        return;
      }
      await inspect();
      setBusy(false);
      return;
    }
    const localUser = {
      id: "usr-superadmin",
      email: email || "huzaifaqur67@gmail.com",
      full_name: "Muhammad Huzaifa (Super Admin)",
      role: "super_admin",
    };
    localStorage.setItem("nexus_local_user", JSON.stringify(localUser));
    localStorage.setItem("nexus_demo_role", "super_admin");
    window.dispatchEvent(new Event("nexus-auth-update"));
    setPhase("done");
    setBusy(false);
  };

  if (phase === "loading") {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF7A00]" />
      </div>
    );
  }

  if (phase === "noauth") {
    return (
      <Shell>
        <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-bold">Sign in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform setup is restricted. Sign in with the owner account to continue.
        </p>
        <Button
          className="mt-6 w-full min-h-[48px] bg-[#0B192C] hover:bg-[#0F2C59]"
          onClick={() => navigate({ to: "/auth", search: { tab: "signin" } })}
        >
          Go to Sign In
        </Button>
      </Shell>
    );
  }

  if (phase === "done") {
    return (
      <Shell>
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold">Workspace ready</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as <strong className="text-foreground">{email}</strong>. Staff access is
          already active.
        </p>
        <Button className="mt-6 w-full min-h-[48px] bg-[#0B192C] hover:bg-[#0F2C59]" onClick={() => navigate({ to: "/admin" })}>
          Open Admin Console <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Shell>
    );
  }

  if (phase === "closed") {
    return (
      <Shell>
        <Shield className="mx-auto h-12 w-12 text-[#0B192C]" />
        <h1 className="mt-4 text-xl font-bold">Staff access is assigned, not self-activated</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          SmartZone already has a platform owner. Customer accounts cannot grant Super Admin.
          Request a role from the owner in Admin → Users &amp; Roles, or apply to sell as a vendor.
        </p>
        {message ? <p className="mt-3 text-sm text-amber-700">{message}</p> : null}
        <div className="mt-6 grid gap-2">
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link to="/vendor/auth" search={{ tab: "register" }}>
              <Store className="mr-2 h-4 w-4" /> Open Seller Center
            </Link>
          </Button>
          <Button asChild className="min-h-[44px] bg-[#0B192C] hover:bg-[#0F2C59]">
            <Link to="/account">Back to My Account</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FF7A00]/15">
        <Crown className="h-7 w-7 text-[#FF7A00]" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">First-time platform setup</h1>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        This grants Super Admin to the signed-in owner account{" "}
        <strong className="text-foreground">{email}</strong>. It only works when no Super Admin
        exists yet.
      </p>
      {message ? <p className="mt-3 text-sm text-amber-700">{message}</p> : null}
      <Button
        className="mt-6 w-full min-h-[48px] bg-[#0B192C] hover:bg-[#0F2C59]"
        disabled={busy}
        onClick={() => void activate()}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Provisioning…
          </>
        ) : (
          <>
            <Crown className="mr-2 h-4 w-4" /> Provision Super Admin
          </>
        )}
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">
        After this, manage every other user from Admin → Users &amp; Roles. Do not share this URL.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-[var(--shadow-elevated)]">
        {children}
      </div>
    </div>
  );
}
