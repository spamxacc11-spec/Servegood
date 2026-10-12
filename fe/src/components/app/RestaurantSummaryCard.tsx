import { Link } from "react-router";
import { Clock, MapPin, Navigation, Truck, UtensilsCrossed } from "lucide-react";
import { SponsoredLabel, Stars } from "@/components/ui/primitives";
import { priceLevel, rating, rupees } from "@/lib/format";
import { api } from "@/lib/api";
import type { RestaurantSummary } from "@/lib/types";
import { FavoriteButton } from "./FavoriteButton";
import { HygieneChip } from "./HygieneScore";

/**
 * The listing card used across discovery, search, favourites and dashboards.
 * Follows the landing page's card: 4:3 photo, 14px radius, border-first,
 * a 2px lift on hover. Hygiene and diner ratings are shown as separate facts.
 */
export function RestaurantSummaryCard({
  restaurant: r,
  sponsored,
  headline,
  onFavoriteChange,
}: {
  restaurant: RestaurantSummary;
  sponsored?: { adId: number };
  headline?: string | null;
  onFavoriteChange?: (favorite: boolean) => void;
}) {
  const cuisines = r.categories.filter((c) => c.kind === "CUISINE").map((c) => c.name);

  return (
    <article className="group/card relative flex flex-col overflow-hidden rounded-card border border-line bg-canvas transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:border-control hover:shadow-raised motion-reduce:hover:translate-y-0">
      <div className="relative overflow-hidden bg-surface">
        {r.coverImageUrl ? (
          <img
            src={r.coverImageUrl}
            alt=""
            width={800}
            height={600}
            loading="lazy"
            decoding="async"
            className="aspect-4/3 w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/card:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
          />
        ) : (
          <div className="flex aspect-4/3 w-full items-center justify-center text-control">
            <UtensilsCrossed className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {sponsored && <SponsoredLabel />}
        </div>
        <div className="absolute top-3 right-3 z-10">
          <FavoriteButton restaurantId={r.id} initial={r.favorite} onChange={onFavoriteChange} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="sg-h3">
          <Link
            to={`/restaurants/${r.id}`}
            onClick={() => {
              if (sponsored) void api.post(`/ads/${sponsored.adId}/click`).catch(() => undefined);
            }}
            className="after:absolute after:inset-0 after:content-[''] hover:text-brand-strong"
          >
            {r.name}
          </Link>
        </h3>
        {headline && <p className="mt-1 text-[13.5px] text-ink">{headline}</p>}
        <p className="mt-1 text-[13.5px] text-muted">
          {cuisines.length ? cuisines.slice(0, 3).join(" · ") : "Restaurant"} · {priceLevel(r.priceLevel)}
          {r.costForTwo ? ` · ${rupees(r.costForTwo)} for two` : ""}
        </p>
        {r.locality && (
          <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {r.locality}
            {r.distanceKm !== null && (
              <span className="inline-flex items-center gap-1">
                · <Navigation className="h-3 w-3" aria-hidden="true" /> {r.distanceKm} km
              </span>
            )}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <HygieneChip hygiene={r.hygiene} />
          {r.hygiene.verified && r.hygiene.score !== null && (
            <span className="text-[13px] font-semibold text-muted tabular-nums">{r.hygiene.score}/100</span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-[13.5px]">
          {r.ratings.reviewCount > 0 ? (
            <>
              <Stars value={r.ratings.overall} label={`Rated ${rating(r.ratings.overall)} out of 5`} />
              <span className="font-semibold text-ink">{rating(r.ratings.overall)}</span>
              <span className="text-muted">
                ({r.ratings.reviewCount} verified review{r.ratings.reviewCount === 1 ? "" : "s"})
              </span>
            </>
          ) : (
            <span className="text-muted">No verified reviews yet</span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-[13px] text-muted">
          {r.openNow !== null && (
            <span className={r.openNow ? "inline-flex items-center gap-1 font-semibold text-brand-strong" : "inline-flex items-center gap-1"}>
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {r.openNow ? "Open now" : "Closed now"}
            </span>
          )}
          {r.deliveryAvailable && (
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              {r.cheapestTotal !== null ? (
                <>
                  Basket cheapest on {r.cheapestProvider}:{" "}
                  <span className="font-semibold text-ink">{rupees(r.cheapestTotal)}</span>
                </>
              ) : (
                "Delivers"
              )}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
