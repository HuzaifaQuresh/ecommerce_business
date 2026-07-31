# NexusIoT — Architecture Overview

## Stack

| Layer         | Technology                                           |
| ------------- | ---------------------------------------------------- |
| UI            | React 19, Tailwind CSS 4, shadcn/ui, Lucide          |
| Routing       | TanStack Router (file-based routes in `src/routes/`) |
| SSR / hosting | TanStack Start, Cloudflare Workers                   |
| Data          | Supabase (Postgres + Auth + RLS)                     |
| Client cache  | TanStack Query                                       |

> **Note:** This project uses **TanStack Router**, not `react-router-dom`. Product URLs are `/products/:slug` with alias `/product/:slug`.

## Folder structure

```
src/
  api/              Supabase API wrappers (frontend ↔ backend contract)
  components/
    dashboard/      Admin & vendor shell, stat cards
    product/        PDP gallery, purchase panel, spec tabs
    site/           Header, footer, ProductCard, reviews, cart drawer
    ui/             shadcn primitives
  contexts/         CartContext (localStorage)
  hooks/            useAuth, useRole, useProduct, useSiteSettings
  integrations/     Supabase client + types
  lib/              formatters, utils
  routes/           One file per route (TanStack file routing)
  types/            commerce.ts shared types
supabase/migrations/ SQL schema + seeds
```

## Data flow

1. Route `loader` / component calls `useQuery` + `src/api/*` functions.
2. API functions use `@/integrations/supabase/client`.
3. RLS policies enforce role-based access server-side.
4. Cart and search filters are client-side; orders persist to `orders` + `order_items`.

## Role matrix

| Capability           | user | vendor | admin | super_admin |
| -------------------- | ---- | ------ | ----- | ----------- |
| Shop / checkout      | ✓    | ✓      | ✓     | ✓           |
| Vendor dashboard     |      | ✓      | ✓     | ✓           |
| Platform admin       |      |        | ✓     | ✓           |
| Payment & user roles |      |        |       | ✓           |
