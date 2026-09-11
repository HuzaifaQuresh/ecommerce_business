-- Email/password signups must confirm the mailbox before they can use the store.
-- Hosted Auth currently auto-confirms (confirmation_sent_at stays null). This
-- holds those accounts unconfirmed until GoTrue actually sends a confirmation.

CREATE OR REPLACE FUNCTION public.auth_users_hold_autoconfirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  provider text;
  providers jsonb;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_sso_user, false) THEN
    RETURN NEW;
  END IF;

  provider := lower(coalesce(NEW.raw_app_meta_data->>'provider', 'email'));
  providers := coalesce(NEW.raw_app_meta_data->'providers', '[]'::jsonb);

  IF provider <> 'email' THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(providers) = 'array' AND (
    providers ? 'google'
    OR providers ? 'apple'
    OR providers ? 'azure'
    OR providers ? 'facebook'
    OR providers ? 'github'
  ) THEN
    RETURN NEW;
  END IF;

  -- Autoconfirm path: marked confirmed without ever sending mail.
  IF NEW.email_confirmed_at IS NOT NULL AND NEW.confirmation_sent_at IS NULL THEN
    NEW.email_confirmed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_users_hold_autoconfirm ON auth.users;
CREATE TRIGGER trg_auth_users_hold_autoconfirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auth_users_hold_autoconfirm();

CREATE OR REPLACE FUNCTION public.hold_unverified_email_signup(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  u auth.users%ROWTYPE;
  provider text;
  providers jsonb;
  held boolean := false;
BEGIN
  IF _email IS NULL OR position('@' in _email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
  END IF;

  SELECT * INTO u
  FROM auth.users
  WHERE lower(email) = lower(trim(_email))
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'unknown', true);
  END IF;

  provider := lower(coalesce(u.raw_app_meta_data->>'provider', 'email'));
  providers := coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb);

  IF coalesce(u.is_sso_user, false)
     OR provider <> 'email'
     OR (
       jsonb_typeof(providers) = 'array'
       AND (providers ? 'google' OR providers ? 'apple' OR providers ? 'azure')
     )
  THEN
    RETURN jsonb_build_object('ok', true, 'oauth', true);
  END IF;

  IF u.email_confirmed_at IS NOT NULL
     AND u.confirmation_sent_at IS NULL
     AND u.created_at > now() - interval '6 hours'
  THEN
    UPDATE auth.users
    SET email_confirmed_at = NULL
    WHERE id = u.id;
    DELETE FROM auth.sessions WHERE user_id = u.id;
    DELETE FROM auth.refresh_tokens WHERE user_id = u.id;
    held := true;
  END IF;

  IF u.email_confirmed_at IS NOT NULL AND NOT held THEN
    RETURN jsonb_build_object('ok', true, 'already_verified', true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'user_id', u.id, 'held', held);
END;
$$;

REVOKE ALL ON FUNCTION public.hold_unverified_email_signup(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hold_unverified_email_signup(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hold_unverified_email_signup(text) TO service_role;
