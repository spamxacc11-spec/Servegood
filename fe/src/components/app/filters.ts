import type { SearchSort } from "@/lib/types";

/** Every discovery filter, as it appears in the URL. */
export interface Filters {
  q: string;
  category: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  minFoodRating: number | null;
  minHygiene: number | null;
  verified: boolean;
  delivery: boolean;
  openNow: boolean;
  locality: string;
  lat: number | null;
  lng: number | null;
  radiusKm: number | null;
  sort: SearchSort;
  page: number;
}

const num = (v: string | null) => (v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

export function readFilters(p: URLSearchParams): Filters {
  return {
    q: p.get("q") ?? "",
    category: p.getAll("category"),
    minPrice: num(p.get("minPrice")),
    maxPrice: num(p.get("maxPrice")),
    minRating: num(p.get("minRating")),
    minFoodRating: num(p.get("minFoodRating")),
    minHygiene: num(p.get("minHygiene")),
    verified: p.get("verified") === "true",
    delivery: p.get("delivery") === "true",
    openNow: p.get("openNow") === "true",
    locality: p.get("locality") ?? "",
    lat: num(p.get("lat")),
    lng: num(p.get("lng")),
    radiusKm: num(p.get("radiusKm")),
    sort: (p.get("sort") as SearchSort) || "RELEVANCE",
    page: num(p.get("page")) ?? 0,
  };
}

export function writeFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  f.category.forEach((c) => p.append("category", c));
  if (f.minPrice !== null) p.set("minPrice", String(f.minPrice));
  if (f.maxPrice !== null) p.set("maxPrice", String(f.maxPrice));
  if (f.minRating !== null) p.set("minRating", String(f.minRating));
  if (f.minFoodRating !== null) p.set("minFoodRating", String(f.minFoodRating));
  if (f.minHygiene !== null) p.set("minHygiene", String(f.minHygiene));
  if (f.verified) p.set("verified", "true");
  if (f.delivery) p.set("delivery", "true");
  if (f.openNow) p.set("openNow", "true");
  if (f.locality) p.set("locality", f.locality);
  if (f.lat !== null && f.lng !== null) {
    p.set("lat", f.lat.toFixed(5));
    p.set("lng", f.lng.toFixed(5));
    if (f.radiusKm !== null) p.set("radiusKm", String(f.radiusKm));
  }
  if (f.sort && f.sort !== "RELEVANCE") p.set("sort", f.sort);
  if (f.page > 0) p.set("page", String(f.page));
  return p;
}

/** The query object sent to /api/restaurants and /api/search. */
export function toQuery(f: Filters, size = 12) {
  return {
    q: f.q || undefined,
    category: f.category.length ? f.category : undefined,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    minRating: f.minRating,
    minFoodRating: f.minFoodRating,
    minHygiene: f.minHygiene,
    verified: f.verified || undefined,
    delivery: f.delivery || undefined,
    openNow: f.openNow || undefined,
    locality: f.locality || undefined,
    lat: f.lat,
    lng: f.lng,
    radiusKm: f.radiusKm,
    sort: f.sort,
    page: f.page,
    size,
  };
}

export function activeFilterCount(f: Filters) {
  return (
    f.category.length +
    [f.minPrice, f.maxPrice, f.minRating, f.minFoodRating, f.minHygiene].filter((v) => v !== null).length +
    [f.verified, f.delivery, f.openNow].filter(Boolean).length +
    (f.locality ? 1 : 0) +
    (f.lat !== null ? 1 : 0)
  );
}

export const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: "RELEVANCE", label: "Best match" },
  { value: "RATING", label: "Highest rated" },
  { value: "FOOD", label: "Best food rating" },
  { value: "HYGIENE", label: "Highest hygiene score" },
  { value: "REVIEWS", label: "Most reviewed" },
  { value: "PRICE_ASC", label: "Price: low to high" },
  { value: "PRICE_DESC", label: "Price: high to low" },
  { value: "DISTANCE", label: "Nearest first" },
  { value: "NEWEST", label: "Newest" },
];
