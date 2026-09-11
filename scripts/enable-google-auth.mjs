/**
 * Enables Google on the live Supabase project.
 * Requires SUPABASE_ACCESS_TOKEN (Account → Access Tokens) plus
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env
 *
 *   node scripts/enable-google-auth.mjs
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
const clientId = env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || "";
const clientSecret = env.GOOGLE_CLIENT_SECRET || "";

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}
if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    site_url: "https://smartzone.pk",
    external_google_enabled: true,
    external_google_client_id: clientId,
    external_google_secret: clientSecret,
    external_google_skip_nonce_check: true,
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
  }),
});

const text = await res.text();
if (!res.ok) {
  console.error("Supabase rejected the update:", res.status, text.slice(0, 500));
  process.exit(1);
}
console.log("Google provider enabled on huzaifaqur.");
