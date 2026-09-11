import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { getAuthRedirectTo, rememberAuthNext } from "@/lib/auth-redirect";

function extractAuthMessage(raw: string): string {
  const text = (raw || "").trim();
  if (!text) return "";
  const jsonStart = text.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(text.slice(jsonStart)) as {
        msg?: string;
        message?: string;
        error_description?: string;
        error?: string;
      };
      return parsed.msg || parsed.message || parsed.error_description || parsed.error || text;
    } catch {
      return text;
    }
  }
  return text;
}

export function googleAuthError(message: string, code?: string): string {
  const extracted = extractAuthMessage(message);
  const m = `${code || ""} ${extracted} ${message}`.toLowerCase();
  if (
    m.includes("provider is not enabled") ||
    m.includes("unsupported provider") ||
    m.includes("validation_failed")
  ) {
    return "Google sign-in is not enabled yet. Enable it in Supabase Auth → Providers → Google.";
  }
  if (m.includes("redirect") || m.includes("invalid request") || m.includes("redirect_uri")) {
    return "Google could not return to this site. Add this origin’s /auth/callback in Supabase Auth → URL Configuration.";
  }
  if (m.includes("access_denied") || m.includes("user cancelled") || m.includes("popup_closed")) {
    return "Google sign-in was cancelled.";
  }
  if (m.includes("already registered") || m.includes("identity") || m.includes("manual linking")) {
    return "This email already has a SmartZone account. Sign in with email first.";
  }
  return extracted || "Google sign-in failed. Try again.";
}

export async function startGoogleSignIn(nextPath?: string): Promise<{ error?: string }> {
  if (typeof window === "undefined") {
    return { error: "Google sign-in is only available in the browser." };
  }

  if (!isSupabaseConfigured()) {
    return { error: "Store login is running in local demo mode, so Google sign-in is unavailable." };
  }

  rememberAuthNext(nextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthRedirectTo("/auth/callback"),
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return { error: googleAuthError(error.message, (error as { code?: string }).code) };
  }

  if (!data.url) {
    return { error: "Google did not return a sign-in URL. Try again." };
  }

  const authorize = new URL(data.url);
  authorize.searchParams.set("redirect_to", getAuthRedirectTo("/auth/callback"));
  window.location.assign(authorize.toString());
  return {};
}
