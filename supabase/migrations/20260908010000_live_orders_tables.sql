-- Live commerce orders: persist customer checkouts so staff can see them.

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT,
  postal_code TEXT,
  landmark TEXT,
  total_pkr NUMERIC(12,2) NOT NULL,
  subtotal_pkr NUMERIC(12,2),
  shipping_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_fee_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_method TEXT NOT NULL DEFAULT 'standard',
  discount_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  voucher_code TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  status public.order_status NOT NULL DEFAULT 'pending',
  expected_delivery_at TIMESTAMPTZ,
  tracking_number TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,
  title TEXT NOT NULL,
  price_pkr NUMERIC(12,2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  fulfillment_status TEXT NOT NULL DEFAULT 'pending',
  expected_delivery_at TIMESTAMPTZ,
  image_url TEXT,
  product_slug TEXT,
  dispatched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders (email);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users view own orders" ON public.orders;
DROP POLICY IF EXISTS "anyone can place order" ON public.orders;
DROP POLICY IF EXISTS "admins update orders" ON public.orders;
DROP POLICY IF EXISTS "customers insert own orders" ON public.orders;
DROP POLICY IF EXISTS "staff select all orders" ON public.orders;
DROP POLICY IF EXISTS "customers select own orders" ON public.orders;

CREATE POLICY "customers insert own orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "customers select own orders"
ON public.orders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "staff select all orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "staff update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "view own order items" ON public.order_items;
DROP POLICY IF EXISTS "anyone insert order items" ON public.order_items;
DROP POLICY IF EXISTS "insert order items for own order" ON public.order_items;
DROP POLICY IF EXISTS "admins update order items" ON public.order_items;
DROP POLICY IF EXISTS "customers insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "customers select own order items" ON public.order_items;
DROP POLICY IF EXISTS "staff select all order items" ON public.order_items;
DROP POLICY IF EXISTS "staff update order items" ON public.order_items;

CREATE POLICY "customers insert own order items"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "customers select own order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "staff select all order items"
ON public.order_items FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "staff update order items"
ON public.order_items FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_items TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
