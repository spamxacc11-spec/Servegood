import { ShieldQuestion } from "lucide-react";
import type { HygieneTier } from "../data/restaurants";
import { TIER_STYLE } from "./tierStyle";

export function HygieneBadge({ tier, className = "" }: { tier: HygieneTier | null; className?: string }) {
  if (!tier) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[13px] font-semibold text-muted ring-1 ring-line ${className}`}
      >
        <ShieldQuestion className="h-4 w-4 shrink-0" aria-hidden="true" />
        Not yet audited
      </span>
    );
  }
  const { label, Icon, chip, icon } = TIER_STYLE[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${chip} ${className}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${icon}`} aria-hidden="true" />
      {label}
    </span>
  );
}
