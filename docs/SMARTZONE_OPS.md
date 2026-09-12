# SmartZone (smartzone.pk) — Operations Guide

Last updated: 2026-09-13  
Repo: https://github.com/HuzaifaQuresh/ecommerce_business  
Production: https://smartzone.pk · https://www.smartzone.pk

> **Secrets:** Real API keys / passwords live only in `docs/CREDENTIALS.local.md` (gitignored) and Cloudflare/Supabase dashboards. Never commit `.env` or `CREDENTIALS.local.md`.

---

## 1. Stack

| Layer | Technology |
| --- | --- |
| Frontend / SSR | TanStack Start + Vite + React + Tailwind |
| Hosting | Cloudflare Workers (`ecommerce-business`) |
| Database / Auth | Supabase Postgres + Auth (`sperknmkbyrbmebipnfq`) |
| Storage | Supabase Storage bucket `product-images` |
| Inbox KV | Cloudflare KV `b90e185fa3ae45f9999c863a2aaeae6f` (binding `INBOX`) |
| Inbound email | Worker `smartzone-inbox` ← Email Routing `info@smartzone.pk` |
| Outbound customer mail | Prefer Worker secret `RESEND_API_KEY` (Resend) |

---

## 2. Domains & workers

| Item | Value |
| --- | --- |
| Custom domains | `smartzone.pk`, `www.smartzone.pk` |
| Main worker | `ecommerce-business` |
| Workers.dev | `https://ecommerce-business.huzaifaqur67.workers.dev` |
| Inbox worker | `smartzone-inbox` |
| Inbox health | `https://smartzone-inbox.huzaifaqur67.workers.dev/health` |
| Admin | https://smartzone.pk/admin |
| Audit trail | https://smartzone.pk/admin/audit |
| Inbox UI | https://smartzone.pk/admin/inbox |
| Site survey | https://smartzone.pk/admin/site-survey |

### Deploy

```bash
cd ecommerce_business
npm run deploy          # build + wrangler deploy (main site)
npm run deploy:inbox    # inbox email worker only
```

### Cloudflare Email Routing

- Rule: `info@smartzone.pk` → worker `smartzone-inbox`
- Catch-all: forward → `huzaifaqur67@gmail.com`
- MX: Cloudflare `route1/2/3.mx.cloudflare.net`
- **Loop protection:** mail FROM verified Gmail destination TO `info@` is dropped. Test inbound from another address.

---

## 3. Supabase

| Item | Value |
| --- | --- |
| Project name | huzaifaqur |
| Project ref | `sperknmkbyrbmebipnfq` |
| URL | `https://sperknmkbyrbmebipnfq.supabase.co` |
| Region | ap-south-1 |
| Dashboard | https://supabase.com/dashboard/project/sperknmkbyrbmebipnfq |

### Important tables

`orders`, `order_items`, `products`, `product_inventory`, `product_reviews`, `vouchers`, `profiles`, `user_roles`, `vendors`, `vendor_applications`, `audit_logs`, `site_settings`

### Roles

`user` · `vendor` · `admin` · `super_admin`

Super admin email (ops): `huzaifaqur67@gmail.com`

---

## 4. Local development

```bash
cp .env.example .env   # fill keys from CREDENTIALS.local.md
npm install
npm run dev            # or npm run dev:win on Windows
```

Required env (see `.env.example`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon)
- Optional: `SUPABASE_SERVICE_ROLE_KEY`, Google OAuth, Stripe, `VITE_GA_MEASUREMENT_ID`

Worker secrets (production, not in git):

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # if auth-mail needs it on CF
```

---

## 5. Admin feature map

| Area | Path | Notes |
| --- | --- | --- |
| Orders | `/admin/orders` | Status, delete (stock restore), payment breakdown |
| Order detail | `/admin/orders/$id` | Tracking, line fulfillment, delete |
| Audit trail | `/admin/audit` | Status/delete/tracking/role events; filter + clear |
| Inbox | `/admin/inbox` | Contact / IoT / inbound email |
| Site survey | `/admin/site-survey` | Survey leads + forward |
| Products | `/admin/products` | Catalog upsert by slug |
| Settings | `/admin/settings` | Hero, promos, payments, tax |
| Users | `/admin/users` | Super admin only |

### Cart / wishlist

Scoped per user in `localStorage` (`nexus_cart_v1:u:<id>`, guest bucket). Logout no longer leaks cart across accounts.

### Banner images

Hero / promo / solutions use CDN `resize=cover` + CSS `object-cover` (no letterboxing).

### FOUC

Stylesheet is render-blocking in `__root.tsx` (async `media=print` trick removed).

---

## 6. Contacts / mail

| Purpose | Address |
| --- | --- |
| Public / routing | `info@smartzone.pk` |
| Admin notify / Email Routing destination | `huzaifaqur67@gmail.com` |
| Forms / leads | Admin Inbox + optional Gmail forward |

---

## 7. Git & docs

| File | Purpose | In git? |
| --- | --- | --- |
| `docs/SMARTZONE_OPS.md` | This ops guide | Yes |
| `docs/CREDENTIALS.example.md` | Blank checklist | Yes |
| `docs/CREDENTIALS.local.md` | **Real secrets** | **No (gitignored)** |
| `.env` | Local env | No |
| `.dev.vars` | Wrangler local secrets | No |

---

## 8. Incident notes

1. **Chunk load error after deploy** — hard refresh; asset 404s must not use HTML CDN cache (`http-cache.ts`).
2. **Empty inbox** — test from non-Gmail destination; check `/health` and Email Routing rule.
3. **Order delete fails** — needs staff DELETE RLS on `orders` / `order_items`.
4. **Audit empty for status** — DB trigger `tr_log_order_status_change` writes `ORDER_STATUS_CHANGE`.
