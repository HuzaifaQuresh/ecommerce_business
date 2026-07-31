
-- Orders: prevent user_id spoofing
DROP POLICY IF EXISTS "anyone can place order" ON public.orders;
CREATE POLICY "anyone can place order"
ON public.orders FOR INSERT
TO public
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Order items: must reference an order owned by the inserter (or a guest order)
DROP POLICY IF EXISTS "anyone insert order items" ON public.order_items;
CREATE POLICY "insert order items for own order"
ON public.order_items FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND (o.user_id IS NULL OR o.user_id = auth.uid())
  )
);

-- User roles: explicit restrictive policy preventing self-insert
CREATE POLICY "only admins insert roles"
ON public.user_roles AS RESTRICTIVE FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
