import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AccountShell } from "@/components/account/AccountShell";
import { needsEmailVerification } from "@/lib/email-verified";

export const Route = createFileRoute("/account")({
  beforeLoad: async ({ location }) => {
    // Order tracking and order detail routes allow guest access
    if (location.pathname.startsWith("/account/orders")) {
      return;
    }

    // Session lives in the browser. Skip the server pass so a valid login
    // is not bounced back to /auth during SSR.
    if (typeof window === "undefined") return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    if (needsEmailVerification(session.user)) {
      throw redirect({
        to: "/auth/verify-email",
        search: {
          tab: "signup",
          email: session.user.email ?? undefined,
          purpose: "signup",
          redirect: location.pathname,
        },
      });
    }
  },
  component: AccountLayout,
});

function AccountLayout() {
  return (
    <AccountShell>
      <Outlet />
    </AccountShell>
  );
}
