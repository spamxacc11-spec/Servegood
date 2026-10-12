import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import { FilterPanel } from "@/components/app/FilterPanel";
import { activeFilterCount, readFilters, SORT_OPTIONS, toQuery, writeFilters, type Filters } from "@/components/app/filters";
import { RestaurantSummaryCard } from "@/components/app/RestaurantSummaryCard";
import { Button, EmptyState, ErrorState, Input, LoadingState, Modal, Pagination, Select, SponsoredLabel } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Page, RestaurantSummary, Sponsored } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useCatalog } from "@/lib/useCatalog";

/**
 * /restaurants: browse with filters. Sponsored placements sit in their own
 * labelled strip above the results and are never mixed into the ranked list.
 */
export function RestaurantsPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const { categories, localities } = useCatalog();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState(filters.q);

  const key = `restaurants?${params.toString()}`;
  const results = useApi<Page<RestaurantSummary>>(key, () => api.get("/restaurants", toQuery(filters)));

  const adPlacement = filters.category.length === 1 ? "CATEGORY_PAGE" : "LOCAL_RECOMMENDATIONS";
  const ads = useApi<Sponsored[]>(filters.page === 0 ? `ads:${adPlacement}:${filters.category.join()}:${filters.locality}` : null, () =>
    api.get("/ads", {
      placement: adPlacement,
      category: filters.category.length === 1 ? filters.category[0] : undefined,
      location: filters.locality || "Andheri",
      limit: 2,
    }),
  );

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch, page: "page" in patch ? patch.page ?? 0 : 0 };
    setParams(writeFilters(next));
  };
  const reset = () => {
    setQ("");
    setParams(new URLSearchParams());
  };
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() });
  };

  const count = activeFilterCount(filters);
  const panel = <FilterPanel filters={filters} categories={categories} localities={localities} onChange={update} onReset={reset} />;

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="sg-container py-10 lg:py-14">
          <p className="sg-eyebrow text-brand">Andheri, Mumbai</p>
          <h1 className="sg-h1 mt-2">Restaurants</h1>
          <p className="sg-lede mt-3 text-muted">
            Every listing shows its audited hygiene score apart from diner ratings, and compares delivery prices for the same basket.
          </p>
          <form onSubmit={submitSearch} role="search" className="mt-6 flex max-w-2xl gap-2">
            <label htmlFor="r-search" className="sr-only">
              Search restaurants
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input
                id="r-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Restaurant, dish, cuisine or area"
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </div>
      </section>

      <div className="sg-container py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">{panel}</aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[14.5px] text-muted" aria-live="polite">
                {results.data
                  ? `${results.data.totalElements} restaurant${results.data.totalElements === 1 ? "" : "s"}`
                  : " "}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setDrawer(true)}>
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters{count ? ` (${count})` : ""}
                </Button>
                <label htmlFor="r-sort" className="sr-only">
                  Sort by
                </label>
                <Select
                  id="r-sort"
                  value={filters.sort}
                  onChange={(e) => update({ sort: e.target.value as Filters["sort"] })}
                  className="min-h-9 w-auto py-1 text-[14px]"
                >
                  {SORT_OPTIONS.filter((o) => o.value !== "DISTANCE" || filters.lat !== null).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {ads.data && ads.data.length > 0 && (
              <section aria-label="Sponsored restaurants" className="mt-6 rounded-card border border-line bg-surface p-4">
                <div className="flex items-center gap-2">
                  <SponsoredLabel />
                  <p className="text-[13px] text-muted">Paid placement. Does not affect ratings, hygiene scores or the ranked results below.</p>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {ads.data.map((a) => (
                    <RestaurantSummaryCard key={a.adId} restaurant={a.restaurant} sponsored={{ adId: a.adId }} headline={a.headline} />
                  ))}
                </div>
              </section>
            )}

            <div className="mt-6">
              {results.loading && !results.data ? (
                <LoadingState label="Finding restaurants" />
              ) : results.error ? (
                <ErrorState message={results.error} onRetry={results.reload} />
              ) : results.data && results.data.content.length === 0 ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No restaurants match these filters"
                  action={
                    <Button variant="secondary" onClick={reset}>
                      Clear filters
                    </Button>
                  }
                >
                  Try removing a filter or searching for something broader.
                </EmptyState>
              ) : (
                results.data && (
                  <div className={results.loading ? "opacity-60 transition-opacity" : undefined}>
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                      {results.data.content.map((r) => (
                        <RestaurantSummaryCard key={r.id} restaurant={r} />
                      ))}
                    </div>
                    <Pagination
                      page={results.data.page}
                      totalPages={results.data.totalPages}
                      totalElements={results.data.totalElements}
                      onChange={(page) => {
                        update({ page });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal open={drawer} onClose={() => setDrawer(false)} title="Filters" footer={<Button onClick={() => setDrawer(false)}>Show results</Button>}>
        {panel}
      </Modal>
    </>
  );
}
