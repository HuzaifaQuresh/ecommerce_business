-- Rich shipping address + per-line fulfillment & expected delivery

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS landmark TEXT,
  ADD COLUMN IF NOT EXISTS expected_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS expected_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS product_slug TEXT,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

CREATE POLICY "admins update order items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
