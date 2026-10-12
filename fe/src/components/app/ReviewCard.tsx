import type { ReactNode } from "react";
import { BadgeCheck, MessageSquareReply } from "lucide-react";
import { StatusBadge, Stars } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import type { Review } from "@/lib/types";

export function ReviewCard({
  review: r,
  showStatus,
  showRestaurant,
  actions,
  children,
}: {
  review: Review;
  showStatus?: boolean;
  showRestaurant?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-card border border-line bg-canvas p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {showRestaurant && <p className="sg-h3 text-[16px]">{r.restaurantName}</p>}
          <p className="flex flex-wrap items-center gap-2 text-[14px]">
            <span className="font-semibold text-ink">{r.authorName}</span>
            {r.reviewerReview && (
              <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-strong">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Audited visit
              </span>
            )}
            <span className="text-muted">
              · {r.visitDate ? `Visited ${formatDate(r.visitDate)}` : `Posted ${formatDate(r.createdAt)}`}
            </span>
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Stars value={r.overallRating} label={`${r.overallRating} out of 5`} />
            <span className="text-[13px] font-semibold text-ink">{r.overallRating}/5</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showStatus && <StatusBadge status={r.status} />}
          {actions}
        </div>
      </div>

      {r.title && <h3 className="mt-3 text-[15.5px] font-semibold text-ink">{r.title}</h3>}
      <p className="mt-2 text-[14.5px] leading-relaxed whitespace-pre-line text-ink">{r.comment}</p>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
        <div className="flex gap-1">
          <dt>Food</dt>
          <dd className="font-semibold text-ink">{r.foodRating}/5</dd>
        </div>
        <div className="flex gap-1">
          <dt>Service</dt>
          <dd className="font-semibold text-ink">{r.serviceRating}/5</dd>
        </div>
        <div className="flex gap-1">
          <dt>Cleanliness seen</dt>
          <dd className="font-semibold text-ink">{r.hygieneRating}/5</dd>
        </div>
      </dl>

      {r.foodRatings.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {r.foodRatings.map((f, i) => (
            <li key={i} className="rounded-full bg-surface px-2.5 py-0.5 text-[12.5px] text-ink">
              {f.dishName} · {f.rating}/5
            </li>
          ))}
        </ul>
      )}

      {r.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-control border border-line">
              <img src={url} alt="Photo from this review" loading="lazy" className="h-20 w-20 object-cover" />
            </a>
          ))}
        </div>
      )}

      {r.moderationNote && showStatus && (
        <p className="mt-3 rounded-control bg-caution-wash p-3 text-[13.5px] text-ink">
          <span className="font-semibold">Moderator note:</span> {r.moderationNote}
        </p>
      )}

      {r.response && (
        <div className="mt-4 border-l-2 border-brand pl-4">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-strong">
            <MessageSquareReply className="h-4 w-4" aria-hidden="true" />
            Response from {r.response.responderName}
            <span className="font-normal text-muted">· {formatDate(r.response.updatedAt)}</span>
          </p>
          <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-line text-ink">{r.response.body}</p>
        </div>
      )}

      {children}
    </article>
  );
}
