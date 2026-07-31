import type { OrderRow, OrderWithItems, ProductReview, Voucher } from "@/types/commerce";
import { estimateDeliveryDate } from "@/lib/order-fulfillment";
import { DEFAULT_DELIVERY_METHODS, DEFAULT_PAYMENT_METHODS } from "@/lib/checkout-defaults";
import { MOCK_PRODUCTS } from "@/lib/mock-catalog";

export const DEMO_VENDOR_ID = "demo-vendor";

export const MOCK_VOUCHERS: Voucher[] = [
  {
    id: "mock-v1",
    code: "NEXUS10",
    label: "10% off orders over PKR 5,000",
    discount_pct: 10,
    discount_flat_pkr: 0,
    min_order_pkr: 5000,
    max_uses: 100,
    used_count: 12,
    expires_at: "2027-12-31",
    is_active: true,
  },
  {
    id: "mock-v2",
    code: "IOT500",
    label: "PKR 500 flat off",
    discount_pct: 0,
    discount_flat_pkr: 500,
    min_order_pkr: 10000,
    max_uses: 50,
    used_count: 3,
    expires_at: "2027-06-30",
    is_active: true,
  },
];

export const MOCK_PAYMENT_METHODS = DEFAULT_PAYMENT_METHODS;
export const MOCK_DELIVERY_METHODS = DEFAULT_DELIVERY_METHODS;

export const MOCK_SITE_SETTINGS: Record<string, unknown> = {
  site_name: "NexusIoT",
  contact_email: "sales@nexusiot.pk",
  contact_phone: "+92 332 3059259",
  tax_rate_pct: 17,
  tax_label: "Sales Tax (GST)",
  free_shipping_min_pkr: 15000,
  cod_handling_fee_pkr: 0,
  payment_methods: MOCK_PAYMENT_METHODS,
  delivery_methods: MOCK_DELIVERY_METHODS,
};

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const mockEta = (method: string, from: Date) => estimateDeliveryDate(method, from).toISOString();

export const MOCK_ORDERS: OrderRow[] = [
  {
    id: "mock-order-001",
    customer_name: "Ahmed Raza",
    email: "ahmed@example.com",
    phone: "+92 300 1112233",
    address: "Plot 12, Sector F-8",
    city: "Islamabad",
    province: "Islamabad Capital Territory",
    postal_code: "44000",
    landmark: "Near Centaurus Mall",
    total_pkr: 10350,
    subtotal_pkr: 9500,
    shipping_pkr: 250,
    tax_pkr: 1100,
    payment_fee_pkr: 0,
    delivery_method: "standard",
    expected_delivery_at: mockEta("standard", new Date(Date.now() - 5 * 86400000)),
    tracking_number: "NX-TRK-88421",
    discount_pkr: 500,
    voucher_code: "IOT500",
    payment_method: "cod",
    status: "delivered",
    created_at: daysAgo(5),
  },
  {
    id: "mock-order-002",
    customer_name: "Sana Iqbal",
    email: "sana@example.com",
    phone: "+92 321 4455667",
    address: "Plot 44, Sector 33-B",
    city: "Karachi",
    province: "Sindh",
    postal_code: "75500",
    landmark: "Korangi Industrial Area",
    total_pkr: 33450,
    subtotal_pkr: 28000,
    shipping_pkr: 450,
    tax_pkr: 4760,
    payment_fee_pkr: 0,
    delivery_method: "express",
    expected_delivery_at: mockEta("express", new Date(Date.now() - 86400000)),
    tracking_number: "NX-TRK-90112",
    payment_method: "bank",
    status: "processing",
    created_at: daysAgo(1),
  },
];

export const MOCK_ORDERS_WITH_ITEMS: OrderWithItems[] = [
  {
    ...MOCK_ORDERS[0],
    items: [
      {
        id: "mock-line-1",
        order_id: "mock-order-001",
        product_id: MOCK_PRODUCTS[0]?.id ?? "p1",
        title: MOCK_PRODUCTS[0]?.title ?? "Tuya PIR Motion Sensor",
        price_pkr: 3200,
        quantity: 2,
        fulfillment_status: "delivered",
        expected_delivery_at: MOCK_ORDERS[0].expected_delivery_at,
        image_url: MOCK_PRODUCTS[0]?.image_url ?? null,
        product_slug: MOCK_PRODUCTS[0]?.slug ?? "tuya-pir",
        dispatched_at: daysAgo(4),
      },
      {
        id: "mock-line-2",
        order_id: "mock-order-001",
        product_id: MOCK_PRODUCTS[1]?.id ?? "p2",
        title: MOCK_PRODUCTS[1]?.title ?? "ESP32 DevKit",
        price_pkr: 3100,
        quantity: 1,
        fulfillment_status: "delivered",
        expected_delivery_at: MOCK_ORDERS[0].expected_delivery_at,
        image_url: MOCK_PRODUCTS[1]?.image_url ?? null,
        product_slug: MOCK_PRODUCTS[1]?.slug ?? "esp32",
        dispatched_at: daysAgo(4),
      },
    ],
  },
  {
    ...MOCK_ORDERS[1],
    items: [
      {
        id: "mock-line-3",
        order_id: "mock-order-002",
        product_id: MOCK_PRODUCTS[2]?.id ?? "p3",
        title: MOCK_PRODUCTS[2]?.title ?? "Hikvision IP Camera",
        price_pkr: 14000,
        quantity: 2,
        fulfillment_status: "confirmed",
        expected_delivery_at: MOCK_ORDERS[1].expected_delivery_at,
        image_url: MOCK_PRODUCTS[2]?.image_url ?? null,
        product_slug: MOCK_PRODUCTS[2]?.slug ?? "hikvision-cam",
      },
    ],
  },
];

export function getMockOrderWithItems(orderId: string): OrderWithItems | null {
  return MOCK_ORDERS_WITH_ITEMS.find((o) => o.id === orderId) ?? null;
}

export function getMockReviewsForProduct(productId: string): ProductReview[] {
  return [
    {
      id: `mock-rev-${productId}-1`,
      product_id: productId,
      customer_name: "Ahmed Raza",
      rating: 5,
      verified: true,
      body: "Works well, fast delivery.",
      created_at: daysAgo(10),
    },
    {
      id: `mock-rev-${productId}-2`,
      product_id: productId,
      customer_name: "Sana Iqbal",
      rating: 4,
      verified: true,
      body: "Good value for the price.",
      created_at: daysAgo(14),
    },
  ];
}

export function getMockAnalytics() {
  const byCat: Record<string, number> = {};
  for (const p of MOCK_PRODUCTS) {
    byCat[p.category] = (byCat[p.category] ?? 0) + 1;
  }
  const chart = Object.entries(byCat).map(([name, count]) => ({ name, count }));
  const byStatus: Record<string, number> = { delivered: 1, processing: 1, pending: 0 };
  const revenue = MOCK_ORDERS.reduce((s, o) => s + o.total_pkr, 0);
  const low = MOCK_PRODUCTS.filter((p) => p.stock > 0 && p.stock < 15);

  return {
    products: MOCK_PRODUCTS.length,
    orders: MOCK_ORDERS.length,
    revenue,
    low,
    byStatus,
    chart,
  };
}

export function getVendorMockProducts(vendorId: string | null | undefined) {
  const list = MOCK_PRODUCTS.filter((p) => p.vendor_id === "demo-vendor");
  if (!vendorId) return list.slice(0, 4);
  return list;
}
