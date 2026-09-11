-- Query-aligned indexes for SmartZone commerce tables.
-- Catalog SKUs live in the storefront app; Postgres is orders, identity, and settings.

CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
  ON public.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
  ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_email_lower
  ON public.orders (lower(email));

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON public.order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment_status
  ON public.order_items (fulfillment_status);

CREATE INDEX IF NOT EXISTS idx_vendors_user_id
  ON public.vendors (user_id);

CREATE INDEX IF NOT EXISTS idx_vendors_slug
  ON public.vendors (slug);

CREATE INDEX IF NOT EXISTS idx_vendor_applications_user_id
  ON public.vendor_applications (user_id);

CREATE INDEX IF NOT EXISTS idx_vendor_applications_status_created_at
  ON public.vendor_applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id_created_at
  ON public.audit_logs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);

ANALYZE public.orders;
ANALYZE public.order_items;
ANALYZE public.vendors;
ANALYZE public.vendor_applications;
ANALYZE public.audit_logs;
ANALYZE public.user_roles;
ANALYZE public.site_settings;
ANALYZE public.profiles;
