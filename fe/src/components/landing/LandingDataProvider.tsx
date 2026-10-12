import { useEffect, useState, type ReactNode } from "react";
import fallbackImg from "@/assets/food/hero-thali.jpg";
import { RESTAURANTS, type Restaurant } from "@/data/restaurants";
import { api } from "@/lib/api";
import { tierKey } from "@/lib/hygiene";
import type { DeliveryComparison, Page, RestaurantSummary, Sponsored } from "@/lib/types";
import { LandingDataContext, type LandingData } from "./landingData";

function toLanding(r: RestaurantSummary, d: DeliveryComparison | null): Restaurant {
  const cuisines = r.categories.filter((c) => c.kind === "CUISINE").map((c) => c.name);
  return {
    id: String(r.id),
    name: r.name,
    cuisine: cuisines.slice(0, 2).join(" and ") || "Restaurant",
    neighbourhood: [r.locality, r.city].filter(Boolean).join(", "),
    image: r.coverImageUrl ?? fallbackImg,
    imageAlt: `A dish from ${r.name}`,
    imageSource: "",
    tier: r.hygiene.verified ? tierKey(r.hygiene.tier) : null,
    reviewNote:
      r.ratings.reviewCount > 0
        ? `Rated ${Number(r.ratings.overall).toFixed(1)} from ${r.ratings.reviewCount} verified review${r.ratings.reviewCount === 1 ? "" : "s"}.`
        : "No verified reviews yet.",
    basket: d?.basket ?? "",
    quotes: (d?.options ?? [])
      .filter((o) => o.available && o.currentPrice)
      .map((o) => ({
        platform: o.provider.name,
        items: Number(o.currentPrice!.foodSubtotal),
        fees: Number(o.currentPrice!.platformFee) + Number(o.currentPrice!.otherFees),
        delivery: Number(o.currentPrice!.deliveryFee),
        discount: Number(o.currentPrice!.discount),
      })),
    href: `/restaurants/${r.id}`,
    lastUpdated: d?.lastUpdated ?? null,
  };
}

/**
 * Feeds the landing page with real listings: the six best-rated restaurants,
 * their price comparisons and any homepage sponsored placement. If the API is
 * unreachable the page keeps working on its clearly labelled sample data.
 */
export function LandingDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LandingData>({
    restaurants: RESTAURANTS,
    live: false,
    loading: true,
    summaries: {},
    sponsored: [],
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const page = await api.get<Page<RestaurantSummary>>("/restaurants", { sort: "RATING", size: 6 });
        if (!page.content.length) throw new Error("no restaurants yet");
        // Detail pages are deliberately not fetched here: each detail fetch counts as a
        // restaurant view, and the homepage must not inflate owners' analytics.
        const [comparisons, sponsored] = await Promise.all([
          Promise.all(page.content.map((r) => api.get<DeliveryComparison>(`/restaurants/${r.id}/delivery-options`).catch(() => null))),
          api.get<Sponsored[]>("/ads", { placement: "HOMEPAGE", location: "Andheri", limit: 1 }).catch(() => []),
        ]);
        if (!alive) return;
        const restaurants = page.content.map((r, i) => toLanding(r, comparisons[i]));
        setState({
          restaurants,
          live: true,
          loading: false,
          summaries: Object.fromEntries(page.content.map((r) => [String(r.id), r])),
          sponsored,
        });
      } catch {
        if (alive) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return <LandingDataContext.Provider value={state}>{children}</LandingDataContext.Provider>;
}
