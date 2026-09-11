import type { InboxMessage, InboxReply, InboxStatus } from "@/lib/inbox";

export async function saveInboxMessage(
  kv: KVNamespace,
  message: InboxMessage,
): Promise<InboxMessage> {
  await kv.put(`msg:${message.id}`, JSON.stringify(message));
  return message;
}

export async function listInboxMessages(kv: KVNamespace): Promise<InboxMessage[]> {
  const listed = await kv.list({ prefix: "msg:" });
  const rows = await Promise.all(
    listed.keys.map(async (key) => {
      const raw = await kv.get(key.name);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as InboxMessage;
      } catch {
        return null;
      }
    }),
  );
  return rows
    .filter((row): row is InboxMessage => !!row)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function updateInboxMessage(
  kv: KVNamespace,
  id: string,
  status: InboxStatus,
): Promise<InboxMessage | null> {
  const raw = await kv.get(`msg:${id}`);
  if (!raw) return null;
  const current = JSON.parse(raw) as InboxMessage;
  current.status = status;
  await kv.put(`msg:${id}`, JSON.stringify(current));
  return current;
}

export async function deleteInboxMessage(kv: KVNamespace, id: string): Promise<boolean> {
  const key = `msg:${id}`;
  const raw = await kv.get(key);
  if (!raw) return false;
  await kv.delete(key);
  return true;
}

export async function appendInboxReply(
  kv: KVNamespace,
  id: string,
  reply: InboxReply,
): Promise<InboxMessage | null> {
  const raw = await kv.get(`msg:${id}`);
  if (!raw) return null;
  const current = JSON.parse(raw) as InboxMessage;
  current.replies = [...(current.replies ?? []), reply];
  current.status = "read";
  await kv.put(`msg:${id}`, JSON.stringify(current));
  return current;
}

export function createInboxMessage(
  input: Omit<InboxMessage, "id" | "status" | "created_at"> & { id?: string },
): InboxMessage {
  return {
    id: input.id || crypto.randomUUID(),
    source: input.source,
    status: "unread",
    from_name: input.from_name,
    from_email: input.from_email,
    to_email: input.to_email || "info@smartzone.pk",
    subject: input.subject || "(no subject)",
    body: input.body || "",
    created_at: new Date().toISOString(),
  };
}
