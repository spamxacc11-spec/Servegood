import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Leaf, Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import { FilterPanel } from "@/components/app/FilterPanel";
import { readFilters, SORT_OPTIONS, toQuery, writeFilters, type Filters } from "@/components/app/filters";
import { RestaurantSummaryCard } from "@/components/app/RestaurantSummaryCard";
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Pagination,
  Select,
  SponsoredLabel,
  Tabs,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { rupees } from "@/lib/format";
import type { SearchResult } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useCatalog } from "@/lib/useCatalog";

const SUGGESTIONS = ["Biryani", "Dosa", "Fish curry", "Paneer", "Chaat", "Versova", "Chakala"];

/** /search: restaurants, dishes and places in one place. */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const { categories, localities } = useCatalog();
  const [q, setQ] = useState(filters.q);
  const [tab, setTab] = useState<"restaurants" | "dishes">("restaurants");
  const [drawer, setDrawer] = useState(false);

  const hasQuery = params.toString().length > 0;
  const result = useApi<SearchResult>(hasQuery ? `search?${params}` : null, () => api.get("/search", toQuery(filters)));

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch, page: "page" in patch ? patch.page ?? 0 : 0 };
    setParams(writeFilters(next));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() });
  };

  const data = result.data;
  const dishes = data?.dishes ?? [];

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="sg-container py-10 lg:py-14">
          <h1 className="sg-h1">Search</h1>
          <p className="sg-lede mt-3 text-muted">Find a restaurant, a dish, a cuisine or a neighbourhood.</p>
          <form onSubmit={submit} role="search" className="mt-6 flex max-w-2xl gap-2">
            <label htmlFor="s-q" className="sr-only">
              Search
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input id="s-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “dosa” or “Lokhandwala”" className="pl-9" autoFocus />
            </div>
            <Button type="submit">Search</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQ(s);
                  update({ q: s });
                }}
                className="min-h-9 rounded-full border border-line bg-canvas px-3 text-[13.5px] text-ink hover:border-control"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="sg-container py-8 lg:py-12">
        {!hasQuery ? (
          <EmptyState icon={Search} title="What are you hungry for?">
            Search by dish, restaurant, cuisine or area, or{" "}
            <Link to="/restaurants" className="font-semibold text-brand">
              browse every restaurant
            </Link>
            .
          </EmptyState>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
            <aside className="hidden lg:block">
              <FilterPanel filters={filters} categories={categories} localities={localities} onChange={update} onReset={() => setParams(filters.q ? { q: filters.q } : {})} />
            </aside>

            <div className="min-w-0">
              <Tabs
                label="Result type"
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "restaurants", label: "Restaurants", count: data?.restaurants.totalElements },
                  { value: "dishes", label: "Dishes", count: dishes.length },
                ]}
              />

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setDrawer(true)}>
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
                </Button>
                {tab === "restaurants" && (
                  <>
                    <label htmlFor="s-sort" className="sr-only">
                      Sort by
                    </label>
                    <Select id="s-sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value as Filters["sort"] })} className="min-h-9 w-auto py-1 text-[14px]">
                      {SORT_OPTIONS.filter((o) => o.value !== "DISTANCE" || filters.lat !== null).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </>
                )}
              </div>

              {result.loading && !data ? (
                <LoadingState label="Searching" />
              ) : result.error ? (
                <div className="mt-4">
                  <ErrorState message={result.error} onRetry={result.reload} />
                </div>
              ) : data && tab === "restaurants" ? (
                <div className="mt-4">
                  {data.sponsored.length > 0 && (
                    <section aria-label="Sponsored results" className="mb-6 rounded-card border border-line bg-surface p-4">
                      <div className="flex items-center gap-2">
                        <SponsoredLabel />
                        <p className="text-[13px] text-muted">Paid placement, shown separately from search results.</p>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {data.sponsored.map((a) => (
                          <RestaurantSummaryCard key={a.adId} restaurant={a.restaurant} sponsored={{ adId: a.adId }} headline={a.headline} />
                        ))}
                      </div>
                    </section>
                  )}
                  {data.restaurants.content.length === 0 ? (
                    <EmptyState icon={UtensilsCrossed} title="No restaurants found">
                      {dishes.length > 0 ? "Some dishes match, see the Dishes tab." : "Try a different word or fewer filters."}
                    </EmptyState>
                  ) : (
                    <>
                      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {data.restaurants.content.map((r) => (
                          <RestaurantSummaryCard key={r.id} restaurant={r} />
                        ))}
                      </div>
                      <Pagination
                        page={data.restaurants.page}
                        totalPages={data.restaurants.totalPages}
                        totalElements={data.restaurants.totalElements}
                        onChange={(page) => update({ page })}
                      />
                    </>
                  )}
                </div>
              ) : (
                data && (
                  <div className="mt-4">
                    {dishes.length === 0 ? (
                      <EmptyState icon={UtensilsCrossed} title="No dishes match">
                        Dish search needs at least two letters and looks at menus of listed restaurants.
                      </EmptyState>
                    ) : (
                      <ul className="divide-y divide-line rounded-card border border-line bg-canvas">
                        {dishes.map((d) => (
                          <li key={d.itemId} className="flex flex-wrap items-start justify-between gap-3 p-4">
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                                {d.vegetarian && <Leaf className="h-4 w-4 text-brand" aria-label="Vegetarian" />}
                                {d.name}
                                {!d.available && <span className="text-[12.5px] font-normal text-muted">(currently unavailable)</span>}
                              </p>
                              {d.description && <p className="mt-0.5 text-[13.5px] text-muted">{d.description}</p>}
                              <p className="mt-1 text-[13.5px]">
                                <Link to={`/restaurants/${d.restaurantId}#menu`} className="font-semibold text-brand hover:text-brand-strong">
                                  {d.restaurantName}
                                </Link>
                                {d.locality && <span className="text-muted"> · {d.locality}</span>}
                              </p>
                            </div>
                            <p className="font-display text-lg font-bold text-ink tabular-nums">{rupees(d.price)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={drawer} onClose={() => setDrawer(false)} title="Filters" footer={<Button onClick={() => setDrawer(false)}>Show results</Button>}>
        <FilterPanel filters={filters} categories={categories} localities={localities} onChange={update} onReset={() => setParams(filters.q ? { q: filters.q } : {})} />
      </Modal>
    </>
  );
}
