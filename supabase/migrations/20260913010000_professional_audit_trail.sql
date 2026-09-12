-- Professional audit trail columns + staff policies + order status trigger
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
  ON public.audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id, created_at DESC);

DROP POLICY IF EXISTS "staff read audit logs" ON public.audit_logs;
CREATE POLICY "staff read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "staff insert audit logs" ON public.audit_logs;
CREATE POLICY "staff insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "staff delete audit logs" ON public.audit_logs;
CREATE POLICY "staff delete audit logs"
  ON public.audit_logs FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT := 'system';
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF v_actor_id IS NOT NULL THEN
      SELECT role::text INTO v_actor_role
      FROM public.user_roles
      WHERE user_id = v_actor_id
      ORDER BY CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        ELSE 3
      END
      LIMIT 1;
      v_actor_role := COALESCE(v_actor_role, 'admin');
    END IF;

    INSERT INTO public.audit_logs (
      actor_id, actor_role, action, old_role, new_role,
      entity_type, entity_id, summary, metadata
    ) VALUES (
      v_actor_id,
      v_actor_role,
      'ORDER_STATUS_CHANGE',
      OLD.status,
      NEW.status,
      'order',
      NEW.id::text,
      format('Order status %s → %s', OLD.status, NEW.status),
      jsonb_build_object(
        'order_id', NEW.id,
        'customer_name', NEW.customer_name,
        'payment_method', NEW.payment_method,
        'total_pkr', NEW.total_pkr,
        'subtotal_pkr', NEW.subtotal_pkr,
        'tax_pkr', NEW.tax_pkr,
        'shipping_pkr', NEW.shipping_pkr,
        'payment_fee_pkr', NEW.payment_fee_pkr,
        'discount_pkr', NEW.discount_pkr
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_log_order_status_change ON public.orders;
CREATE TRIGGER tr_log_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();
