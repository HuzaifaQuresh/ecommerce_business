# Deploy NexusIoT on Vercel

This app uses **TanStack Start** (SSR). Vercel needs the **Nitro** adapter (already wired in `vite.config.ts` when `VERCEL=1` during build).

## 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Prepare Vercel deployment"
git remote add origin https://github.com/YOUR_ORG/nexusiot.git
git push -u origin main
```

## 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework preset: **TanStack Start** (auto-detected) or **Other**
4. Build settings (defaults are usually fine):

| Setting          | Value                             |
| ---------------- | --------------------------------- |
| Build Command    | `npm run build`                   |
| Install Command  | `npm install`                     |
| Output Directory | _(leave empty — Nitro sets this)_ |

Do **not** add SPA `rewrites` in `vercel.json`; Nitro handles routing.

## 3. Environment variables

In **Project → Settings → Environment Variables**, add for **Production**, **Preview**, and **Development**:

| Name                            | Value                                      |
| ------------------------------- | ------------------------------------------ |
| `VITE_SUPABASE_URL`             | `https://dypyvfuscpuzhrvrmebk.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase **anon** key                 |

Optional (only if you use server-side admin client):

| Name                        | Value                                         |
| --------------------------- | --------------------------------------------- |
| `SUPABASE_URL`              | Same as above                                 |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**never** expose to client) |

## 4. Supabase Auth redirect URLs

In [Supabase → Authentication → URL Configuration](https://supabase.com/dashboard/project/dypyvfuscpuzhrvrmebk/auth/url-configuration):

- **Site URL:** `https://YOUR-APP.vercel.app`
- **Redirect URLs:** add `https://YOUR-APP.vercel.app/**` and `http://localhost:5173/**`

## 5. Deploy

Click **Deploy**. Vercel sets `VERCEL=1` during build → Nitro `vercel` preset runs automatically.

If routes 404 after deploy: **Deployments → … → Redeploy → clear build cache**.

## 6. Super admin on production

1. Sign up at `https://YOUR-APP.vercel.app/auth`, **or** create user in Supabase Auth
2. Grant role in SQL Editor (see `docs/SUPER_ADMIN.md`)

## Local Vercel-style build test

```powershell
cd D:\automatiq-grid-main
$env:VERCEL = "1"
npm run build
```

Cloudflare build (local):

```powershell
$env:DEPLOY_TARGET = "cloudflare"
npm run build
```

## CLI deploy (optional)

```powershell
npm i -g vercel
vercel login
vercel link
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY
vercel --prod
```
