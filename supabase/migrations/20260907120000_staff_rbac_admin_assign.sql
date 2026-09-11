-- Staff RBAC: admins/super_admins can list users, assign roles, and manage vendors.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  actor_role TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  old_role TEXT,
  new_role TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view own profile" ON public.profiles;
DROP POLICY IF EXISTS "view own or staff profiles" ON public.profiles;
CREATE POLICY "view own or staff profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "update own profile" ON public.profiles;
DROP POLICY IF EXISTS "update own or staff profiles" ON public.profiles;
CREATE POLICY "update own or staff profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "staff read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "staff read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "staff manage vendor apps" ON public.vendor_applications;
CREATE POLICY "staff manage vendor apps"
  ON public.vendor_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "staff manage vendors" ON public.vendors;
CREATE POLICY "staff manage vendors"
  ON public.vendors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.admin_assign_role(
  _target_user_id UUID,
  _new_role public.app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id UUID := auth.uid();
  _actor_is_super BOOLEAN;
  _actor_is_admin BOOLEAN;
  _old_role public.app_role;
  _super_count INT;
  _shop TEXT;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: sign in required';
  END IF;

  _actor_is_super := public.has_role(_actor_id, 'super_admin');
  _actor_is_admin := public.has_role(_actor_id, 'admin');

  IF NOT (_actor_is_super OR _actor_is_admin) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  IF _new_role = 'super_admin' AND NOT _actor_is_super THEN
    RAISE EXCEPTION 'Only Super Admins can assign Super Admin';
  END IF;

  SELECT r.role INTO _old_role
  FROM public.user_roles r
  WHERE r.user_id = _target_user_id
  ORDER BY CASE r.role
    WHEN 'super_admin' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'vendor' THEN 2
    ELSE 1
  END DESC
  LIMIT 1;

  IF _old_role = 'super_admin' AND _new_role IS DISTINCT FROM 'super_admin' THEN
    SELECT COUNT(*) INTO _super_count FROM public.user_roles WHERE role = 'super_admin';
    IF _super_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last Super Admin';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role);

  IF _new_role = 'vendor' THEN
    SELECT COALESCE(NULLIF(full_name, ''), 'Vendor') INTO _shop
    FROM public.profiles WHERE id = _target_user_id;
    _shop := COALESCE(_shop, 'Vendor');
    INSERT INTO public.vendors (user_id, shop_name, slug)
    SELECT
      _target_user_id,
      _shop || ' Store',
      'shop-' || substr(_target_user_id::text, 1, 8)
    WHERE NOT EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = _target_user_id);
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, target_user_id, action, old_role, new_role)
  VALUES (
    _actor_id,
    CASE WHEN _actor_is_super THEN 'super_admin' ELSE 'admin' END,
    _target_user_id,
    'ROLE_CHANGE',
    COALESCE(_old_role::text, 'user'),
    _new_role::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_list_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role public.app_role,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    p.phone,
    COALESCE(ur.role, 'user'::public.app_role),
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT r.role
    FROM public.user_roles r
    WHERE r.user_id = u.id
    ORDER BY CASE r.role
      WHEN 'super_admin' THEN 4
      WHEN 'admin' THEN 3
      WHEN 'vendor' THEN 2
      ELSE 1
    END DESC
    LIMIT 1
  ) ur ON true
  ORDER BY u.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(UUID, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.staff_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_list_users() TO authenticated;
