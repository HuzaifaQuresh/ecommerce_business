-- Staff can permanently delete order rows (order_items cascade via FK).
-- Also grant DELETE so RLS policies can succeed for authenticated admins.

DROP POLICY IF EXISTS "staff delete orders" ON public.orders;
CREATE POLICY "staff delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

DROP POLICY IF EXISTS "staff delete order items" ON public.order_items;
CREATE POLICY "staff delete order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

GRANT DELETE ON public.orders TO authenticated;
GRANT DELETE ON public.order_items TO authenticated;
