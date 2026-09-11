-- Review metadata was in the original schema and RPCs, but missing on the live table.
-- Approve/reject and admin provision both write these columns.

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

NOTIFY pgrst, 'reload schema';
