type InboxMessage = {
  id: string;
  source: "inbound_email" | "contact_form" | "iot_lead";
  status: "unread" | "read" | "archived";
  from_name: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  created_at: string;
};

type Env = {
  INBOX: KVNamespace;
  FORWARD_TO?: string;
};

function headerValue(raw: string, name: string): string {
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

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const raw = await new Response(message.raw).text();
    const subject = decodeMimeWord(
      message.headers.get("subject") || headerValue(raw, "subject") || "(no subject)",
    );
    const fromHeader = decodeMimeWord(message.headers.get("from") || headerValue(raw, "from") || message.from);
    const nameMatch = fromHeader.match(/^"?([^"<]+)"?\s*</);
    const row: InboxMessage = {
      id: crypto.randomUUID(),
      source: "inbound_email",
      status: "unread",
      from_name: nameMatch?.[1]?.trim() || "",
      from_email: message.from,
      to_email: message.to || "info@smartzone.pk",
      subject,
      body: extractBody(raw) || raw.slice(0, 4000),
      created_at: new Date().toISOString(),
    };
    await env.INBOX.put(`msg:${row.id}`, JSON.stringify(row));
    const forwardTo = env.FORWARD_TO || "huzaifaqur67@gmail.com";
    try {
      await message.forward(forwardTo);
    } catch (error) {
      console.warn("gmail forward skipped", error);
    }
    console.log("inbox stored", row.id, row.from_email, row.subject);
  },

  async fetch(): Promise<Response> {
    return new Response("SmartZone inbox worker", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
