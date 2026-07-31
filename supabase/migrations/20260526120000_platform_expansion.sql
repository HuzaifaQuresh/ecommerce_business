-- Platform expansion: super_admin, vendor, vouchers, reviews, payment config

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor';

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors view own or admin" ON public.vendors FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "super_admin manage vendors" ON public.vendors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] NOT NULL DEFAULT '{}';

CREATE POLICY "vendors manage own products" ON public.products FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'vendor')
    AND vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'vendor')
    AND vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT,
  discount_pct INT NOT NULL DEFAULT 0,
  discount_flat_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_order_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone views active vouchers" ON public.vouchers FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admins manage vouchers" ON public.vouchers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone views reviews" ON public.product_reviews FOR SELECT USING (true);
CREATE POLICY "authenticated insert reviews" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "admins delete reviews" ON public.product_reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS voucher_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS discount_pkr NUMERIC(12,2) NOT NULL DEFAULT 0;

INSERT INTO public.site_settings (key, value) VALUES
  ('payment_methods', '[{"id":"cod","label":"Cash on Delivery","enabled":true},{"id":"bank","label":"Bank Transfer","enabled":true},{"id":"jazzcash","label":"JazzCash","enabled":true},{"id":"easypaisa","label":"EasyPaisa","enabled":true}]'),
  ('shipping_flat_pkr', '250'),
  ('analytics_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.vouchers (code, label, discount_pct, min_order_pkr, max_uses, is_active) VALUES
  ('NEXUS10', '10% off orders above PKR 5,000', 10, 5000, 1000, true),
  ('IOT500', 'PKR 500 flat off', 0, 10000, 500, true)
ON CONFLICT (code) DO NOTHING;

UPDATE public.vouchers SET discount_flat_pkr = 500 WHERE code = 'IOT500';

INSERT INTO public.product_reviews (product_id, customer_name, rating, body, verified)
SELECT p.id, 'Ahmed Raza', 5, 'Pairing with the Tuya Smart app took less than 30 seconds. Cloud response under 1s.', true
FROM public.products p WHERE p.slug = 'tuya-zigbee-pir' LIMIT 1;

INSERT INTO public.product_reviews (product_id, customer_name, rating, body, verified)
SELECT p.id, 'Sana Iqbal', 5, 'Zigbee mesh with gateway hub is rock solid, no dropouts in 3 weeks.', true
FROM public.products p WHERE p.slug = 'tuya-zigbee-pir' LIMIT 1;
