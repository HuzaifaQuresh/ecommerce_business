-- ============================================================================
-- NexusIoT Role-Based Access Control (RBAC) & Multi-Tenant Security Migration
-- Target Platform: Supabase / PostgreSQL
-- Description:
--   1. Defines 4-tier Role Hierarchy: super_admin, admin, vendor, customer
--   2. Sets up profiles, user_roles, vendor_applications, and audit_logs tables
--   3. Implements Row Level Security (RLS) defense-in-depth policies
--   4. Adds automatic profile creation trigger on user signup
--   5. Provides secure security definer RPC for administrative role promotion with logging
--   6. Fully Edge-Runtime Compatible (JWT claim & RLS evaluation safe)
-- ============================================================================

-- 1. ENUM & SCHEMA INITIALIZATION
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'vendor', 'customer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer'::public.app_role,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  vendor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer'::public.app_role,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_roles_user_id_role_key UNIQUE(user_id, role)
);

-- 4. VENDOR APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  business_email TEXT NOT NULL,
  phone TEXT NOT NULL,
  cnic_or_tax_id TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AUDIT LOGS TABLE
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

-- 6. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. AUTOMATIC USER SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default profile
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    'customer'::public.app_role
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. SECURE ADMINISTRATIVE ROLE ASSIGNMENT RPC
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  _target_user_id UUID,
  _new_role public.app_role
)
RETURNS VOID AS $$
DECLARE
  _actor_id UUID := auth.uid();
  _actor_is_super BOOLEAN;
  _actor_is_admin BOOLEAN;
  _old_role public.app_role;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  _actor_is_super := public.has_role(_actor_id, 'super_admin');
  _actor_is_admin := public.has_role(_actor_id, 'admin');

  IF NOT (_actor_is_super OR _actor_is_admin) THEN
    RAISE EXCEPTION 'Forbidden: Insufficient privileges';
  END IF;

  -- Only super_admin can create or assign super_admin role
  IF _new_role = 'super_admin' AND NOT _actor_is_super THEN
    RAISE EXCEPTION 'Forbidden: Only Super Admins can assign the super_admin role';
  END IF;

  -- Retrieve existing role
  SELECT role INTO _old_role FROM public.user_roles WHERE user_id = _target_user_id LIMIT 1;

  -- Update user_roles
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role);

  -- Update profiles table
  UPDATE public.profiles
  SET role = _new_role, updated_at = NOW()
  WHERE id = _target_user_id;

  -- Log to audit table
  INSERT INTO public.audit_logs (actor_id, actor_role, target_user_id, action, old_role, new_role)
  VALUES (
    _actor_id,
    CASE WHEN _actor_is_super THEN 'super_admin' ELSE 'admin' END,
    _target_user_id,
    'ROLE_CHANGE',
    COALESCE(_old_role::TEXT, 'customer'),
    _new_role::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));

-- User Roles Policies
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Vendor Applications Policies
DROP POLICY IF EXISTS "Users manage own vendor app" ON public.vendor_applications;
CREATE POLICY "Users manage own vendor app" ON public.vendor_applications
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Audit Logs Policies
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
