/**
 * Pushes Site URL, redirect allow-list, and SmartZone email templates
 * to the live huzaifaqur project.
 *
 *   node scripts/push-auth-mail.mjs
 *
 * Needs SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "sperknmkbyrbmebipnfq";

function loadEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i < 1) continue;
      out[trimmed.slice(0, i)] = trimmed.slice(i + 1);
    }
  } catch {
    /* missing file */
  }
  return out;
}

const env = { ...loadEnv(resolve(".env")), ...process.env };
const token = env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_PAT || "";
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const recoveryHtml = readFileSync(resolve("supabase/templates/recovery.html"), "utf8");
const confirmHtml = readFileSync(resolve("supabase/templates/confirmation.html"), "utf8");

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    site_url: "https://smartzone.pk",
    uri_allow_list: [
      "https://smartzone.pk/auth/callback",
      "https://smartzone.pk/auth/reset-password",
      "https://smartzone.pk/auth/verify-email",
      "https://smartzone.pk/**",
      "http://localhost:3000/auth/callback",
      "http://localhost:3000/auth/reset-password",
      "http://localhost:3000/auth/verify-email",
      "http://localhost:3000/**",
    ].join(","),
    mailer_subjects_recovery: "Your SmartZone password reset code",
    mailer_templates_recovery_content: recoveryHtml,
    mailer_subjects_confirmation: "Confirm your SmartZone email",
    mailer_templates_confirmation_content: confirmHtml,
  }),
});

const text = await res.text();
if (!res.ok) {
  console.error("Supabase rejected the update:", res.status, text.slice(0, 800));
  process.exit(1);
}
console.log("Auth Site URL, redirect URLs, and email templates updated on huzaifaqur.");
