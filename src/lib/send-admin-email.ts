const ADMIN_INBOX = "huzaifaqur67@gmail.com";
const FROM_EMAIL = "info@smartzone.pk";

type LegacySendEmail = {
  send: (message: unknown) => Promise<unknown>;
};

function errorDetail(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    const code = "code" in error && typeof error.code === "string" ? error.code : "";
    return `${code} ${error.message}`.trim();
  }
  return error instanceof Error ? error.message : String(error);
}

function isCloudflareDestinationBlocked(detail: string): boolean {
  return /2036|destination|recipient_not_allowed|e_recipient_not_allowed|not allowed to be sent/i.test(
    detail,
  );
}

async function sendStructuredCustomerEmail(input: {
  toEmail: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<boolean> {
  try {
    const { env } = await import("cloudflare:workers");
    const email = (env as { EMAIL?: LegacySendEmail }).EMAIL;
    if (!email?.send) return false;
    const payloads: unknown[] = [
      {
        to: input.toEmail,
        from: FROM_EMAIL,
        subject: input.subject,
        html: input.html,
        text: input.text,
      },
      {
        to: input.toEmail,
        from: { email: FROM_EMAIL, name: "SmartZone" },
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: FROM_EMAIL,
      },
    ];
    for (const payload of payloads) {
      try {
        await email.send(payload);
        return true;
      } catch (error) {
        console.warn("structured customer email attempt failed", errorDetail(error));
      }
    }
    return false;
  } catch (error) {
    console.warn("structured customer email failed", errorDetail(error));
    return false;
  }
}

function encodeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, 180);
}

function rawMime(input: { subject: string; body: string; replyTo?: string }): string {
  const headers = [
    `From: SmartZone <${FROM_EMAIL}>`,
    `To: ${ADMIN_INBOX}`,
    `Subject: ${encodeHeader(`SmartZone: ${input.subject}`)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ];
  if (input.replyTo) headers.push(`Reply-To: ${input.replyTo}`);
  return `${headers.join("\r\n")}\r\n\r\n${input.body}`;
}

export async function notifyAdminInbox(input: {
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<void> {
  try {
    const { env } = await import("cloudflare:workers");
    const email = (env as { EMAIL?: LegacySendEmail }).EMAIL;
    if (!email?.send) return;

    const { EmailMessage } = await import("cloudflare:email");
    await email.send(new EmailMessage(FROM_EMAIL, ADMIN_INBOX, rawMime(input)));
  } catch (error) {
    console.warn("admin email notify skipped", error);
  }
}

function customerMime(input: {
  toEmail: string;
  toName?: string;
  subject: string;
  body: string;
}): string {
  const to = input.toName?.trim()
    ? `${encodeHeader(input.toName)} <${input.toEmail}>`
    : input.toEmail;
  const subject = /^re:/i.test(input.subject) ? input.subject : `Re: ${input.subject}`;
  return [
    `From: SmartZone <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Reply-To: ${FROM_EMAIL}`,
    `Subject: ${encodeHeader(subject)}`,
    `Message-ID: <${crypto.randomUUID()}@smartzone.pk>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.body,
  ].join("\r\n");
}

export type OutboundMailResult = {
  delivered: boolean;
  composeUrl?: string;
};

export async function sendCustomerReply(input: {
  toEmail: string;
  toName?: string;
  subject: string;
  body: string;
}): Promise<OutboundMailResult> {
  const toEmail = input.toEmail.trim();
  if (!toEmail.includes("@")) throw new Error("Customer email is missing");
  const body = input.body.trim();
  if (!body) throw new Error("Reply cannot be empty");

  const subject = /^re:/i.test(input.subject) ? input.subject : `Re: ${input.subject}`;
  const composeUrl = (await import("@/lib/gmail-compose")).buildGmailComposeUrl({
    toEmail,
    subject,
    body,
  });

  if (await sendStructuredCustomerEmail({ toEmail, subject, text: body })) {
    return { delivered: true };
  }

  const { env } = await import("cloudflare:workers");
  const email = (env as { EMAIL?: LegacySendEmail }).EMAIL;
  if (email?.send) {
    try {
      const { EmailMessage } = await import("cloudflare:email");
      await email.send(new EmailMessage(FROM_EMAIL, toEmail, customerMime({ ...input, toEmail, body })));
      return { delivered: true };
    } catch (error) {
      const detail = errorDetail(error);
      if (!isCloudflareDestinationBlocked(detail)) {
        throw new Error(detail || "Failed to send reply");
      }
    }
  }

  return { delivered: false, composeUrl };
}

function customerHtmlMime(input: {
  toEmail: string;
  subject: string;
  html: string;
  text?: string;
}): string {
  const boundary = `sz_${crypto.randomUUID().replace(/-/g, "")}`;
  const text =
    (input.text || "").trim() ||
    input.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return [
    `From: SmartZone <${FROM_EMAIL}>`,
    `To: ${input.toEmail}`,
    `Reply-To: ${FROM_EMAIL}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@smartzone.pk>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export async function sendCustomerHtmlEmail(input: {
  toEmail: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const toEmail = input.toEmail.trim();
  if (!toEmail.includes("@")) throw new Error("Customer email is missing");
  if (
    await sendStructuredCustomerEmail({
      toEmail,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
  ) {
    return;
  }

  const { env } = await import("cloudflare:workers");
  const email = (env as { EMAIL?: LegacySendEmail }).EMAIL;
  if (!email?.send) {
    throw new Error("Outbound email is not bound on this Worker");
  }
  const { EmailMessage } = await import("cloudflare:email");
  try {
    await email.send(
      new EmailMessage(
        FROM_EMAIL,
        toEmail,
        customerHtmlMime({
          toEmail,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      ),
    );
  } catch (error) {
    const detail = errorDetail(error);
    if (isCloudflareDestinationBlocked(detail)) {
      throw new Error("Could not deliver this email to the customer inbox.");
    }
    throw new Error(detail || "Failed to send email");
  }
}
