import type { InboxMessage, InboxReply, InboxStatus } from "@/lib/inbox";

const INDEX_KEY = "inbox:index:v1";
const DELETED_KEY = "inbox:deleted:v1";
const TOMBSTONE_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

type StoredInboxRow = InboxMessage & { __deleted?: boolean; deleted_at?: string };
type IndexEntry = { id: string; created_at: string };

function msgKey(id: string): string {
  const cleaned = id.trim();
  if (!cleaned) return "msg:";
  return cleaned.startsWith("msg:") ? cleaned : `msg:${cleaned}`;
}

function idFromKey(key: string): string {
  return key.startsWith("msg:") ? key.slice(4) : key;
}

function isDeletedRow(row: StoredInboxRow | null | undefined): boolean {
  return Boolean(row?.__deleted);
}

async function listAllMsgKeys(kv: KVNamespace): Promise<string[]> {
  const names: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix: "msg:", cursor, limit: 1000 });
    for (const key of page.keys) names.push(key.name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return names;
}

async function readDeletedIds(kv: KVNamespace): Promise<Set<string>> {
  const raw = await kv.get(DELETED_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

async function writeDeletedIds(kv: KVNamespace, ids: Set<string>): Promise<void> {
  const list = [...ids].slice(-3000);
  await kv.put(DELETED_KEY, JSON.stringify(list));
}

async function markDeletedId(kv: KVNamespace, id: string): Promise<void> {
  const bare = idFromKey(id);
  const ids = await readDeletedIds(kv);
  ids.add(bare);
  ids.add(id);
  await writeDeletedIds(kv, ids);
}

async function readIndex(kv: KVNamespace): Promise<IndexEntry[] | null> {
  const raw = await kv.get(INDEX_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as IndexEntry[];
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((row) => row && typeof row.id === "string" && row.id.length > 0);
  } catch {
    return null;
  }
}

async function writeIndex(kv: KVNamespace, entries: IndexEntry[]): Promise<void> {
  const dedup = new Map<string, IndexEntry>();
  for (const entry of entries) {
    if (!entry?.id) continue;
    dedup.set(entry.id, { id: entry.id, created_at: entry.created_at || new Date().toISOString() });
  }
  const sorted = [...dedup.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  await kv.put(INDEX_KEY, JSON.stringify(sorted.slice(0, 5000)));
}

async function rebuildIndex(kv: KVNamespace, deleted: Set<string>): Promise<IndexEntry[]> {
  const keys = await listAllMsgKeys(kv);
  const entries: IndexEntry[] = [];
  await Promise.all(
    keys.map(async (keyName) => {
      const id = idFromKey(keyName);
      if (deleted.has(id)) return;
      const raw = await kv.get(keyName);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as StoredInboxRow;
        if (isDeletedRow(parsed)) return;
        entries.push({ id, created_at: parsed.created_at || new Date(0).toISOString() });
      } catch {
        /* skip corrupt */
      }
    }),
  );
  await writeIndex(kv, entries);
  return entries;
}

async function ensureIndex(kv: KVNamespace, deleted: Set<string>): Promise<IndexEntry[]> {
  const existing = await readIndex(kv);
  if (existing) {
    // Keep empty array as valid — do NOT rebuild (that resurrected deletes)
    return existing.filter((row) => !deleted.has(row.id));
  }
  return rebuildIndex(kv, deleted);
}

function parseMessage(raw: string, keyName: string): InboxMessage | null {
  try {
    const parsed = JSON.parse(raw) as StoredInboxRow;
    if (isDeletedRow(parsed)) return null;
    const id = idFromKey(keyName);
    const { __deleted: _d, deleted_at: _at, ...rest } = parsed;
    return { ...rest, id };
  } catch {
    return null;
  }
}

export async function saveInboxMessage(
  kv: KVNamespace,
  message: InboxMessage,
): Promise<InboxMessage> {
  const normalized: InboxMessage = { ...message, id: idFromKey(msgKey(message.id)) };
  const deleted = await readDeletedIds(kv);
  // Re-saving a previously deleted id is allowed only if caller creates a new message
  deleted.delete(normalized.id);
  await writeDeletedIds(kv, deleted);

  await kv.put(msgKey(normalized.id), JSON.stringify(normalized));

  const index = (await readIndex(kv)) ?? [];
  const next = [
    { id: normalized.id, created_at: normalized.created_at },
    ...index.filter((row) => row.id !== normalized.id),
  ];
  await writeIndex(kv, next);
  return normalized;
}

export async function listInboxMessages(kv: KVNamespace): Promise<InboxMessage[]> {
  const deleted = await readDeletedIds(kv);
  let index = await ensureIndex(kv, deleted);

  // Empty index key `[]` used to block discovery forever. If there are live msg:*
  // rows that are not deleted, rebuild once so Admin Inbox recovers after outages.
  if (index.length === 0) {
    const keys = await listAllMsgKeys(kv);
    const liveKeys = keys.filter((key) => {
      const id = idFromKey(key);
      return !deleted.has(id) && !deleted.has(key);
    });
    if (liveKeys.length > 0) {
      index = await rebuildIndex(kv, deleted);
    }
  }

  const rows = await Promise.all(
    index.map(async (entry) => {
      if (deleted.has(entry.id)) return null;
      const key = msgKey(entry.id);
      const raw = await kv.get(key);
      if (!raw) return null;
      return parseMessage(raw, key);
    }),
  );

  const alive = rows.filter((row): row is InboxMessage => !!row);
  const pruned = alive.map((row) => ({ id: row.id, created_at: row.created_at }));
  if (pruned.length !== index.length) {
    await writeIndex(kv, pruned);
  }

  return alive.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getInboxMessage(
  kv: KVNamespace,
  id: string,
): Promise<InboxMessage | null> {
  const bare = idFromKey(id);
  const deleted = await readDeletedIds(kv);
  if (deleted.has(bare) || deleted.has(id)) return null;

  const key = msgKey(bare);
  const raw = await kv.get(key);
  if (!raw) return null;
  return parseMessage(raw, key);
}

export async function updateInboxMessage(
  kv: KVNamespace,
  id: string,
  status: InboxStatus,
): Promise<InboxMessage | null> {
  const current = await getInboxMessage(kv, id);
  if (!current) return null;
  current.status = status;
  await kv.put(msgKey(current.id), JSON.stringify(current));
  return current;
}

/**
 * Reliable delete for Cloudflare KV:
 * 1) Record id in deleted set (prevents resurrection)
 * 2) Remove from index
 * 3) Write tombstone body
 */
export async function deleteInboxMessage(kv: KVNamespace, id: string): Promise<boolean> {
  const bare = idFromKey(id);
  const key = msgKey(bare);

  await markDeletedId(kv, bare);

  const index = (await readIndex(kv)) ?? [];
  await writeIndex(
    kv,
    index.filter((row) => row.id !== bare && row.id !== id),
  );

  const tombstone: StoredInboxRow = {
    __deleted: true,
    deleted_at: new Date().toISOString(),
    id: bare,
    source: "inbound_email",
    status: "archived",
    from_name: "",
    from_email: "",
    to_email: "",
    subject: "",
    body: "",
    created_at: new Date().toISOString(),
  };

  await kv.put(key, JSON.stringify(tombstone), { expirationTtl: TOMBSTONE_TTL_SEC });
  return true;
}

export async function appendInboxReply(
  kv: KVNamespace,
  id: string,
  reply: InboxReply,
): Promise<InboxMessage | null> {
  const current = await getInboxMessage(kv, id);
  if (!current) return null;
  current.replies = [...(current.replies ?? []), reply];
  current.status = "read";
  await kv.put(msgKey(current.id), JSON.stringify(current));
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
    ...(input.meta ? { meta: input.meta } : {}),
    ...(input.replies?.length ? { replies: input.replies } : {}),
  };
}
