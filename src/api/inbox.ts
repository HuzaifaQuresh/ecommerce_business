import { createServerFn } from "@tanstack/react-start";
import {
  appendInboxReply,
  createInboxMessage,
  deleteInboxMessage,
  getInboxMessage,
  listInboxMessages,
  saveInboxMessage,
  updateInboxMessage,
} from "@/lib/inbox-store";
import type { InboxLeadMeta, InboxSource, InboxStatus } from "@/lib/inbox";

async function inboxKv(): Promise<KVNamespace> {
  const { env } = await import("cloudflare:workers");
  const kv = (env as { INBOX?: KVNamespace }).INBOX;
  if (!kv) throw new Error("Inbox storage is not bound on this Worker");
  return kv;
}

function cleanMeta(input: InboxLeadMeta | undefined): InboxLeadMeta | undefined {
  if (!input) return undefined;
  const meta: InboxLeadMeta = {};
  if (input.phone?.trim()) meta.phone = input.phone.trim().slice(0, 40);
  if (input.company?.trim()) meta.company = input.company.trim().slice(0, 120);
  if (input.solution?.trim()) meta.solution = input.solution.trim().slice(0, 160);
  if (input.address?.trim()) meta.address = input.address.trim().slice(0, 400);
  if (input.city?.trim()) meta.city = input.city.trim().slice(0, 100);
  if (input.area?.trim()) meta.area = input.area.trim().slice(0, 120);
  if (typeof input.lat === "number" && Number.isFinite(input.lat)) {
    meta.lat = Math.round(input.lat * 1e6) / 1e6;
  }
  if (typeof input.lng === "number" && Number.isFinite(input.lng)) {
    meta.lng = Math.round(input.lng * 1e6) / 1e6;
  }
  return Object.keys(meta).length ? meta : undefined;
}

export const submitInboxLead = createServerFn({ method: "POST" })
  .validator(
    (d: {
      source: "contact_form" | "iot_lead" | "site_survey";
      name: string;
      email: string;
      subject: string;
      message: string;
      company?: string;
      phone?: string;
      solution?: string;
      address?: string;
      city?: string;
      area?: string;
      lat?: number;
      lng?: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const name = data.name.trim().slice(0, 120);
    const email = data.email.trim().slice(0, 160);
    const subject = data.subject.trim().slice(0, 200);
    const message = data.message.trim().slice(0, 8000);
    if (!name || !email.includes("@") || !message) {
      throw new Error("Name, email, and message are required");
    }

    const meta = cleanMeta({
      phone: data.phone,
      company: data.company,
      solution: data.solution,
      address: data.address,
      city: data.city,
      area: data.area,
      lat: data.lat,
      lng: data.lng,
    });

    const extras = [
      data.company ? `Company: ${data.company}` : "",
      data.phone ? `Phone: ${data.phone}` : "",
      data.solution ? `Solution: ${data.solution}` : "",
      data.address ? `Address: ${data.address}` : "",
      data.area ? `Area: ${data.area}` : "",
      data.city ? `City: ${data.city}` : "",
      typeof data.lat === "number" && typeof data.lng === "number"
        ? `Map pin: ${data.lat}, ${data.lng}`
        : "",
    ].filter(Boolean);

    const body = extras.length ? `${extras.join("\n")}\n\n${message}` : message;
    const kv = await inboxKv();
    await saveInboxMessage(
      kv,
      createInboxMessage({
        source: data.source as InboxSource,
        from_name: name,
        from_email: email,
        to_email: "info@smartzone.pk",
        subject,
        body,
        meta,
      }),
    );
    const { notifyAdminInbox } = await import("@/lib/send-admin-email");
    const notified = await notifyAdminInbox({
      subject: data.source === "site_survey" ? `Site survey: ${subject}` : subject,
      body: `From: ${name} <${email}>\n\n${body}`,
      replyTo: email,
    });
    return {
      ok: true as const,
      notified: notified.delivered,
      notifyDetail: notified.detail,
    };
  });

export const fetchOutboundMailHealth = createServerFn({ method: "GET" }).handler(async () => {
  const { getOutboundMailHealth } = await import("@/lib/send-admin-email");
  return getOutboundMailHealth();
});

export const fetchInboxMessages = createServerFn({ method: "GET" }).handler(async () => {
  const kv = await inboxKv();
  return listInboxMessages(kv);
});

export const updateInboxStatus = createServerFn({ method: "POST" })
  .validator((d: { id: string; status: InboxStatus }) => d)
  .handler(async ({ data }) => {
    const kv = await inboxKv();
    const updated = await updateInboxMessage(kv, data.id, data.status);
    // Already deleted / eventual consistency — treat as no-op so UI does not toast "Message not found"
    if (!updated) return { ok: true as const, missing: true as const };
    return { ok: true as const, missing: false as const };
  });

export const deleteInboxMessageFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const kv = await inboxKv();
    await deleteInboxMessage(kv, data.id);
    return { ok: true as const };
  });

export const replyInboxMessageFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; body: string }) => d)
  .handler(async ({ data }) => {
    const body = data.body.trim().slice(0, 8000);
    if (!body) throw new Error("Reply cannot be empty");

    const kv = await inboxKv();
    const message = await getInboxMessage(kv, data.id);
    if (!message) throw new Error("Message not found");
    if (!message.from_email.includes("@")) throw new Error("This message has no reply address");

    const quoted = message.body
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const outbound = `${body}\n\n--\nSmartZone\nhttps://smartzone.pk\ninfo@smartzone.pk\n\nOn ${new Date(message.created_at).toUTCString()}, ${message.from_name || message.from_email} wrote:\n${quoted}`;

    const { sendCustomerReply } = await import("@/lib/send-admin-email");
    const outboundResult = await sendCustomerReply({
      toEmail: message.from_email,
      toName: message.from_name,
      subject: message.subject,
      body: outbound,
    });

    // Always persist the reply in Admin Inbox so Send never feels broken.
    // Email delivery is best-effort (Resend / CF / Gmail compose).
    const deliveryNote = outboundResult.delivered
      ? outboundResult.adminRelay
        ? "[Sent via admin Gmail relay — confirm in Gmail if needed]\n\n"
        : ""
      : "[Saved here — open Gmail to deliver to the customer]\n\n";

    await appendInboxReply(kv, message.id, {
      id: crypto.randomUUID(),
      body: `${deliveryNote}${body}`,
      from_email: "info@smartzone.pk",
      sent_at: new Date().toISOString(),
    });

    return {
      ok: true as const,
      delivered: outboundResult.delivered,
      adminRelay: outboundResult.adminRelay,
      composeUrl: outboundResult.composeUrl,
      detail: outboundResult.detail,
      saved: true as const,
    };
  });

/** Forward a site survey to a field engineer / relevant person via email. */
export const forwardSiteSurveyFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; toEmail: string; note?: string }) => d)
  .handler(async ({ data }) => {
    const toEmail = data.toEmail.trim().slice(0, 160);
    if (!toEmail.includes("@")) throw new Error("Enter a valid assignee email");

    const kv = await inboxKv();
    const message = await getInboxMessage(kv, data.id);
    if (!message) throw new Error("Survey request not found");

    const note = (data.note || "").trim().slice(0, 2000);
    const meta = message.meta;
    const maps =
      meta && typeof meta.lat === "number" && typeof meta.lng === "number"
        ? `https://www.google.com/maps?q=${meta.lat},${meta.lng}`
        : meta?.address
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              [meta.address, meta.area, meta.city].filter(Boolean).join(", "),
            )}`
          : null;

    const body = [
      "New site survey assignment from SmartZone admin.",
      "",
      `Customer: ${message.from_name}`,
      `Email: ${message.from_email}`,
      meta?.phone ? `Phone: ${meta.phone}` : "",
      meta?.company ? `Company: ${meta.company}` : "",
      meta?.solution ? `Solution: ${meta.solution}` : "",
      meta?.address ? `Address: ${meta.address}` : "",
      meta?.area ? `Area: ${meta.area}` : "",
      meta?.city ? `City: ${meta.city}` : "",
      maps ? `Maps: ${maps}` : "",
      "",
      "--- Original request ---",
      message.body,
      note ? `\n--- Admin note ---\n${note}` : "",
      "",
      "Reply to the customer from Admin → Site Survey, or contact them directly.",
    ]
      .filter((line) => line !== "")
      .join("\n");

    const { sendCustomerReply } = await import("@/lib/send-admin-email");
    const result = await sendCustomerReply({
      toEmail,
      toName: "SmartZone field team",
      subject: `Site survey assignment: ${message.subject}`,
      body,
    });

    await appendInboxReply(kv, message.id, {
      id: crypto.randomUUID(),
      body: `${result.delivered ? (result.adminRelay ? "[Admin Gmail relay] " : "") : "[Open Gmail to deliver] "}Forwarded to ${toEmail}${note ? `\n\nNote: ${note}` : ""}`,
      from_email: "info@smartzone.pk",
      sent_at: new Date().toISOString(),
    });

    return {
      ok: true as const,
      delivered: result.delivered,
      adminRelay: result.adminRelay,
      composeUrl: result.composeUrl,
      detail: result.detail,
      saved: true as const,
    };
  });
