-- Vouchers + product reviews for SmartZone commerce flows
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

DROP POLICY IF EXISTS "anyone views active vouchers" ON public.vouchers;
CREATE POLICY "anyone views active vouchers" ON public.vouchers FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "admins manage vouchers" ON public.vouchers;
CREATE POLICY "admins manage vouchers" ON public.vouchers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.increment_voucher_use(voucher_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vouchers
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE upper(code) = upper(trim(voucher_code))
    AND is_active = true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_voucher_use(text) TO authenticated, anon;

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone views reviews" ON public.product_reviews;
CREATE POLICY "anyone views reviews" ON public.product_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "authenticated insert reviews" ON public.product_reviews;
CREATE POLICY "authenticated insert reviews" ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "admins delete reviews" ON public.product_reviews;
CREATE POLICY "admins delete reviews" ON public.product_reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
