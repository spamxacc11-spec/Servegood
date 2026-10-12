import { ShieldQuestion } from "lucide-react";
import { HygieneBadge } from "@/components/HygieneBadge";
import { tierForScore, tierKey } from "@/lib/hygiene";
import { formatDate } from "@/lib/format";
import type { HygieneSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Audited hygiene, shown apart from diner ratings. Uses the landing page's tier
 * badge so the three tiers look the same everywhere.
 */
export function HygieneChip({ hygiene, className }: { hygiene: HygieneSummary; className?: string }) {
  const tier = tierKey(hygiene.tier);
  if (hygiene.verified && tier) {
    return <HygieneBadge tier={tier} className={className} />;
  }
  if (hygiene.score === null) {
    return <HygieneBadge tier={null} className={className} />;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[13px] font-semibold text-muted ring-1 ring-line",
        className,
      )}
    >
      <ShieldQuestion className="h-4 w-4 shrink-0" aria-hidden="true" />
      Audit expired
    </span>
  );
}

/** Large score ring for detail pages and dashboards. */
export function HygieneScoreRing({
  score,
  verified,
  verifiedUntil,
  size = 112,
}: {
  score: number | null;
  verified: boolean;
  verifiedUntil?: string | null;
  size?: number;
}) {
  const tier = verified ? tierForScore(score) : null;
  const stroke = tier === "verified" ? "var(--color-brand)" : tier === "standard" ? "var(--color-caution)" : tier === "attention" ? "var(--color-alert)" : "var(--color-control)";
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-line)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-ink tabular-nums">{score ?? "—"}</span>
          <span className="text-[11px] text-muted">/ 100</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="sg-eyebrow">Hygiene score</p>
        <div className="mt-1.5">
          <HygieneChip hygiene={{ score, tier: tier ? labelFor(tier) : null, verified, verifiedUntil: verifiedUntil ?? null, lastAuditDate: null }} />
        </div>
        {verified && verifiedUntil && (
          <p className="mt-1.5 text-[13px] text-muted">Verified until {formatDate(verifiedUntil)}</p>
        )}
      </div>
    </div>
  );
}

function labelFor(tier: "verified" | "standard" | "attention") {
  return tier === "verified" ? "Verified Clean" : tier === "standard" ? "Standard Good" : "Needs Attention";
}
