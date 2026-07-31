import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AccountShell } from "@/components/account/AccountShell";

export const Route = createFileRoute("/account")({
  beforeLoad: async ({ location }) => {
    // Order tracking and order detail routes allow guest access
    if (location.pathname.startsWith("/account/orders")) {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
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
