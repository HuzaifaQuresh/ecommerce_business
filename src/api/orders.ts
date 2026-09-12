import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { estimateDeliveryDate } from "@/lib/order-fulfillment";
import { getMockOrderWithItems, MOCK_ORDERS_WITH_ITEMS, MOCK_ORDERS } from "@/lib/mock-data";
import type { ItemFulfillmentStatus, OrderStatus } from "@/lib/order-fulfillment";
import type { OrderItemRow, OrderRow, OrderWithItems } from "@/types/commerce";
import {
  decrementInventory,
  restoreInventory,
  stockEnforcedLines,
} from "@/lib/inventory";

function isDemoOrderId(id: string | undefined) {
  return Boolean(id && id.startsWith("mock-order-"));
}

function asOrderItems(value: unknown): OrderItemRow[] {
  return Array.isArray(value) ? (value as OrderItemRow[]) : [];
}

function asOrderWithItems(row: OrderRow & { items?: unknown; order_items?: unknown }): OrderWithItems {
  const { order_items, items, ...order } = row;
  return {
    ...(order as OrderRow),
    items: asOrderItems(items ?? order_items),
  };
}

function toErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message?: string }).message || "").trim();
    if (message) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

// Helper functions for Local Storage persistence fallback
function getLocalOrders(): OrderWithItems[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("nexus_local_orders");
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row: OrderRow & { items?: unknown; order_items?: unknown }) =>
      asOrderWithItems(row),
    );
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
    const merged = [...filteredLocal.filter((o) => !isDemoOrderId(o.id))];
    for (const dbo of dbOrders) {
      if (isDemoOrderId(dbo.id)) continue;
      if (!merged.some((o) => o.id === dbo.id)) {
        merged.push(dbo);
      }
    }
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  } catch {
    if (isSupabaseConfigured()) {
      return filteredLocal.filter((o) => !isDemoOrderId(o.id));
    }
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
      return asOrderWithItems({ ...(order as OrderRow), items: items ?? [] });
    }
  } catch (err) {
    console.warn("Failed to fetch order from Supabase:", err);
  }
  if (isSupabaseConfigured()) return null;
  return getMockOrderWithItems(cleanId);
}

export async function fetchOrdersWithItems(opts?: {
  userId?: string;
  email?: string;
}): Promise<OrderWithItems[]> {
  const isFiltered = Boolean(opts?.userId || opts?.email);
  const searchUserId = opts?.userId?.trim();
  const searchEmail = opts?.email?.trim().toLowerCase();
  const local = getLocalOrders();
  const filteredLocal = local.filter((o) => {
    if (!searchUserId && !searchEmail) return true;
    const matchUser = Boolean(searchUserId && o.user_id === searchUserId);
    const matchEmail = Boolean(searchEmail && o.email?.toLowerCase() === searchEmail);
    return matchUser || matchEmail;
  });

  try {
    let q = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (searchUserId && searchEmail) {
      q = q.or(`user_id.eq.${searchUserId},email.ilike.${searchEmail}`);
    } else if (searchUserId) {
      q = q.eq("user_id", searchUserId);
    } else if (searchEmail) {
      q = q.ilike("email", searchEmail);
    }

    const { data, error } = await q;
    if (error) throw error;

    const fromDb: OrderWithItems[] = (data ?? []).flatMap((row) => {
      const record = row as OrderRow & { order_items?: unknown; items?: unknown };
      if (isDemoOrderId(record.id)) return [];
      return [asOrderWithItems(record)];
    });

    const merged = [...filteredLocal.filter((o) => !isDemoOrderId(o.id))];
    for (const dbo of fromDb) {
      const existing = merged.findIndex((o) => o.id === dbo.id);
      if (existing === -1) merged.push(dbo);
      else if (!merged[existing].items.length && dbo.items.length) merged[existing] = dbo;
    }
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (merged.length) return merged;
    return isFiltered || isSupabaseConfigured() ? [] : MOCK_ORDERS_WITH_ITEMS;
  } catch {
    try {
      const orders = await fetchOrders(opts);
      if (!orders.length) {
        return isFiltered || isSupabaseConfigured() ? [] : MOCK_ORDERS_WITH_ITEMS;
      }
      const out: OrderWithItems[] = [];
      for (const o of orders) {
        const full = await fetchOrderWithItems(o.id);
        if (full) out.push(full);
      }
      if (out.length) return out;
    } catch {
      /* fall through */
    }
    return isFiltered || isSupabaseConfigured() ? [] : MOCK_ORDERS_WITH_ITEMS;
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

  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  if (!sessionUser) {
    throw new Error("Sign in is required to complete your order.");
  }
  const sanitizedUserId = isUUID(sessionUser.id) ? sessionUser.id : null;
  if (!sanitizedUserId) {
    throw new Error("Sign in is required to complete your order.");
  }

  const stockLines = stockEnforcedLines(
    items.map((i) => ({
      product_slug: i.product_slug,
      quantity: i.quantity,
    })),
  );

  let stockReserved = false;
  try {
    if (stockLines.length) {
      await decrementInventory(stockLines);
      stockReserved = true;
    }

    const { data: created, error } = await supabase
      .from("orders")
      .insert({
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
        stock_adjusted: stockReserved,
      })
      .select()
      .single();
    if (error) throw error;

    const { error: e2 } = await supabase.from("order_items").insert(
      items.map((i) => ({
        product_id: i.product_id || null,
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

    if (input.voucher_code) {
      await supabase
        .rpc("increment_voucher_use", { voucher_code: input.voucher_code })
        .catch(() => {
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
      stock_adjusted: stockReserved,
      items: items.map((i, index) => ({
        id: `item-${created.id}-${index}`,
        order_id: created.id,
        product_id: i.product_id || null,
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
    if (stockReserved && stockLines.length) {
      try {
        await restoreInventory(stockLines);
      } catch (restoreErr) {
        console.error("Failed to restore stock after order error:", restoreErr);
      }
      stockReserved = false;
    }

    // Stock / validation errors should surface even when Supabase is configured
    const message = toErrorMessage(err, "Could not place your order. Please try again.");
    if (/out of stock|insufficient stock|only \d+ left/i.test(message)) {
      throw new Error(message);
    }

    if (isSupabaseConfigured()) {
      console.error("placeOrder failed:", err);
      throw new Error(message);
    }
    console.warn("Supabase placeOrder failed, falling back to local storage:", err);

    if (stockLines.length) {
      await decrementInventory(stockLines);
      stockReserved = true;
    }

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
      stock_adjusted: stockReserved,
    };

    const createdItems = items.map((i, index) => ({
      id: `item-${createdId}-${index}`,
      order_id: createdId,
      product_id: i.product_id || null,
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
  const restoreLinesFromOrder = async (order: OrderWithItems) => {
    if (status !== "cancelled") return;
    if (order.stock_adjusted === false) return;
    // Treat missing flag as true for older local orders that may have decremented
    const lines = stockEnforcedLines(
      (order.items ?? []).map((i) => ({
        product_slug: i.product_slug,
        quantity: i.quantity,
      })),
    );
    if (!lines.length) return;
    await restoreInventory(lines);
  };

  const localList = getLocalOrders();
  const idx = localList.findIndex((o) => o.id === id);
  if (idx !== -1) {
    const oldStatus = localList[idx].status;
    if (status === "cancelled" && oldStatus !== "cancelled") {
      await restoreLinesFromOrder(localList[idx]);
      localList[idx].stock_adjusted = false;
    }
    localList[idx].status = status;
    localStorage.setItem("nexus_local_orders", JSON.stringify(localList));

    const { writeAuditEvent } = await import("@/lib/audit");
    await writeAuditEvent({
      action: "ORDER_STATUS_CHANGE",
      oldValue: oldStatus,
      newValue: status,
      entityType: "order",
      entityId: id,
      summary: `Order status ${oldStatus} → ${status}`,
      metadata: {
        order_id: id,
        total_pkr: localList[idx].total_pkr,
        payment_method: localList[idx].payment_method,
        customer_name: localList[idx].customer_name,
      },
    });
    return;
  }

  if (status === "cancelled") {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("id, status, stock_adjusted")
      .eq("id", id)
      .maybeSingle();
    if (orderRow && orderRow.status !== "cancelled" && orderRow.stock_adjusted !== false) {
      const { data: itemRows } = await supabase
        .from("order_items")
        .select("product_slug, quantity")
        .eq("order_id", id);
      const lines = stockEnforcedLines(
        (itemRows ?? []).map((i) => ({
          product_slug: i.product_slug,
          quantity: i.quantity,
        })),
      );
      if (lines.length) await restoreInventory(lines);
      await supabase.from("orders").update({ status, stock_adjusted: false }).eq("id", id);
      return;
    }
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
    const { writeAuditEvent } = await import("@/lib/audit");
    await writeAuditEvent({
      action: "ORDER_TRACKING_UPDATE",
      entityType: "order",
      entityId: id,
      summary: `Tracking updated on #${id.slice(0, 8).toUpperCase()}`,
      metadata: { order_id: id, ...patch },
    });
    return;
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw error;

  const { writeAuditEvent } = await import("@/lib/audit");
  await writeAuditEvent({
    action: "ORDER_TRACKING_UPDATE",
    entityType: "order",
    entityId: id,
    summary: `Tracking updated on #${id.slice(0, 8).toUpperCase()}`,
    metadata: { order_id: id, ...patch },
  });
}

export async function updateOrderItemFulfillment(
  itemId: string,
  fulfillment_status: ItemFulfillmentStatus,
  dispatched_at?: string | null,
) {
  const localList = getLocalOrders();
  let found = false;
  for (const o of localList) {
    const itemIdx = asOrderItems(o.items).findIndex((i) => i.id === itemId);
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

/**
 * Permanently remove an order from the admin order log.
 * Restores inventory when the order had reserved stock and was not already cancelled.
 */
export async function deleteOrder(id: string): Promise<void> {
  const cleanId = id.trim();
  if (!cleanId) throw new Error("Order id is required");

  // Local / demo orders
  const localList = getLocalOrders();
  const localIdx = localList.findIndex((o) => o.id === cleanId);
  if (localIdx !== -1) {
    const order = localList[localIdx];
    if (order.status !== "cancelled" && order.stock_adjusted !== false) {
      const lines = stockEnforcedLines(
        (order.items ?? []).map((i) => ({
          product_slug: i.product_slug,
          quantity: i.quantity,
        })),
      );
      if (lines.length) await restoreInventory(lines);
    }
    localList.splice(localIdx, 1);
    localStorage.setItem("nexus_local_orders", JSON.stringify(localList));
    window.dispatchEvent(new Event("nexus-orders-update"));

    const { writeAuditEvent } = await import("@/lib/audit");
    await writeAuditEvent({
      action: "ORDER_DELETE",
      oldValue: order.status,
      newValue: "deleted",
      entityType: "order",
      entityId: cleanId,
      summary: `Deleted order #${cleanId.slice(0, 8).toUpperCase()} · ${order.customer_name}`,
      metadata: {
        order_id: cleanId,
        total_pkr: order.total_pkr,
        customer: order.customer_name,
        payment_method: order.payment_method,
        subtotal_pkr: order.subtotal_pkr,
        tax_pkr: order.tax_pkr,
        payment_fee_pkr: order.payment_fee_pkr,
      },
    });
    return;
  }

  if (isDemoOrderId(cleanId)) {
    throw new Error("Demo orders cannot be deleted from the live store");
  }

  const { data: orderRow, error: fetchErr } = await supabase
    .from("orders")
    .select("id, status, stock_adjusted, total_pkr, customer_name")
    .eq("id", cleanId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!orderRow) throw new Error("Order not found");

  if (orderRow.status !== "cancelled" && orderRow.stock_adjusted !== false) {
    const { data: itemRows } = await supabase
      .from("order_items")
      .select("product_slug, quantity")
      .eq("order_id", cleanId);
    const lines = stockEnforcedLines(
      (itemRows ?? []).map((i) => ({
        product_slug: i.product_slug,
        quantity: i.quantity,
      })),
    );
    if (lines.length) await restoreInventory(lines);
  }

  // Cascade deletes order_items via FK
  const { data: deleted, error } = await supabase
    .from("orders")
    .delete()
    .eq("id", cleanId)
    .select("id");
  if (error) throw error;
  if (!deleted?.length) {
    throw new Error("Delete blocked — refresh and try again, or check admin permissions.");
  }

  const { writeAuditEvent } = await import("@/lib/audit");
  await writeAuditEvent({
    action: "ORDER_DELETE",
    oldValue: orderRow.status,
    newValue: "deleted",
    entityType: "order",
    entityId: cleanId,
    summary: `Deleted order #${cleanId.slice(0, 8).toUpperCase()} · ${orderRow.customer_name}`,
    metadata: {
      order_id: cleanId,
      total_pkr: orderRow.total_pkr,
      customer: orderRow.customer_name,
    },
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("nexus-orders-update"));
  }
}

