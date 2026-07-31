# NexusIoT — Master Build Prompt (copy for future AI sessions)

Build a production-grade IoT e-commerce platform (Daraz.pk UX + enterprise IoT solutions) using **React 19, Vite, TanStack Router/Start, Tailwind CSS 4, Supabase, Lucide icons**.

## Design

- Primary: `sky-500/600`, nav `slate-950`, backgrounds `slate-50`
- Hardware-vendor layout: scannable grids, sticky header, no clutter
- Buy Now CTA: `#f57224`

## Customer storefront

- Sticky nav: search → `/products?q=`, cart badge, category bar
- `/products`: sidebar filters (category, PKR slider, availability, manufacturer), grid/list, sort
- `/products/:slug` and alias `/product/:slug`: gallery, IoT meta, qty, Add to Cart / Buy Now, overview + specs tabs, DB reviews, related products
- `/iot-solutions`: enterprise packages
- `/cart`, `/checkout` (3 steps, vouchers, payment methods from `site_settings`)
- `/account`, `/account/orders`

## Roles & dashboards

- `user`, `vendor`, `admin`, `super_admin` in `user_roles`
- `/vendor/*`: vendor SKU + analytics
- `/admin/*`: products CRUD, orders, vouchers, analytics, settings (payments)
- `/admin/users`: super_admin only

## API layer (`src/api/`)

Wrap Supabase: `products`, `orders`, `reviews`, `vouchers`, `settings`

## Hooks

`useAuth`, `useRole`, `useProduct`, `useSiteSettings`, `usePaymentMethods`, `useCart`

## Database

Apply `supabase/migrations/*.sql` — tables: products, orders, order_items, vouchers, product_reviews, vendors, site_settings, user_roles

## Deliverables checklist

- [ ] Responsive mobile/desktop
- [ ] Product card links to `/products/{slug}`
- [ ] RLS + env vars configured
- [ ] Seed vouchers NEXUS10, IOT500

See `docs/PROJECT_SPEC.md` and `docs/ARCHITECTURE.md` for run commands.
