-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_status TEXT,
    new_status TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins and super_admins to view audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

-- Allow system and triggers to insert audit logs
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Create function to log order status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_actor_id := auth.uid();
        
        IF v_actor_id IS NOT NULL THEN
            SELECT role INTO v_actor_role
            FROM public.user_roles
            WHERE user_id = v_actor_id
            LIMIT 1;
        END IF;

        INSERT INTO public.audit_logs (
            actor_id,
            actor_role,
            action,
            entity_type,
            entity_id,
            old_status,
            new_status,
            details,
            created_at
        ) VALUES (
            v_actor_id,
            COALESCE(v_actor_role, 'system'),
            'ORDER_STATUS_CHANGE',
            'order',
            NEW.id::TEXT,
            OLD.status,
            NEW.status,
            jsonb_build_object(
                'order_id', NEW.id,
                'order_number', NEW.order_number,
                'total_pkr', NEW.total_pkr
            ),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS tr_log_order_status_change ON public.orders;

CREATE TRIGGER tr_log_order_status_change
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.log_order_status_change();
