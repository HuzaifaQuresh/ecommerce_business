-- Add saved shipping address fields to profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS landmark TEXT;
