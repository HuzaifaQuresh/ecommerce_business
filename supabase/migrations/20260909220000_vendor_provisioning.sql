-- Professional vendor onboarding:
-- 1) Super admins can manage applications/shops (policies previously required the `admin` role only).
-- 2) Admin can provision a vendor shop for an existing account by email.
-- 3) Approving an application creates/updates the vendors row with the submitted shop name.

CREATE OR REPLACE FUNCTION public.is_platform_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'super_admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.unique_vendor_slug(_base TEXT, _user UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  s TEXT := trim(both '-' from lower(regexp_replace(coalesce(nullif(trim(_base), ''), 'shop'), '[^a-zA-Z0-9]+', '-', 'g')));
  candidate TEXT;
  n INT := 0;
BEGIN
  IF s IS NULL OR s = '' THEN s := 'shop'; END IF;
  candidate := s;
  WHILE EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.slug = candidate AND v.user_id IS DISTINCT FROM _user
  ) LOOP
    n := n + 1;
    candidate := s || '-' || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_vendor_shop(
  _user_id UUID,
  _shop_name TEXT,
  _commission_pct NUMERIC DEFAULT 10
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name TEXT := nullif(trim(_shop_name), '');
  _slug TEXT;
  _id UUID;
  _commission NUMERIC := COALESCE(_commission_pct, 10);
BEGIN
  IF _name IS NULL THEN
    SELECT COALESCE(NULLIF(full_name, ''), 'Vendor') INTO _name
    FROM public.profiles WHERE id = _user_id;
    _name := COALESCE(_name, 'Vendor') || ' Store';
  END IF;
  IF _commission < 0 THEN _commission := 0; END IF;
  IF _commission > 40 THEN _commission := 40; END IF;
  _slug := public.unique_vendor_slug(_name, _user_id);

  INSERT INTO public.vendors (user_id, shop_name, slug, commission_pct, is_active)
  VALUES (_user_id, _name, _slug, _commission, true)
  ON CONFLICT (user_id) DO UPDATE
    SET shop_name = EXCLUDED.shop_name,
        slug = EXCLUDED.slug,
        commission_pct = EXCLUDED.commission_pct,
        is_active = true
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

DROP POLICY IF EXISTS "staff manage vendor apps" ON public.vendor_applications;
CREATE POLICY "staff manage vendor apps"
  ON public.vendor_applications FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));

DROP POLICY IF EXISTS "Users manage own vendor app" ON public.vendor_applications;
CREATE POLICY "Users manage own vendor app"
  ON public.vendor_applications FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "staff manage vendors" ON public.vendors;
CREATE POLICY "staff manage vendors"
  ON public.vendors FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));

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
  IF auth.uid() IS NULL OR NOT public.is_platform_staff(auth.uid()) THEN
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

CREATE OR REPLACE FUNCTION public.admin_provision_vendor(
  _email TEXT,
  _shop_name TEXT,
  _phone TEXT DEFAULT NULL,
  _cnic TEXT DEFAULT NULL,
  _description TEXT DEFAULT NULL,
  _commission_pct NUMERIC DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _actor UUID := auth.uid();
  _target UUID;
  _vendor UUID;
  _name TEXT := nullif(trim(_shop_name), '');
  _mail TEXT := lower(trim(_email));
BEGIN
  IF _actor IS NULL OR NOT public.is_platform_staff(_actor) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;
  IF _mail IS NULL OR _mail = '' OR _mail !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Enter a valid vendor email';
  END IF;
  IF _name IS NULL THEN
    RAISE EXCEPTION 'Shop name is required';
  END IF;

  SELECT u.id INTO _target
  FROM auth.users u
  WHERE lower(u.email) = _mail
  LIMIT 1;

  IF _target IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'NO_ACCOUNT',
      'error', 'No SmartZone account with that email. Ask the vendor to sign up at /auth, then add them here.'
    );
  END IF;

  PERFORM public.admin_assign_role(_target, 'vendor'::public.app_role);
  _vendor := public.upsert_vendor_shop(_target, _name, _commission_pct);

  UPDATE public.profiles
  SET phone = COALESCE(nullif(trim(_phone), ''), phone),
      updated_at = now()
  WHERE id = _target;

  INSERT INTO public.vendor_applications (
    user_id, shop_name, business_email, phone, cnic_or_tax_id, description,
    status, reviewed_by, reviewed_at
  )
  VALUES (
    _target, _name, _mail, COALESCE(nullif(trim(_phone), ''), '—'),
    COALESCE(nullif(trim(_cnic), ''), '—'), nullif(trim(_description), ''),
    'approved', _actor, now()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', _target,
    'vendor_id', _vendor,
    'shop_name', _name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_vendor_application(
  _app_id UUID,
  _approve BOOLEAN,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor UUID := auth.uid();
  _app public.vendor_applications%ROWTYPE;
  _vendor UUID;
BEGIN
  IF _actor IS NULL OR NOT public.is_platform_staff(_actor) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT * INTO _app FROM public.vendor_applications WHERE id = _app_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  IF _app.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'This application was already reviewed';
  END IF;

  IF _approve THEN
    PERFORM public.admin_assign_role(_app.user_id, 'vendor'::public.app_role);
    _vendor := public.upsert_vendor_shop(_app.user_id, _app.shop_name, 10);
    UPDATE public.profiles
    SET phone = COALESCE(nullif(_app.phone, ''), phone),
        updated_at = now()
    WHERE id = _app.user_id;
  END IF;

  UPDATE public.vendor_applications
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      reviewed_by = _actor,
      reviewed_at = now(),
      admin_notes = nullif(trim(_notes), '')
  WHERE id = _app_id;

  RETURN jsonb_build_object(
    'ok', true,
    'approved', _approve,
    'vendor_id', _vendor,
    'shop_name', _app.shop_name
  );
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_applications_one_pending
  ON public.vendor_applications (user_id)
  WHERE status = 'pending';

REVOKE ALL ON FUNCTION public.is_platform_staff(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_staff(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_provision_vendor(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_provision_vendor(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_review_vendor_application(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_vendor_application(UUID, BOOLEAN, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.staff_assign_role_by_email(TEXT, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_assign_role_by_email(TEXT, public.app_role) TO authenticated;

NOTIFY pgrst, 'reload schema';
