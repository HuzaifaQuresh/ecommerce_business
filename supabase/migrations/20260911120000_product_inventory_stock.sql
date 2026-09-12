-- Live inventory overlay (catalog is in-code; stock truth lives here by slug).
-- First-come: atomic decrement at order place; restore on cancel.

CREATE TABLE IF NOT EXISTS public.product_inventory (
  slug text PRIMARY KEY,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_inventory_stock_idx
  ON public.product_inventory (stock);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_adjusted boolean NOT NULL DEFAULT false;

ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read product inventory" ON public.product_inventory;
CREATE POLICY "Anyone can read product inventory"
  ON public.product_inventory
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff can manage product inventory" ON public.product_inventory;
CREATE POLICY "Staff can manage product inventory"
  ON public.product_inventory
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Ensure a row exists before decrement (seed from missing = treat as 0 / fail).
CREATE OR REPLACE FUNCTION public.ensure_inventory_row(p_slug text, p_stock integer DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RETURN;
  END IF;
  INSERT INTO public.product_inventory (slug, stock, updated_at)
  VALUES (trim(p_slug), GREATEST(0, COALESCE(p_stock, 0)), now())
  ON CONFLICT (slug) DO NOTHING;
END;
$$;

-- Upsert stock (admin / catalog sync). Authenticated staff OR security definer callers.
CREATE OR REPLACE FUNCTION public.upsert_inventory(p_slug text, p_stock integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'slug required';
  END IF;
  INSERT INTO public.product_inventory (slug, stock, updated_at)
  VALUES (trim(p_slug), GREATEST(0, COALESCE(p_stock, 0)), now())
  ON CONFLICT (slug) DO UPDATE
    SET stock = GREATEST(0, COALESCE(p_stock, 0)),
        updated_at = now();
END;
$$;

-- Atomic first-come decrement. p_items: [{"slug":"...","quantity":1}, ...]
-- Fails entire transaction if any line cannot be fulfilled.
CREATE OR REPLACE FUNCTION public.decrement_inventory(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec jsonb;
  v_slug text;
  v_qty integer;
  updated integer;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN;
  END IF;

  FOR rec IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_slug := trim(COALESCE(rec->>'slug', ''));
    v_qty := GREATEST(0, COALESCE((rec->>'quantity')::integer, 0));
    IF v_slug = '' OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    -- Row must exist; missing slug = out of stock for enforced SKUs
    UPDATE public.product_inventory
    SET stock = stock - v_qty,
        updated_at = now()
    WHERE slug = v_slug
      AND stock >= v_qty;

    GET DIAGNOSTICS updated = ROW_COUNT;
    IF updated = 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_slug
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_inventory(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec jsonb;
  v_slug text;
  v_qty integer;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN;
  END IF;

  FOR rec IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_slug := trim(COALESCE(rec->>'slug', ''));
    v_qty := GREATEST(0, COALESCE((rec->>'quantity')::integer, 0));
    IF v_slug = '' OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.product_inventory (slug, stock, updated_at)
    VALUES (v_slug, v_qty, now())
    ON CONFLICT (slug) DO UPDATE
      SET stock = public.product_inventory.stock + v_qty,
          updated_at = now();
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_inventory_row(text, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.upsert_inventory(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_inventory(jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.restore_inventory(jsonb) TO authenticated, anon;

-- Authenticated buyers need decrement; staff need upsert. Keep restore for cancel flows.
GRANT SELECT ON public.product_inventory TO anon, authenticated;
