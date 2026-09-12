type InboxMessage = {
  id: string;
  source: "inbound_email" | "contact_form" | "iot_lead" | "site_survey";
  status: "unread" | "read" | "archived";
  from_name: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  created_at: string;
};

type IndexEntry = { id: string; created_at: string };

type Env = {
  INBOX: KVNamespace;
  FORWARD_TO?: string;
};

const INDEX_KEY = "inbox:index:v1";

function headerValue(headers: Headers, raw: string, name: string): string {
  const fromHeaders = headers.get(name);
  if (fromHeaders?.trim()) return fromHeaders.trim();
  const match = raw.match(new RegExp(`^${name}:\\s*(.+)$`, "im"));
  return match?.[1]?.replace(/\r/g, "").trim() ?? "";
}

function decodeMimeWord(value: string): string {
  return value.replace(/=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g, (_all, _charset, enc, text) => {
    try {
      if (String(enc).toLowerCase() === "b") return atob(text);
      return decodeURIComponent(text.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, "%$1"));
    } catch {
      return text;
    }
  });
}

function extractEmail(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const angle = trimmed.match(/<([^>]+@[^>]+)>/);
  if (angle?.[1]) return angle[1].trim().toLowerCase();
  const bare = trimmed.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return bare?.[0]?.toLowerCase() ?? "";
}

function extractName(value: string): string {
  const trimmed = decodeMimeWord(value).trim();
  if (!trimmed) return "";
  const named = trimmed.match(/^"?([^"<]+)"?\s*</);
  if (named?.[1]) return named[1].trim();
  return "";
}

function extractBody(raw: string): string {
  const parts = raw.split(/\r?\n\r?\n/);
  const body = parts.slice(1).join("\n\n");
  const plainIdx = body.search(/content-type:\s*text\/plain/i);
  if (plainIdx >= 0) {
    const after = body.slice(plainIdx);
    const split = after.split(/\r?\n\r?\n/);
    return (split[1] ?? after).replace(/--[a-zA-Z0-9._=-]+--?\s*$/g, "").trim().slice(0, 20000);
  }
  return body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 20000);
}

async function appendToIndex(kv: KVNamespace, entry: IndexEntry): Promise<void> {
  let index: IndexEntry[] = [];
  const raw = await kv.get(INDEX_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as IndexEntry[];
      if (Array.isArray(parsed)) index = parsed;
    } catch {
      index = [];
    }
  }
  const next = [entry, ...index.filter((row) => row.id !== entry.id)].slice(0, 5000);
  await kv.put(INDEX_KEY, JSON.stringify(next));
}

async function storeMessage(kv: KVNamespace, row: InboxMessage): Promise<void> {
  await kv.put(`msg:${row.id}`, JSON.stringify(row));
  await appendToIndex(kv, { id: row.id, created_at: row.created_at });
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    if (!env.INBOX) {
      console.error("INBOX KV binding missing on smartzone-inbox");
      // Still accept the mail so Cloudflare does not bounce it.
      try {
        await message.forward(env.FORWARD_TO || "huzaifaqur67@gmail.com");
      } catch {
        /* ignore */
      }
      return;
    }

    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    const to_email = (message.to || "info@smartzone.pk").toLowerCase();
    const forwardTo = env.FORWARD_TO || "huzaifaqur67@gmail.com";

    // Read the raw stream ONCE up front. Forward after consume often fails on CF.
    let raw = "";
    try {
      raw = await new Response(message.raw).text();
    } catch (error) {
      console.warn("inbox raw read failed", error);
    }

    const fromHeader = headerValue(message.headers, raw, "from") || message.headers.get("from") || "";
    const replyHeader = headerValue(message.headers, raw, "reply-to") || message.headers.get("reply-to") || "";
    let from_email =
      extractEmail(replyHeader) ||
      extractEmail(fromHeader) ||
      extractEmail(message.from) ||
      (message.from || "").toLowerCase() ||
      "unknown@unknown";
    const from_name = extractName(fromHeader);
    const subject = decodeMimeWord(
      headerValue(message.headers, raw, "subject") || message.headers.get("subject") || "(no subject)",
    );
    const body =
      (raw ? extractBody(raw) : "") ||
      (raw ? raw.slice(0, 4000) : "") ||
      "(empty message — headers only)";

    const row: InboxMessage = {
      id,
      source: "inbound_email",
      status: "unread",
      from_name,
      from_email,
      to_email,
      subject,
      body,
      created_at,
    };

    // Persist first — Admin Inbox must get the mail even if Gmail forward fails.
    try {
      await storeMessage(env.INBOX, row);
      console.log("inbox stored", row.id, row.from_email, row.subject);
    } catch (error) {
      console.error("inbox kv put failed", error);
      // Try forward as last resort so mail is not lost entirely.
      try {
        await message.forward(forwardTo);
      } catch (fwdErr) {
        console.error("inbox forward after kv failure also failed", fwdErr);
      }
      throw error;
    }

    // Best-effort Gmail copy. Never fail the Worker after a successful KV write.
    try {
      await message.forward(forwardTo);
    } catch (error) {
      console.warn("gmail forward skipped (mail already in Admin Inbox KV)", error);
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Lightweight health for ops — never exposes message bodies.
    if (url.pathname === "/health" || url.pathname === "/") {
      let indexCount = 0;
      let kvOk = false;
      try {
        const raw = await env.INBOX.get(INDEX_KEY);
        kvOk = true;
        if (raw) {
          const parsed = JSON.parse(raw) as IndexEntry[];
          if (Array.isArray(parsed)) indexCount = parsed.length;
        }
      } catch {
        kvOk = false;
      }
      return new Response(
        JSON.stringify(
          {
            ok: true,
            service: "smartzone-inbox",
            kvBound: Boolean(env.INBOX),
            kvOk,
            indexedMessages: indexCount,
            route: "info@smartzone.pk → Worker → Admin Inbox KV",
            note: "Cloudflare drops mail FROM your verified destination Gmail TO info@ (loop protection). Test from another address.",
          },
          null,
          2,
        ),
        { headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
