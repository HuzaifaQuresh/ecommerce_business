import { supabase } from "@/integrations/supabase/client";
import { estimateDeliveryDate } from "@/lib/order-fulfillment";
import { getMockOrderWithItems, MOCK_ORDERS_WITH_ITEMS, MOCK_ORDERS } from "@/lib/mock-data";
import type { ItemFulfillmentStatus, OrderStatus } from "@/lib/order-fulfillment";
import type { OrderRow, OrderWithItems } from "@/types/commerce";

// Helper functions for Local Storage persistence fallback
function getLocalOrders(): OrderWithItems[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("nexus_local_orders");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalOrder(order: OrderWithItems) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalOrders();
    localStorage.setItem("nexus_local_orders", JSON.stringify([order, ...list]));
  } catch (err) {
    console.error("Failed to save local order", err);
  }
}

export async function fetchOrders(opts?: { userId?: string; email?: string }) {
  const local = getLocalOrders();
  const searchUserId = opts?.userId?.trim();
  const searchEmail = opts?.email?.trim().toLowerCase();

  const filteredLocal = local.filter((o) => {
    if (!searchUserId && !searchEmail) return true;
    const matchUser = Boolean(searchUserId && o.user_id === searchUserId);
    const matchEmail = Boolean(searchEmail && o.email?.toLowerCase() === searchEmail);
    return matchUser || matchEmail;
  });

  try {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (searchUserId && searchEmail) {
      q = q.or(`user_id.eq.${searchUserId},email.ilike.${searchEmail}`);
    } else if (searchUserId) {
      q = q.eq("user_id", searchUserId);
    } else if (searchEmail) {
      q = q.ilike("email", searchEmail);
    }

    const { data, error } = await q;
    if (error) throw error;

    const dbOrders = (data ?? []) as OrderRow[];
    const merged = [...filteredLocal];
    for (const dbo of dbOrders) {
      if (!merged.some((o) => o.id === dbo.id)) {
        merged.push(dbo);
      }
    }
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  } catch {
    const merged = [...filteredLocal];
    for (const mo of MOCK_ORDERS) {
      const matchUserId = searchUserId
        ? searchUserId === "demo-user-id-1234-5678" || searchUserId === mo.user_id
        : true;
      const matchEmail = searchEmail ? mo.email?.toLowerCase() === searchEmail : true;
      if ((matchUserId || matchEmail) && !merged.some((o) => o.id === mo.id)) {
        merged.push(mo);
      }
    }
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  }
}

export async function fetchOrderWithItems(orderId: string): Promise<OrderWithItems | null> {
  if (!orderId) return null;
  const cleanId = orderId.trim();

  const local = getLocalOrders().find((o) => o.id.toLowerCase() === cleanId.toLowerCase());
  if (local) return local;

  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", cleanId)
      .maybeSingle();
    if (error) throw error;
    if (order) {
      const { data: items, error: iErr } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", cleanId)
        .order("title");
      if (iErr) throw iErr;
      return { ...(order as OrderRow), items: items ?? [] };
    }
  } catch (err) {
    console.warn("Failed to fetch order from Supabase:", err);
  }
  return getMockOrderWithItems(cleanId);
}

export async function fetchOrdersWithItems(opts?: {
  userId?: string;
  email?: string;
}): Promise<OrderWithItems[]> {
  const isFiltered = Boolean(opts?.userId || opts?.email);
  try {
    const orders = await fetchOrders(opts);
    if (!orders.length) {
      return isFiltered ? [] : MOCK_ORDERS_WITH_ITEMS;
    }
    const out: OrderWithItems[] = [];
    for (const o of orders) {
      const full = await fetchOrderWithItems(o.id);
      if (full) out.push(full);
    }
    return out.length ? out : isFiltered ? [] : MOCK_ORDERS_WITH_ITEMS;
  } catch {
    return isFiltered ? [] : MOCK_ORDERS_WITH_ITEMS;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(val: any): boolean {
  if (typeof val !== "string") return false;
  return UUID_REGEX.test(val);
}

export async function placeOrder(input: {
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province?: string;
  postal_code?: string;
  landmark?: string;
  total_pkr: number;
  subtotal_pkr?: number;
  shipping_pkr?: number;
  tax_pkr?: number;
  payment_fee_pkr?: number;
  delivery_method?: string;
  discount_pkr?: number;
  voucher_code?: string | null;
  payment_method: string;
  user_id?: string | null;
  items: {
    product_id: string;
    title: string;
    price_pkr: number;
    quantity: number;
    image_url?: string | null;
    product_slug?: string;
  }[];
}) {
  const { items, delivery_method, ...order } = input;
  const orderedAt = new Date();
  const expected = estimateDeliveryDate(delivery_method ?? "standard", orderedAt);

  const sanitizedUserId = order.user_id && isUUID(order.user_id) ? order.user_id : null;

  try {
    const { data: created, error } = await supabase
      .from("orders")
      .insert({
        ...order,
        delivery_method: delivery_method ?? "standard",
        user_id: sanitizedUserId,
        expected_delivery_at: expected.toISOString(),
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;

    const { error: e2 } = await supabase.from("order_items").insert(
      items.map((i) => ({
        product_id: i.product_id && isUUID(i.product_id) ? i.product_id : null,
        title: i.title,
        price_pkr: i.price_pkr,
        quantity: i.quantity,
        order_id: created.id,
        fulfillment_status: "pending",
        expected_delivery_at: expected.toISOString(),
        image_url: i.image_url ?? null,
        product_slug: i.product_slug ?? null,
      })),
    );
    if (e2) throw e2;

    // Increment voucher used_count if a voucher was applied
    if (input.voucher_code) {
      await supabase
        .rpc("increment_voucher_use", { voucher_code: input.voucher_code })
        .catch(() => {
          // Non-fatal: fallback to manual increment
          supabase
            .from("vouchers")
            .select("id, used_count")
            .eq("code", input.voucher_code!)
            .maybeSingle()
            .then(({ data: v }) => {
              if (v)
                supabase
                  .from("vouchers")
                  .update({ used_count: (v.used_count ?? 0) + 1 })
                  .eq("id", v.id);
            });
        });
    }

    const fullOrder: OrderWithItems = {
      ...(created as OrderRow),
      items: items.map((i, index) => ({
        id: `item-${created.id}-${index}`,
        order_id: created.id,
        product_id: i.product_id && isUUID(i.product_id) ? i.product_id : null,
        title: i.title,
        price_pkr: i.price_pkr,
        quantity: i.quantity,
        fulfillment_status: "pending" as ItemFulfillmentStatus,
        expected_delivery_at: expected.toISOString(),
        image_url: i.image_url ?? null,
        product_slug: i.product_slug ?? null,
      })),
    };
    saveLocalOrder(fullOrder);

    return created as OrderRow;
  } catch (err) {
    console.warn("Supabase placeOrder failed, falling back to local storage:", err);

    const createdId = "ord-" + Math.random().toString(36).substring(2, 11).toUpperCase();

    const createdOrder: OrderRow = {
      id: createdId,
      customer_name: order.customer_name,
      email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      province: order.province ?? null,
      postal_code: order.postal_code ?? null,
      landmark: order.landmark ?? null,
      total_pkr: order.total_pkr,
      subtotal_pkr: order.subtotal_pkr ?? order.total_pkr,
      shipping_pkr: order.shipping_pkr ?? 0,
      tax_pkr: order.tax_pkr ?? 0,
      payment_fee_pkr: order.payment_fee_pkr ?? 0,
      delivery_method: delivery_method ?? "standard",
      discount_pkr: order.discount_pkr ?? 0,
      voucher_code: order.voucher_code ?? null,
      payment_method: order.payment_method,
      user_id: sanitizedUserId,
      expected_delivery_at: expected.toISOString(),
      status: "pending",
      created_at: orderedAt.toISOString(),
    };

    const createdItems = items.map((i, index) => ({
      id: `item-${createdId}-${index}`,
      order_id: createdId,
      product_id: i.product_id && isUUID(i.product_id) ? i.product_id : null,
      title: i.title,
      price_pkr: i.price_pkr,
      quantity: i.quantity,
      fulfillment_status: "pending" as ItemFulfillmentStatus,
      expected_delivery_at: expected.toISOString(),
      image_url: i.image_url ?? null,
      product_slug: i.product_slug ?? null,
    }));

    const orderWithItems: OrderWithItems = {
      ...createdOrder,
      items: createdItems,
    };

    saveLocalOrder(orderWithItems);

    return createdOrder;
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const localList = getLocalOrders();
  const idx = localList.findIndex((o) => o.id === id);
  if (idx !== -1) {
    localList[idx].status = status;
    localStorage.setItem("nexus_local_orders", JSON.stringify(localList));
    return;
  }

  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function updateOrderTracking(
  id: string,
  patch: { tracking_number?: string; expected_delivery_at?: string; admin_notes?: string },
) {
  const localList = getLocalOrders();
  const idx = localList.findIndex((o) => o.id === id);
  if (idx !== -1) {
    localList[idx] = { ...localList[idx], ...patch };
    localStorage.setItem("nexus_local_orders", JSON.stringify(localList));
    return;
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw error;
}

export async function updateOrderItemFulfillment(
  itemId: string,
  fulfillment_status: ItemFulfillmentStatus,
  dispatched_at?: string | null,
) {
  const localList = getLocalOrders();
  let found = false;
  for (const o of localList) {
    const itemIdx = o.items.findIndex((i) => i.id === itemId);
    if (itemIdx !== -1) {
      o.items[itemIdx].fulfillment_status = fulfillment_status;
      if (fulfillment_status === "dispatched" || fulfillment_status === "in_transit") {
        o.items[itemIdx].dispatched_at = dispatched_at ?? new Date().toISOString();
      }
      found = true;
      break;
    }
  }
  if (found) {
    localStorage.setItem("nexus_local_orders", JSON.stringify(localList));
    return;
  }

  const patch: Record<string, unknown> = { fulfillment_status };
  if (fulfillment_status === "dispatched" || fulfillment_status === "in_transit") {
    patch.dispatched_at = dispatched_at ?? new Date().toISOString();
  }
  const { error } = await supabase.from("order_items").update(patch).eq("id", itemId);
  if (error) throw error;
}
