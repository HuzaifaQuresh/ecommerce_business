-- Bootstrap function: lets a signed-in user promote themselves to super_admin
-- ONLY if zero super_admins exist (first-time platform setup).
-- SECURITY DEFINER bypasses RLS safely — the guard inside prevents misuse.

CREATE OR REPLACE FUNCTION public.bootstrap_super_admin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  existing_count INT;
BEGIN
  -- Get the calling user's ID
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Block if a super_admin already exists
  SELECT COUNT(*) INTO existing_count
  FROM public.user_roles
  WHERE role = 'super_admin';

  IF existing_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'super_admin already exists');
  END IF;

  -- Remove any existing role for this user
  DELETE FROM public.user_roles WHERE user_id = caller_id;

  -- Grant super_admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (caller_id, 'super_admin');

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Grant execution to authenticated users (the guard inside is the security)
GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin() TO authenticated;
