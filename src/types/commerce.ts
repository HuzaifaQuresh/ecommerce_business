export type AppRole = "user" | "admin" | "super_admin" | "vendor";

export type ProductRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  price_pkr: number;
  stock: number;
  image_url: string | null;
  gallery_urls?: string[] | null;
  manufacturer: string | null;
  color: string | null;
  availability: string;
  discount_pct: number;
  tags: string[] | null;
  rating: number | null;
  specs?: Record<string, string> | null;
  vendor_id?: string | null;
  created_at?: string;
};

export type PaymentMethod = {
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
  /** Flat processing fee (PKR) */
  fee_pkr?: number;
  /** Percent of subtotal after discount */
  fee_pct?: number;
};

export type DeliveryMethod = {
  id: string;
  label: string;
  description?: string;
  eta?: string;
  charge_pkr: number;
  enabled: boolean;
};

export type CheckoutConfig = {
  tax_rate_pct: number;
  tax_label: string;
  free_shipping_min_pkr: number;
  cod_handling_fee_pkr: number;
  payment_methods: PaymentMethod[];
  delivery_methods: DeliveryMethod[];
};

export type CheckoutTotals = {
  subtotal: number;
  discount: number;
  delivery_charge: number;
  shipping: number;
  tax: number;
  payment_fee: number;
  total: number;
  free_shipping_applied: boolean;
};

export type Voucher = {
  id: string;
  code: string;
  label: string | null;
  discount_pct: number;
  discount_flat_pkr: number;
  min_order_pkr: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
};

export type ProductReview = {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  body: string;
  verified: boolean;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  price_pkr: number;
  quantity: number;
  fulfillment_status?: string;
  expected_delivery_at?: string | null;
  image_url?: string | null;
  product_slug?: string | null;
  dispatched_at?: string | null;
};

export type OrderRow = {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province?: string | null;
  postal_code?: string | null;
  landmark?: string | null;
  total_pkr: number;
  subtotal_pkr?: number;
  shipping_pkr?: number;
  tax_pkr?: number;
  payment_fee_pkr?: number;
  delivery_method?: string;
  expected_delivery_at?: string | null;
  tracking_number?: string | null;
  admin_notes?: string | null;
  discount_pkr?: number;
  voucher_code?: string | null;
  payment_method?: string;
  status: string;
  created_at: string;
  user_id?: string | null;
};

export type OrderWithItems = OrderRow & { items: OrderItemRow[] };
