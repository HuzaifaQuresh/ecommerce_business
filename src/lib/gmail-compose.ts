export function buildGmailComposeUrl(input: {
  toEmail: string;
  subject: string;
  body: string;
}): string {
  const subject = /^re:/i.test(input.subject) ? input.subject : `Re: ${input.subject}`;
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: input.toEmail,
    su: subject,
    body: input.body.slice(0, 1800),
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
