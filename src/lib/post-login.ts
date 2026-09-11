import { supabase } from "@/integrations/supabase/client";
import { loadUserRoles } from "@/lib/auth-roles";
import { ensureAuthProfile } from "@/lib/auth-profile";
import { safeInternalPath } from "@/lib/auth-redirect";
import { finalizeVendorRegistration } from "@/lib/vendor-onboarding";
import { needsEmailVerification } from "@/lib/email-verified";

export function loginIntentFromPath(path?: string | null): "customer" | "vendor" {
  const next = safeInternalPath(path);
  if (next?.startsWith("/vendor")) return "vendor";
  return "customer";
}

export async function resolvePostLoginPath(opts?: {
  intent?: "customer" | "vendor";
  explicitNext?: string | null;
}): Promise<string> {
  const intent = opts?.intent ?? "customer";
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return intent === "vendor" ? "/vendor/auth" : "/auth";
  if (needsEmailVerification(session.user)) {
    const email = encodeURIComponent(session.user.email || "");
    return `/auth/verify-email?tab=signup&purpose=signup&email=${email}`;
  }

  await ensureAuthProfile(session.user);
  if (intent === "vendor") {
    try {
      await finalizeVendorRegistration(session.user);
    } catch {
      /* application can be completed on Seller Center */
    }
  }

  const roles = await loadUserRoles(session.user.id, session.user.email);
  if (roles.includes("super_admin") || roles.includes("admin")) return "/admin";
  if (roles.includes("vendor")) return "/vendor";

  const next = safeInternalPath(opts?.explicitNext);
  if (next && next !== "/" && !next.startsWith("/vendor")) return next;
  if (intent === "vendor") return "/vendor/auth";
  return "/account";
}
