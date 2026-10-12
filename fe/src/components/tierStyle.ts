import { BadgeCheck, ShieldCheck, TriangleAlert } from "lucide-react";
import type { HygieneTier } from "../data/restaurants";

/**
 * Tier is carried by an icon and a word as well as by colour, so the three
 * tiers stay distinguishable without relying on hue alone.
 */
export const TIER_STYLE = {
  verified: {
    label: "Verified Clean",
    Icon: ShieldCheck,
    chip: "bg-brand-wash text-brand-strong",
    icon: "text-brand",
  },
  standard: {
    label: "Standard Good",
    Icon: BadgeCheck,
    chip: "bg-caution-wash text-caution",
    icon: "text-caution",
  },
  attention: {
    label: "Needs Attention",
    Icon: TriangleAlert,
    chip: "bg-alert-wash text-alert",
    icon: "text-alert",
  },
} as const satisfies Record<
  HygieneTier,
  { label: string; Icon: typeof ShieldCheck; chip: string; icon: string }
>;
