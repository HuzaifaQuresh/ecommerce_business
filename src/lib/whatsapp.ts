export function cleanSetting(value: unknown, fallback = ""): string {
  return String(value ?? fallback)
    .replace(/^"+|"+$/g, "")
    .trim();
}

export function toWhatsAppDigits(phone: string): string {
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length >= 10) digits = `92${digits.slice(1)}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message?: string): string | null {
  const digits = toWhatsAppDigits(phone);
  if (digits.length < 10) return null;
  const text = encodeURIComponent(message?.trim() || "Hello SmartZone Team");
  return `https://wa.me/${digits}?text=${text}`;
}

export function settingEnabled(value: unknown, fallback = true): boolean {
  const raw = cleanSetting(value, fallback ? "true" : "false").toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off") return false;
  if (raw === "true" || raw === "1" || raw === "on") return true;
  return fallback;
}
