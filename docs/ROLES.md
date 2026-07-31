# NexusIoT — Role-based access

| Role            | Workspace  | Access                                                               |
| --------------- | ---------- | -------------------------------------------------------------------- |
| **super_admin** | `/admin`   | Full admin + **Users & Roles** (`/admin/users`), vendor provisioning |
| **admin**       | `/admin`   | Products, orders, vouchers, analytics, settings                      |
| **vendor**      | `/vendor`  | Dashboard, products, orders, analytics, shop profile                 |
| **user**        | `/account` | Storefront, cart, checkout, profile, order history                   |

## Sign in

1. `/auth` — sign up or sign in (no demo passwords).
2. First user → **super_admin** (auto).
3. Redirect: admin → `/admin`, vendor → `/vendor`, else → `/`.

## Assign roles (super admin)

1. `/admin/users`
2. Pick role per user; **vendor** auto-creates a shop record.

## SQL (manual)

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role FROM auth.users WHERE email = 'you@company.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

See also `docs/SUPER_ADMIN.md`.
