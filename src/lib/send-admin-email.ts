const ADMIN_INBOX = "huzaifaqur67@gmail.com";
const FROM_EMAIL = "info@smartzone.pk";
const FROM_NAME = "SmartZone";

type LegacySendEmail = {
  send: (message: unknown) => Promise<unknown>;
};

type WorkerEmailEnv = {
  EMAIL?: LegacySendEmail;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  ADMIN_NOTIFY_EMAIL?: string;
};

function errorDetail(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    const code = "code" in error && typeof error.code === "string" ? error.code : "";
    return `${code} ${error.message}`.trim();
  }
  return error instanceof Error ? error.message : String(error);
}

function isCloudflareDestinationBlocked(detail: string): boolean {
  return /2036|destination|recipient_not_allowed|e_recipient_not_allowed|not allowed to be sent|not verified|sender_domain|e_sender/i.test(
    detail,
  );
}

async function workerEnv(): Promise<WorkerEmailEnv> {
  try {
    const { env } = await import("cloudflare:workers");
    return env as WorkerEmailEnv;
  } catch {
    return {
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      MAIL_FROM: process.env.MAIL_FROM,
      ADMIN_NOTIFY_EMAIL: process.env.ADMIN_NOTIFY_EMAIL,
    };
  }
}

function fromAddress(env: WorkerEmailEnv): string {
  return (env.MAIL_FROM || FROM_EMAIL).trim() || FROM_EMAIL;
}

function adminNotifyAddress(env: WorkerEmailEnv): string {
  return (env.ADMIN_NOTIFY_EMAIL || ADMIN_INBOX).trim() || ADMIN_INBOX;
}

function encodeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, 180);
}

export type OutboundMailHealth = {
  resendConfigured: boolean;
  cloudflareEmailBound: boolean;
  /** True when customer replies can leave without opening Gmail */
  customerDirectSend: boolean;
  adminNotifyTarget: string;
  from: string;
  hint: string;
};

export async function getOutboundMailHealth(): Promise<OutboundMailHealth> {
  const env = await workerEnv();
  const resendConfigured = Boolean(env.RESEND_API_KEY?.trim());
  const cloudflareEmailBound = Boolean(env.EMAIL?.send);
  return {
    resendConfigured,
    cloudflareEmailBound,
    customerDirectSend: resendConfigured,
    adminNotifyTarget: adminNotifyAddress(env),
    from: fromAddress(env),
    hint: resendConfigured
      ? "Resend is configured — replies go to any customer inbox."
      : "Customer replies need Worker secret RESEND_API_KEY (resend.com). Without it, Cloudflare can only email your verified Gmail.",
  };
}

type ResendResult = { ok: true } | { ok: false; detail: string };

/** Resend HTTP API — works to any inbox when domain is verified at resend.com */
async function sendViaResend(input: {
  apiKey: string;
  from: string;
  toEmail: string;
  toName?: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}): Promise<ResendResult> {
  const to = input.toName?.trim()
    ? `${input.toName.trim()} <${input.toEmail}>`
    : input.toEmail;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${input.from}>`,
        to: [to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        reply_to: input.replyTo || input.from,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const detail = `Resend ${res.status}: ${body.slice(0, 280) || res.statusText}`;
      console.warn("Resend send failed", detail);
      return { ok: false, detail };
    }
    return { ok: true };
  } catch (error) {
    const detail = `Resend request failed: ${errorDetail(error)}`;
    console.warn(detail);
    return { ok: false, detail };
  }
}

async function sendStructuredCustomerEmail(input: {
  email: LegacySendEmail;
  toEmail: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; detail?: string }> {
  const payloads: unknown[] = [
    {
      to: input.toEmail,
      from: { email: input.from, name: FROM_NAME },
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo || input.from,
    },
    {
      to: input.toEmail,
      from: input.from,
      subject: input.subject,
      html: input.html,
      text: input.text,
    },
  ];
  let lastDetail = "";
  for (const payload of payloads) {
    try {
      await input.email.send(payload);
      return { ok: true };
    } catch (error) {
      lastDetail = errorDetail(error);
      console.warn("structured email attempt failed", lastDetail);
    }
  }
  return { ok: false, detail: lastDetail };
}

function rawMime(input: {
  from: string;
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}): string {
  const headers = [
    `From: ${FROM_NAME} <${input.from}>`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ];
  if (input.replyTo) headers.push(`Reply-To: ${input.replyTo}`);
  return `${headers.join("\r\n")}\r\n\r\n${input.body}`;
}

async function sendViaEmailMessage(input: {
  email: LegacySendEmail;
  from: string;
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<{ ok: boolean; detail?: string }> {
  try {
    const { EmailMessage } = await import("cloudflare:email");
    await input.email.send(
      new EmailMessage(
        input.from,
        input.to,
        rawMime({
          from: input.from,
          to: input.to,
          subject: input.subject,
          body: input.body,
          replyTo: input.replyTo,
        }),
      ),
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: errorDetail(error) };
  }
}

/**
 * Notify admin Gmail (verified Cloudflare destination).
 * Used for new contact / site-survey leads.
 */
export async function notifyAdminInbox(input: {
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<{ delivered: boolean; detail?: string }> {
  const env = await workerEnv();
  const from = fromAddress(env);
  const to = adminNotifyAddress(env);
  const subject = `SmartZone: ${input.subject}`;
  const details: string[] = [];

  if (env.RESEND_API_KEY) {
    const resend = await sendViaResend({
      apiKey: env.RESEND_API_KEY,
      from,
      toEmail: to,
      subject,
      text: input.body,
      replyTo: input.replyTo || from,
    });
    if (resend.ok) return { delivered: true };
    details.push(resend.detail);
  }

  if (env.EMAIL?.send) {
    const structured = await sendStructuredCustomerEmail({
      email: env.EMAIL,
      toEmail: to,
      from,
      subject,
      text: input.body,
      replyTo: input.replyTo,
    });
    if (structured.ok) return { delivered: true };
    if (structured.detail) details.push(structured.detail);

    const mime = await sendViaEmailMessage({
      email: env.EMAIL,
      from,
      to,
      subject,
      body: input.body,
      replyTo: input.replyTo,
    });
    if (mime.ok) return { delivered: true };
    if (mime.detail) details.push(mime.detail);
  }

  const detail =
    details.filter(Boolean).join(" | ") ||
    "No email provider configured (set RESEND_API_KEY or EMAIL binding)";
  console.warn("admin email notify skipped/failed", detail);
  return { delivered: false, detail };
}

function customerMime(input: {
  from: string;
  toEmail: string;
  toName?: string;
  subject: string;
  body: string;
}): string {
  const to = input.toName?.trim()
    ? `${encodeHeader(input.toName)} <${input.toEmail}>`
    : input.toEmail;
  return [
    `From: ${FROM_NAME} <${input.from}>`,
    `To: ${to}`,
    `Reply-To: ${input.from}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Message-ID: <${crypto.randomUUID()}@smartzone.pk>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.body,
  ].join("\r\n");
}

export type OutboundMailResult = {
  delivered: boolean;
  /** true when mail landed in admin Gmail for manual forward (CF limitation) */
  adminRelay?: boolean;
  composeUrl?: string;
  detail?: string;
};

/**
 * Send to any customer / assignee address.
 * Cloudflare Email Routing can ONLY deliver to verified destinations (admin Gmail).
 * Prefer Resend when RESEND_API_KEY is set; otherwise fall back to Gmail compose + admin copy.
 */
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

  const env = await workerEnv();
  const from = fromAddress(env);
  const adminTo = adminNotifyAddress(env);
  const failDetails: string[] = [];

  // 1) Resend — real delivery to any inbox
  if (env.RESEND_API_KEY) {
    const resend = await sendViaResend({
      apiKey: env.RESEND_API_KEY,
      from,
      toEmail,
      toName: input.toName,
      subject,
      text: body,
      replyTo: from,
    });
    if (resend.ok) return { delivered: true };
    failDetails.push(resend.detail);
  } else {
    failDetails.push("RESEND_API_KEY is not set on the Worker");
  }

  // 2) Cloudflare Email Service / Routing binding
  if (env.EMAIL?.send) {
    const structured = await sendStructuredCustomerEmail({
      email: env.EMAIL,
      toEmail,
      from,
      subject,
      text: body,
      replyTo: from,
    });
    if (structured.ok) return { delivered: true };
    if (structured.detail) failDetails.push(structured.detail);

    try {
      const { EmailMessage } = await import("cloudflare:email");
      await env.EMAIL.send(
        new EmailMessage(from, toEmail, customerMime({ ...input, from, toEmail, subject, body })),
      );
      return { delivered: true };
    } catch (error) {
      const detail = errorDetail(error);
      failDetails.push(detail);
      if (!isCloudflareDestinationBlocked(detail)) {
        console.warn("CF customer send failed", detail);
      } else {
        console.warn("CF blocked customer destination — using admin relay", detail);
      }

      // 3) Relay a copy to verified admin Gmail so something is delivered
      const relayBody = [
        "SmartZone could not auto-deliver this message to the customer.",
        "Cloudflare Email only allows verified destinations (your admin Gmail).",
        "Set Worker secret RESEND_API_KEY for direct customer delivery.",
        "",
        `CUSTOMER: ${input.toName || ""} <${toEmail}>`.trim(),
        `SUBJECT: ${subject}`,
        "",
        "——— Message to send ———",
        body,
        "",
        `Gmail compose: ${composeUrl}`,
        "",
        "Tip: Open the Gmail link above, or hit Reply (Reply-To is the customer).",
      ].join("\n");

      const relay = await sendViaEmailMessage({
        email: env.EMAIL,
        from,
        to: adminTo,
        subject: `Deliver to ${toEmail}: ${subject}`,
        body: relayBody,
        replyTo: toEmail,
      });
      if (relay.ok) {
        return {
          delivered: true,
          adminRelay: true,
          composeUrl,
          detail: detail || "Delivered to admin Gmail only (customer still needs Resend or manual send)",
        };
      }

      return {
        delivered: false,
        composeUrl,
        detail: [detail, relay.detail, ...failDetails].filter(Boolean).join(" | "),
      };
    }
  }

  // Last resort: notify admin Gmail with the customer message + compose link
  if (env.EMAIL?.send) {
    const relayBody = [
      "SmartZone could not auto-deliver this message to the customer.",
      "Set Worker secret RESEND_API_KEY for direct customer delivery.",
      "",
      `CUSTOMER: ${input.toName || ""} <${toEmail}>`.trim(),
      `SUBJECT: ${subject}`,
      "",
      "——— Message to send ———",
      body,
      "",
      `Gmail compose: ${composeUrl}`,
    ].join("\n");
    const relay = await sendViaEmailMessage({
      email: env.EMAIL,
      from,
      to: adminTo,
      subject: `Deliver to ${toEmail}: ${subject}`,
      body: relayBody,
      replyTo: toEmail,
    });
    if (relay.ok) {
      return {
        delivered: true,
        adminRelay: true,
        composeUrl,
        detail: failDetails.filter(Boolean).join(" | ") || "Relayed to admin Gmail",
      };
    }
    if (relay.detail) failDetails.push(relay.detail);
  }

  return {
    delivered: false,
    composeUrl,
    detail:
      failDetails.filter(Boolean).join(" | ") ||
      "No email provider configured. Set RESEND_API_KEY Worker secret for customer delivery.",
  };
}

function customerHtmlMime(input: {
  from: string;
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
    `From: ${FROM_NAME} <${input.from}>`,
    `To: ${input.toEmail}`,
    `Reply-To: ${input.from}`,
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

  const env = await workerEnv();
  const from = fromAddress(env);

  if (env.RESEND_API_KEY) {
    const resend = await sendViaResend({
      apiKey: env.RESEND_API_KEY,
      from,
      toEmail,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: from,
    });
    if (resend.ok) return;
  }

  if (
    env.EMAIL?.send &&
    (
      await sendStructuredCustomerEmail({
        email: env.EMAIL,
        toEmail,
        from,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: from,
      })
    ).ok
  ) {
    return;
  }

  if (!env.EMAIL?.send) {
    throw new Error(
      "Outbound email is not configured. Add RESEND_API_KEY (recommended) or EMAIL binding.",
    );
  }

  const { EmailMessage } = await import("cloudflare:email");
  try {
    await env.EMAIL.send(
      new EmailMessage(
        from,
        toEmail,
        customerHtmlMime({
          from,
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
      throw new Error(
        "Could not deliver to this inbox via Cloudflare. Add a Resend API key (Worker secret RESEND_API_KEY) to send to customers.",
      );
    }
    throw new Error(detail || "Failed to send email");
  }
}
