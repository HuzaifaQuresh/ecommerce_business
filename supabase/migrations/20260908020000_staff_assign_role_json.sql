-- Users & Roles: return JSON from assign RPCs, allow audit inserts, assign by email.

DROP FUNCTION IF EXISTS public.admin_assign_role(UUID, public.app_role);
DROP FUNCTION IF EXISTS public.staff_assign_role_by_email(TEXT, public.app_role);

CREATE OR REPLACE FUNCTION public.admin_assign_role(
  _target_user_id UUID,
  _new_role public.app_role
)
RETURNS JSONB
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

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', _target_user_id,
    'old_role', COALESCE(_old_role::text, 'user'),
    'new_role', _new_role::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_assign_role_by_email(
  _email TEXT,
  _new_role public.app_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _target UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT u.id INTO _target
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(_email))
  LIMIT 1;

  IF _target IS NULL THEN
    RAISE EXCEPTION 'No SmartZone account with that email. Ask them to sign up first.';
  END IF;

  RETURN public.admin_assign_role(_target, _new_role);
END;
$$;

DROP POLICY IF EXISTS "staff insert audit logs" ON public.audit_logs;
CREATE POLICY "staff insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON FUNCTION public.admin_assign_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(UUID, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.staff_assign_role_by_email(TEXT, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_assign_role_by_email(TEXT, public.app_role) TO authenticated;

NOTIFY pgrst, 'reload schema';
