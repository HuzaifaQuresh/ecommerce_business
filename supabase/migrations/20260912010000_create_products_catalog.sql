-- SmartZone catalog products table (was missing on production project).
DO $$ BEGIN
  CREATE TYPE public.availability_status AS ENUM ('in_stock', 'on_demand', 'coming_soon', 'obsolete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  price_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  image_url TEXT,
  manufacturer TEXT,
  color TEXT,
  availability public.availability_status NOT NULL DEFAULT 'in_stock',
  discount_pct INT NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 4.5,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  gallery_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone views products" ON public.products;
CREATE POLICY "anyone views products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins insert products" ON public.products;
CREATE POLICY "admins insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "admins update products" ON public.products;
CREATE POLICY "admins update products" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "admins delete products" ON public.products;
CREATE POLICY "admins delete products" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "vendors manage own products" ON public.products;
CREATE POLICY "vendors manage own products" ON public.products FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'vendor')
    AND vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'vendor')
    AND vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_products_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_products_updated_at();
