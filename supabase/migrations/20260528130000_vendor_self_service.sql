-- Vendors can update their own shop profile (name); commission/active remain super_admin unless staff

CREATE POLICY "vendors update own shop" ON public.vendors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
