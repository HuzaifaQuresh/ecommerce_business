-- Super Admin account removal:
-- disable = block login immediately (orders kept, reversible)
-- restore = re-enable a disabled account
-- delete  = remove auth.users (orders stay, customer link SET NULL)

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_target_user_id_fkey;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_target_user_id_fkey
  FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

DROP FUNCTION IF EXISTS public.staff_list_users();

CREATE FUNCTION public.staff_list_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role public.app_role,
  created_at TIMESTAMPTZ,
  is_disabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    p.phone,
    COALESCE(ur.role, 'user'::public.app_role),
    u.created_at,
    (u.banned_until IS NOT NULL AND u.banned_until > now())
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

CREATE OR REPLACE FUNCTION public.admin_remove_user(
  _target_user_id UUID,
  _mode TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _actor_id UUID := auth.uid();
  _mode_clean TEXT := lower(trim(coalesce(_mode, '')));
  _email TEXT;
  _old_role public.app_role;
  _super_count INT;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: sign in required';
  END IF;

  IF NOT public.has_role(_actor_id, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: Super Admin access required';
  END IF;

  IF _mode_clean NOT IN ('disable', 'restore', 'delete') THEN
    RAISE EXCEPTION 'Invalid removal mode';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing account';
  END IF;

  IF _target_user_id = _actor_id THEN
    RAISE EXCEPTION 'You cannot remove your own account from here';
  END IF;

  SELECT u.email::text
    INTO _email
  FROM auth.users u
  WHERE u.id = _target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  _email := COALESCE(_email, '');

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

  IF COALESCE(_old_role, 'user'::public.app_role) = 'super_admin'
     AND _mode_clean IN ('disable', 'delete') THEN
    SELECT COUNT(*) INTO _super_count FROM public.user_roles WHERE role = 'super_admin';
    IF _super_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last Super Admin';
    END IF;
  END IF;

  IF _mode_clean = 'disable' THEN
    UPDATE auth.users
    SET banned_until = TIMESTAMPTZ '2099-12-31 00:00:00+00'
    WHERE id = _target_user_id;

    DELETE FROM auth.sessions WHERE user_id = _target_user_id;

    UPDATE public.vendors
    SET is_active = false
    WHERE user_id = _target_user_id;

    INSERT INTO public.audit_logs (actor_id, actor_role, target_user_id, action, old_role, new_role, metadata)
    VALUES (
      _actor_id,
      'super_admin',
      _target_user_id,
      'USER_DISABLE',
      COALESCE(_old_role::text, 'user'),
      'disabled',
      jsonb_build_object('email', _email)
    );

  ELSIF _mode_clean = 'restore' THEN
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = _target_user_id;

    IF _old_role = 'vendor' THEN
      UPDATE public.vendors
      SET is_active = true
      WHERE user_id = _target_user_id;
    END IF;

    INSERT INTO public.audit_logs (actor_id, actor_role, target_user_id, action, old_role, new_role, metadata)
    VALUES (
      _actor_id,
      'super_admin',
      _target_user_id,
      'USER_RESTORE',
      'disabled',
      COALESCE(_old_role::text, 'user'),
      jsonb_build_object('email', _email)
    );

  ELSE
    UPDATE public.vendors
    SET is_active = false
    WHERE user_id = _target_user_id;

    INSERT INTO public.audit_logs (actor_id, actor_role, target_user_id, action, old_role, new_role, metadata)
    VALUES (
      _actor_id,
      'super_admin',
      _target_user_id,
      'USER_DELETE',
      COALESCE(_old_role::text, 'user'),
      'deleted',
      jsonb_build_object('email', _email)
    );

    DELETE FROM auth.sessions WHERE user_id = _target_user_id;
    DELETE FROM auth.users WHERE id = _target_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', _mode_clean,
    'user_id', _target_user_id,
    'email', _email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.staff_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_list_users() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_remove_user(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_remove_user(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
