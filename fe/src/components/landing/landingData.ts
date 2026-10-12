import { createContext, useContext } from "react";
import { RESTAURANTS, type Restaurant } from "@/data/restaurants";
import type { RestaurantSummary, Sponsored } from "@/lib/types";

export interface LandingData {
  /** Listings in the landing page's shape. Live from the API, or the labelled samples as a fallback. */
  restaurants: Restaurant[];
  /** True when the listings came from the API. */
  live: boolean;
  loading: boolean;
  /** API summaries keyed by landing id, for cards that link to the real page. */
  summaries: Record<string, RestaurantSummary>;
  sponsored: Sponsored[];
}

export const LandingDataContext = createContext<LandingData>({
  restaurants: RESTAURANTS,
  live: false,
  loading: false,
  summaries: {},
  sponsored: [],
});

export function useLandingData() {
  return useContext(LandingDataContext);
}
