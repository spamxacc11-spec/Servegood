import { Check, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, rupees, timeAgo } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/labels";
import type { DeliveryComparison } from "@/lib/types";

/**
 * Same basket, every ordering option, with the cheapest promoted. Each total
 * shows when and by whom it was recorded; nothing is presented as live unless
 * it came from a connected provider API.
 */
export function DeliveryComparisonView({ data }: { data: DeliveryComparison }) {
  const priced = data.options.filter((o) => o.currentPrice);
  const max = Math.max(1, ...priced.map((o) => Number(o.currentPrice!.finalTotal)));

  if (data.options.length === 0) {
    return <p className="text-[14.5px] text-muted">This restaurant has not listed any ordering options yet.</p>;
  }

  return (
    <div>
      {data.basket && (
        <p className="text-[14px] text-muted">
          Same basket on every option: <span className="font-semibold text-ink">{data.basket}</span>
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {data.options.map((o) => {
          const p = o.currentPrice;
          return (
            <li
              key={o.optionId}
              className={cn("rounded-card border p-4", o.cheapest ? "border-brand bg-brand-wash" : "border-line bg-canvas")}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                  {o.provider.name}
                  {o.provider.directChannel && <span className="text-[12.5px] font-normal text-muted">(the restaurant&rsquo;s own channel)</span>}
                  {o.cheapest && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[12px] font-semibold text-white">
                      <Check className="h-3 w-3" aria-hidden="true" /> Cheapest
                    </span>
                  )}
                  {!o.available && <span className="text-[12.5px] font-normal text-muted">(not currently available)</span>}
                </p>
                <p className={cn("font-display text-xl font-bold tabular-nums", o.cheapest ? "text-brand-strong" : "text-ink")}>
                  {p ? rupees(p.finalTotal) : "No price yet"}
                </p>
              </div>

              {p && (
                <>
                  <div aria-hidden="true" className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${(Number(p.finalTotal) / max) * 100}%` }} />
                  </div>
                  <p className="mt-2 text-[13px] text-muted">
                    Food {rupees(p.foodSubtotal)} · Delivery {rupees(p.deliveryFee)} · Platform {rupees(p.platformFee)}
                    {Number(p.otherFees) > 0 && <> · Other {rupees(p.otherFees)}</>}
                    {Number(p.discount) > 0 && <> · Discount −{rupees(p.discount)}</>}
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted" title={formatDateTime(p.recordedAt)}>
                    {SOURCE_LABEL[p.source]} · updated {timeAgo(p.recordedAt)}
                    {p.live && " · live"}
                  </p>
                </>
              )}

              {o.orderingUrl && o.available && (
                <a
                  href={o.orderingUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-brand hover:text-brand-strong"
                >
                  Order on {o.provider.name}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {data.cheapest && data.savingVsHighest !== null && Number(data.savingVsHighest) > 0 && (
        <p className="mt-4 text-[15px] text-ink">
          Ordering on <span className="font-semibold text-brand-strong">{data.cheapest.provider.name}</span> saves{" "}
          <span className="font-semibold text-brand-strong">{rupees(data.savingVsHighest)}</span> against the most expensive option.
        </p>
      )}

      <p className="mt-4 flex gap-2 text-[13px] text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {data.disclaimer}
          {data.lastUpdated && <> Last updated {formatDateTime(data.lastUpdated)}.</>}
        </span>
      </p>
    </div>
  );
}
