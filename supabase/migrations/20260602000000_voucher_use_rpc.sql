-- Helper RPC to safely increment voucher used_count on order placement

CREATE OR REPLACE FUNCTION public.increment_voucher_use(voucher_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vouchers
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE code = voucher_code
    AND is_active = true
    AND (max_uses IS NULL OR used_count < max_uses);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_voucher_use(TEXT) TO authenticated, anon;
