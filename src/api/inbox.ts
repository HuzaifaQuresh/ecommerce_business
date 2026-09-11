import { createServerFn } from "@tanstack/react-start";
import {
  appendInboxReply,
  createInboxMessage,
  deleteInboxMessage,
  listInboxMessages,
  saveInboxMessage,
  updateInboxMessage,
} from "@/lib/inbox-store";
import type { InboxStatus } from "@/lib/inbox";

async function inboxKv(): Promise<KVNamespace> {
  const { env } = await import("cloudflare:workers");
  const kv = (env as { INBOX?: KVNamespace }).INBOX;
  if (!kv) throw new Error("Inbox storage is not bound on this Worker");
  return kv;
}

export const submitInboxLead = createServerFn({ method: "POST" })
  .validator(
    (d: {
      source: "contact_form" | "iot_lead";
      name: string;
      email: string;
      subject: string;
      message: string;
      company?: string;
      phone?: string;
      solution?: string;
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

    const extras = [
      data.company ? `Company: ${data.company}` : "",
      data.phone ? `Phone: ${data.phone}` : "",
      data.solution ? `Solution: ${data.solution}` : "",
    ].filter(Boolean);

    const body = extras.length ? `${extras.join("\n")}\n\n${message}` : message;
    const kv = await inboxKv();
    await saveInboxMessage(
      kv,
      createInboxMessage({
        source: data.source,
        from_name: name,
        from_email: email,
        to_email: "info@smartzone.pk",
        subject,
        body,
      }),
    );
    const { notifyAdminInbox } = await import("@/lib/send-admin-email");
    await notifyAdminInbox({
      subject,
      body: `From: ${name} <${email}>\n\n${body}`,
      replyTo: email,
    });
    return { ok: true as const };
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
    if (!updated) throw new Error("Message not found");
    return { ok: true as const };
  });

export const deleteInboxMessageFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const kv = await inboxKv();
    const removed = await deleteInboxMessage(kv, data.id);
    if (!removed) throw new Error("Message not found");
    return { ok: true as const };
  });

export const replyInboxMessageFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; body: string }) => d)
  .handler(async ({ data }) => {
    const body = data.body.trim().slice(0, 8000);
    if (!body) throw new Error("Reply cannot be empty");

    const kv = await inboxKv();
    const listed = await listInboxMessages(kv);
    const message = listed.find((row) => row.id === data.id);
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

    await appendInboxReply(kv, message.id, {
      id: crypto.randomUUID(),
      body,
      from_email: "info@smartzone.pk",
      sent_at: new Date().toISOString(),
    });
    return {
      ok: true as const,
      delivered: outboundResult.delivered,
      composeUrl: outboundResult.composeUrl,
    };
  });
