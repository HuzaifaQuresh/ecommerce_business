# Super admin login (NexusIoT)

There are **no built-in demo passwords**. Access uses **Supabase Auth** at `/auth`.

## New project (no users yet)

1. Open `http://localhost:5173/auth` (or your deployed URL + `/auth`).
2. **Sign up** with your work email and a strong password.
3. Confirm email if Supabase requires it (check project Auth settings).
4. **Sign in** — you are redirected to `/admin` automatically.
5. The **first** account receives role `super_admin` (full platform + **Users & Roles**).

## Existing project (you already signed up as a customer)

Run this in [Supabase SQL Editor](https://supabase.com/dashboard/project/dypyvfuscpuzhrvrmebk/sql/new) (replace the email):

```sql
-- Grant super_admin to your account
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM auth.users
WHERE email = 'your-email@company.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

Also apply migration `supabase/migrations/20260528120000_super_admin_login.sql` so `super_admin` inherits all `admin` database permissions.

## After login

| Role          | Menu                           | URL       |
| ------------- | ------------------------------ | --------- |
| `super_admin` | Account → **Super Admin**      | `/admin`  |
| `admin`       | Account → **Admin Dashboard**  | `/admin`  |
| `vendor`      | Account → **Vendor Dashboard** | `/vendor` |

### Super admin only

- `/admin/users` — assign `user`, `vendor`, `admin`, or `super_admin`

### Admin + super admin

- `/admin` — dashboard
- `/admin/products`, `/orders`, `/vouchers`, `/analytics`, `/settings`

## Environment

Ensure `.env` contains:

```
VITE_SUPABASE_URL=https://dypyvfuscpuzhrvrmebk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

Without these, sign-in will fail with a missing env error.
