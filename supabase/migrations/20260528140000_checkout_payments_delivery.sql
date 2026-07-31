-- Checkout: tax, delivery options, payment fees, order breakdown columns

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal_pkr NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS shipping_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_fee_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'standard';

INSERT INTO public.site_settings (key, value) VALUES
  (
    'payment_methods',
    '[
      {"id":"cod","label":"Cash on Delivery","description":"Pay in cash when your order arrives.","enabled":true,"fee_pkr":0},
      {"id":"easypaisa","label":"EasyPaisa","description":"Mobile wallet — send to NexusIoT EasyPaisa account after order.","enabled":true,"fee_pkr":0},
      {"id":"jazzcash","label":"JazzCash","description":"Mobile wallet — JazzCash transfer with order ID in reference.","enabled":true,"fee_pkr":0},
      {"id":"bank","label":"Bank Transfer","description":"HBL / Meezan / Allied — details shown on confirmation.","enabled":true,"fee_pkr":0},
      {"id":"card","label":"Debit / Credit Card","description":"Secure card payment (Visa, Mastercard, local schemes).","enabled":true,"fee_pct":2.5}
    ]'::jsonb
  ),
  (
    'delivery_methods',
    '[
      {"id":"standard","label":"Standard Delivery","description":"Pan-Pakistan courier","eta":"3–5 business days","charge_pkr":250,"enabled":true},
      {"id":"express","label":"Express Delivery","description":"Major cities (LHE, KHI, ISB, RWP)","eta":"1–2 business days","charge_pkr":450,"enabled":true},
      {"id":"pickup","label":"Warehouse Pickup","description":"Collect from Lahore office","eta":"Same day (prepaid)","charge_pkr":0,"enabled":true}
    ]'::jsonb
  ),
  ('tax_rate_pct', '17'),
  ('tax_label', '"Sales Tax (GST)"'),
  ('free_shipping_min_pkr', '15000'),
  ('cod_handling_fee_pkr', '0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
