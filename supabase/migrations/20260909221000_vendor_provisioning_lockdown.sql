-- Lock down helper RPCs and close pending apps when an admin provisions a shop.

REVOKE ALL ON FUNCTION public.upsert_vendor_shop(UUID, TEXT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_vendor_shop(UUID, TEXT, NUMERIC) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_vendor_shop(UUID, TEXT, NUMERIC) FROM authenticated;

REVOKE ALL ON FUNCTION public.unique_vendor_slug(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unique_vendor_slug(TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.unique_vendor_slug(TEXT, UUID) FROM authenticated;

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

  UPDATE public.vendor_applications
  SET status = 'approved',
      reviewed_by = _actor,
      reviewed_at = now(),
      shop_name = _name,
      business_email = _mail,
      phone = COALESCE(nullif(trim(_phone), ''), phone),
      cnic_or_tax_id = COALESCE(nullif(trim(_cnic), ''), cnic_or_tax_id),
      description = COALESCE(nullif(trim(_description), ''), description),
      admin_notes = COALESCE(nullif(trim(_description), ''), admin_notes)
  WHERE user_id = _target AND status = 'pending';

  IF NOT FOUND THEN
    INSERT INTO public.vendor_applications (
      user_id, shop_name, business_email, phone, cnic_or_tax_id, description,
      status, reviewed_by, reviewed_at
    )
    VALUES (
      _target, _name, _mail, COALESCE(nullif(trim(_phone), ''), '—'),
      COALESCE(nullif(trim(_cnic), ''), '—'), nullif(trim(_description), ''),
      'approved', _actor, now()
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', _target,
    'vendor_id', _vendor,
    'shop_name', _name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_provision_vendor(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_provision_vendor(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;

NOTIFY pgrst, 'reload schema';
