import { useMemo, useRef } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { SqueezeCarousel, type SqueezeSlide } from "@/components/ui/carousel-squeeze";
import { RestaurantSummaryCard } from "@/components/app/RestaurantSummaryCard";
import { SponsoredLabel } from "@/components/ui/primitives";
import { revealOnly, useSceneMotion } from "@/lib/motion";
import { rupees, summarisePrices, type Restaurant } from "../data/restaurants";
import { HygieneBadge } from "./HygieneBadge";
import { RestaurantCard } from "./RestaurantCard";
import { useLandingData } from "./landing/landingData";

/**
 * Each panel is one listing. The sentence under the strip is built from the
 * same record and the same price maths as the card further down, and the
 * button goes to that restaurant, so the two can never disagree and the
 * action always has somewhere real to go.
 */
function toSlide(r: Restaurant, live: boolean): SqueezeSlide {
  const prices = r.quotes.length ? summarisePrices(r.quotes) : null;
  return {
    id: r.id,
    title: r.name,
    description: prices
      ? `${r.cuisine} in ${r.neighbourhood}. The ${live ? "" : "sample "}basket comes to ${rupees(prices.best.total)} on ${
          prices.best.platform
        }${prices.rows.length > 1 ? `, ${rupees(prices.saving)} less than the highest of the ${prices.rows.length}` : ""}.`
      : `${r.cuisine} in ${r.neighbourhood}.`,
    image: r.image,
    imageAlt: r.imageAlt,
    overlay: (
      <span className="flex flex-wrap items-center gap-2">
        {!live && (
          <span className="rounded-full bg-canvas/90 px-2.5 py-1 text-[12px] font-semibold tracking-[0.06em] text-ink uppercase">
            Sample listing
          </span>
        )}
        <HygieneBadge tier={r.tier} />
      </span>
    ),
    action: live ? "Open the restaurant" : "See the full listing",
    href: r.href ?? `#listing-${r.id}`,
  };
}

export function FeaturedRestaurants() {
  const root = useRef<HTMLElement>(null);
  useSceneMotion(root, revealOnly);
  const { restaurants, live, sponsored } = useLandingData();
  const slides = useMemo(() => restaurants.map((r) => toSlide(r, live)), [restaurants, live]);

  return (
    <section id="restaurants" ref={root} className="sg-container py-16 lg:py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl" data-reveal-group>
          <h2 className="sg-h2" data-reveal="up">
            {live ? "Top-rated kitchens in Andheri" : "Six listings, shown the way ServeGood would show them"}
          </h2>
          <p className="sg-prose mt-4 text-muted" data-reveal="up">
            {live
              ? "Ranked by verified diner ratings only. Each listing pairs its audited hygiene tier with a price comparison for one identical basket."
              : "Each listing pairs a hygiene tier with a note about what a reviewer would look at, then compares one identical basket across Swiggy, Zomato and ordering direct. Every name, note and amount below is sample content."}
          </p>
        </div>
        {live && (
          <Link to="/restaurants" className="sg-btn sg-btn-secondary">
            See all restaurants <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="mt-10">
        <SqueezeCarousel
          key={live ? "live" : "sample"}
          slides={slides}
          label={live ? "Top-rated restaurant listings" : "Sample restaurant listings"}
          radius={14}
          duration={700}
          controls
        />
      </div>

      {sponsored.length > 0 && (
        <aside aria-label="Sponsored" className="mt-12 rounded-card border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SponsoredLabel />
            <p className="text-[13px] text-muted">A paid placement. It does not change any rating, review or hygiene score.</p>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sponsored.map((s) => (
              <RestaurantSummaryCard key={s.adId} restaurant={s.restaurant} sponsored={{ adId: s.adId }} headline={s.headline} />
            ))}
          </div>
        </aside>
      )}

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-reveal-group>
        {restaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} live={live} />
        ))}
      </div>
    </section>
  );
}
