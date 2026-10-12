/** Badge tones for every status the API returns. Colour is never the only signal: the word is always shown. */
export type Tone = "brand" | "neutral" | "caution" | "alert" | "info";

export const STATUS_TONE: Record<string, Tone> = {
  // restaurants
  APPROVED: "brand",
  PENDING_APPROVAL: "caution",
  REJECTED: "alert",
  SUSPENDED: "alert",
  // reviews
  VERIFIED: "brand",
  PENDING: "caution",
  FLAGGED: "alert",
  // audits
  DRAFT: "neutral",
  EXPIRED: "neutral",
  // campaigns
  ACTIVE: "brand",
  PAUSED: "neutral",
  // payments
  PAID: "brand",
  UNPAID: "caution",
  REFUNDED: "neutral",
  // reports
  OPEN: "caution",
  RESOLVED: "brand",
  DISMISSED: "neutral",
  // assignments
  ASSIGNED: "info",
  IN_PROGRESS: "caution",
  COMPLETED: "brand",
  CANCELLED: "neutral",
};

export const TONE_CLASS: Record<Tone, string> = {
  brand: "bg-brand-wash text-brand-strong",
  neutral: "bg-surface text-muted ring-1 ring-line",
  caution: "bg-caution-wash text-caution",
  alert: "bg-alert-wash text-alert",
  info: "bg-info-wash text-info",
};
