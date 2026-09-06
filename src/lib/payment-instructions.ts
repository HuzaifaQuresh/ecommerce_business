/** Post-checkout payment copy for non-COD methods */
export const PAYMENT_INSTRUCTIONS: Record<string, string> = {
  easypaisa:
    "Send the exact order total to SmartZone EasyPaisa 0332-3059259. Use your order ID as the transaction reference and email a screenshot to sales@smartzone.pk.",
  jazzcash:
    "JazzCash to 0332-3059259 (SmartZone). Include order ID in comments. Orders ship after payment verification (usually within 2 hours).",
  bank: "Transfer to SmartZone — HBL IBAN PK00 HABB 0000 0000 1234 5678. Email transfer proof with order ID to sales@smartzone.pk.",
  card: "You will receive a secure payment link by email within 15 minutes. Card payments are processed via our PCI-compliant partner.",
  cod: "Please keep exact change ready. Our courier will call before delivery.",
};
