-- Category taxonomy reference (NexusIoT catalog)
-- Products.category may store a top-level department OR a leaf subcategory name.
-- Legacy values "Tuya Sensors" and "Gateways" still filter under Sensors / Smart Home in the app.

COMMENT ON COLUMN public.products.category IS
  'Top-level department or leaf subcategory — see src/lib/categories.ts';

-- Optional: remap legacy seed rows to new leaf names
UPDATE public.products SET category = 'Smart Cameras' WHERE category = 'Smart Home' AND tags @> ARRAY['camera'];
UPDATE public.products SET category = 'Smart Switch' WHERE category = 'Smart Home' AND tags @> ARRAY['switch'];
UPDATE public.products SET category = 'Smart Lighting' WHERE category = 'Smart Home' AND tags @> ARRAY['lighting','bulb'];
UPDATE public.products SET category = 'Gateways' WHERE category = 'Smart Home' AND tags @> ARRAY['gateway','hub'];
UPDATE public.products SET category = 'Temperature Sensors' WHERE category = 'Tuya Sensors' AND tags @> ARRAY['temp'];
