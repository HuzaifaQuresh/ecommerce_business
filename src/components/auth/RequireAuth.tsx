import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { persistPendingVerification } from "@/lib/verify-email";
import { needsEmailVerification } from "@/lib/email-verified";
import type { AppRole } from "@/types/commerce";

export function RequireAuth({
  children,
  roles,
  redirectTo = "/auth",
}: {
  children: React.ReactNode;
  roles?: AppRole[];
  redirectTo?: string;
}) {
  const { user, roles: userRoles, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const allowed = !roles?.length || roles.some((role) => userRoles.includes(role));
  const rolesPending = Boolean(user && loading);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: redirectTo, search: { redirect: pathname, tab: undefined } });
      return;
    }
    if (needsEmailVerification(user)) {
      const address = user.email?.trim().toLowerCase();
      if (address) persistPendingVerification(address, "signup");
      navigate({
        to: "/auth/verify-email",
        search: { tab: "signup", email: address, purpose: "signup", redirect: pathname },
      });
      return;
    }
    if (roles?.length && !allowed) {
      navigate({ to: "/" });
    }
  }, [allowed, loading, navigate, pathname, redirectTo, roles?.length, user]);

  if (loading || rolesPending || !user || !allowed || needsEmailVerification(user)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
