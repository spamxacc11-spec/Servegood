import { formatDate } from "@/lib/format";
import { tierForScore } from "@/lib/hygiene";
import type { Audit } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The eight category scores of an audit, plus findings and recommendations. */
export function AuditBreakdown({ audit, showEvidence = true }: { audit: Audit; showEvidence?: boolean }) {
  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {audit.items.map((i) => {
          const tier = tierForScore(i.score * 10);
          return (
            <li key={i.category} className="rounded-control border border-line p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[14px] font-semibold text-ink">{i.label}</p>
                <p className="text-[14px] font-semibold text-ink tabular-nums">{i.score}/10</p>
              </div>
              <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    tier === "verified" ? "bg-brand" : tier === "standard" ? "bg-caution" : "bg-alert",
                  )}
                  style={{ width: `${i.score * 10}%` }}
                />
              </div>
              <p className="mt-1.5 text-[12px] text-muted">Weight {i.weight}%</p>
              {i.notes && <p className="mt-1 text-[13px] text-muted">{i.notes}</p>}
            </li>
          );
        })}
      </ul>

      {(audit.findings || audit.recommendations) && (
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {audit.findings && (
            <div>
              <dt className="sg-eyebrow">Findings</dt>
              <dd className="mt-1 text-[14px] leading-relaxed whitespace-pre-line text-ink">{audit.findings}</dd>
            </div>
          )}
          {audit.recommendations && (
            <div>
              <dt className="sg-eyebrow">Recommendations</dt>
              <dd className="mt-1 text-[14px] leading-relaxed whitespace-pre-line text-ink">{audit.recommendations}</dd>
            </div>
          )}
        </dl>
      )}

      {showEvidence && audit.evidence.length > 0 && (
        <div className="mt-5">
          <p className="sg-eyebrow">Evidence</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {audit.evidence.map((e, idx) => (
              <a key={e.url + idx} href={e.url} target="_blank" rel="noreferrer" className="block w-28">
                <img src={e.url} alt={e.caption ?? "Audit evidence photo"} loading="lazy" className="h-28 w-28 rounded-control border border-line object-cover" />
                {e.caption && <span className="mt-1 block text-[12px] text-muted">{e.caption}</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[12.5px] text-muted">
        Audited {formatDate(audit.auditDate)} by {audit.reviewerName}
        {audit.validUntil && ` · valid until ${formatDate(audit.validUntil)}`}
      </p>
    </div>
  );
}
