export type InboxSource = "inbound_email" | "contact_form" | "iot_lead";
export type InboxStatus = "unread" | "read" | "archived";

export type InboxReply = {
  id: string;
  body: string;
  from_email: string;
  sent_at: string;
};

export type InboxMessage = {
  id: string;
  source: InboxSource;
  status: InboxStatus;
  from_name: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  created_at: string;
  replies?: InboxReply[];
};

export function inboxSourceLabel(source: InboxSource): string {
  if (source === "inbound_email") return "Email";
  if (source === "iot_lead") return "IoT lead";
  return "Contact form";
}
