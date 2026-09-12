-- Allow admins/super_admins to delete access/audit log rows from the admin UI.
DROP POLICY IF EXISTS "staff delete audit logs" ON public.audit_logs;
CREATE POLICY "staff delete audit logs"
  ON public.audit_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );
