# Windows setup (NexusIoT)

## Status on your machine

| Step               | Result                                                                         |
| ------------------ | ------------------------------------------------------------------------------ |
| `npm install`      | OK                                                                             |
| `.env`             | Already configured (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)      |
| `supabase db push` | Blocked — Supabase CLI `.exe` blocked by **Application Control**               |
| `npm run dev`      | Blocked — native `.node` files (Rollup, Tailwind Oxide) blocked by same policy |

Error example:

```
An Application Control policy has blocked this file.
...\tailwindcss-oxide.win32-x64-msvc.node
```

This is an IT/security policy (WDAC / AppLocker), not a project bug.

## Fix dev server (pick one)

### A) IT allowlist (recommended)

Ask IT to allow **Node.js** to load native addons under your project folder, or allowlist:

- `node_modules\@rollup\rollup-win32-x64-msvc\*.node`
- `node_modules\@tailwindcss\oxide-win32-x64-msvc\*.node`

Then:

```powershell
cd D:\automatiq-grid-main
npm install
npm run dev
```

### A2) Use the Windows dev script (no Oxide — try this first)

```powershell
cd D:\automatiq-grid-main
npm install
npm run dev:win
```

Opens **http://localhost:5173** using Tailwind v3 + PostCSS instead of `@tailwindcss/oxide`.
Use `npm run dev` again once IT allowlists native binaries (full Tailwind v4).

### B) WSL2 (Linux node_modules)

```powershell
wsl
cd ~
git clone /mnt/d/automatiq-grid-main nexusiot   # or copy project into Linux home
cd nexusiot
npm install
npm run dev
```

Do **not** reuse `D:\...\node_modules` from WSL — install fresh inside Linux.

### C) Cloudflare preview (optional)

Deploy with Wrangler / Cloudflare Pages if you need a hosted preview while local policy is fixed.

`package.json` already includes Rollup WASM override for machines that only lack MSVC, not for full `.node` blocks.

## Apply database migrations (without CLI)

1. Open https://supabase.com/dashboard/project/dypyvfuscpuzhrvrmebk/sql/new
2. Run SQL from each file in order:
   - `supabase/migrations/20260524191802_*.sql` (if not already applied)
   - `supabase/migrations/20260524191822_*.sql`
   - `supabase/migrations/20260525133622_*.sql`
   - `supabase/migrations/20260526120000_platform_expansion.sql`

3. Or install Supabase CLI globally after IT allowlist:
   ```powershell
   scoop install supabase
   supabase login
   supabase link --project-ref dypyvfuscpuzhrvrmebk
   supabase db push
   ```

## After dev works

- Storefront: http://localhost:5173 (or port shown in terminal)
- Admin: sign in → `/admin`
- Product example: `/products/tuya-zigbee-pir`
