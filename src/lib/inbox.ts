export type InboxSource = "inbound_email" | "contact_form" | "iot_lead" | "site_survey";
export type InboxStatus = "unread" | "read" | "archived";

export type InboxReply = {
  id: string;
  body: string;
  from_email: string;
  sent_at: string;
};

export type InboxLeadMeta = {
  phone?: string;
  company?: string;
  solution?: string;
  address?: string;
  city?: string;
  area?: string;
  lat?: number;
  lng?: number;
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
  meta?: InboxLeadMeta;
};

export function inboxSourceLabel(source: InboxSource): string {
  if (source === "inbound_email") return "Email";
  if (source === "iot_lead") return "IoT lead";
  if (source === "site_survey") return "Site survey";
  return "Contact form";
}

export function isSiteSurveyMessage(row: InboxMessage): boolean {
  return row.source === "site_survey" || row.source === "iot_lead";
}

export function surveyMapsUrl(meta?: InboxLeadMeta | null): string | null {
  if (!meta) return null;
  if (typeof meta.lat === "number" && typeof meta.lng === "number") {
    return `https://www.google.com/maps?q=${meta.lat},${meta.lng}`;
  }
  const q = [meta.address, meta.area, meta.city].filter(Boolean).join(", ");
  if (!q.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
