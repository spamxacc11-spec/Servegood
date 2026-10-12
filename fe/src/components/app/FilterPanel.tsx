import { useState, type ReactNode } from "react";
import { LocateFixed, X } from "lucide-react";
import { Button, Checkbox, Select } from "@/components/ui/primitives";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Filters } from "./filters";

/**
 * Discovery filters. Every change is applied immediately and written to the
 * URL by the page, so the browser back button and shared links just work.
 */
export function FilterPanel({
  filters,
  categories,
  localities,
  onChange,
  onReset,
}: {
  filters: Filters;
  categories: Category[];
  localities: string[];
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const cuisines = categories.filter((c) => c.kind === "CUISINE");
  const styles = categories.filter((c) => c.kind === "DINING_STYLE");

  const toggleCategory = (slug: string) =>
    onChange({
      category: filters.category.includes(slug)
        ? filters.category.filter((c) => c !== slug)
        : [...filters.category, slug],
    });

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Your browser cannot share a location.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, radiusKm: filters.radiusKm ?? 5, sort: "DISTANCE" });
      },
      () => {
        setLocating(false);
        setGeoError("Location permission was not granted. Choose a neighbourhood instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="sg-h3">Filters</h2>
        <button type="button" onClick={onReset} className="min-h-9 text-[14px] font-semibold text-brand hover:text-brand-strong">
          Clear all
        </button>
      </div>

      <Group title="Trust">
        <Checkbox
          label="Hygiene verified"
          hint="Approved audit that has not expired"
          checked={filters.verified}
          onChange={(v) => onChange({ verified: v })}
        />
        <label className="mt-2 block text-[13.5px] text-muted" htmlFor="f-hygiene">
          Minimum hygiene score
        </label>
        <Select
          id="f-hygiene"
          value={filters.minHygiene ?? ""}
          onChange={(e) => onChange({ minHygiene: e.target.value ? Number(e.target.value) : null })}
          className="mt-1"
        >
          <option value="">Any</option>
          <option value="70">70+ (Standard Good and above)</option>
          <option value="85">85+ (Verified Clean)</option>
          <option value="90">90+</option>
        </Select>
      </Group>

      <Group title="Ratings">
        <label className="block text-[13.5px] text-muted" htmlFor="f-rating">
          Overall rating
        </label>
        <Select
          id="f-rating"
          value={filters.minRating ?? ""}
          onChange={(e) => onChange({ minRating: e.target.value ? Number(e.target.value) : null })}
          className="mt-1"
        >
          <option value="">Any</option>
          <option value="3">3.0 and up</option>
          <option value="3.5">3.5 and up</option>
          <option value="4">4.0 and up</option>
          <option value="4.5">4.5 and up</option>
        </Select>
        <label className="mt-3 block text-[13.5px] text-muted" htmlFor="f-food">
          Food rating
        </label>
        <Select
          id="f-food"
          value={filters.minFoodRating ?? ""}
          onChange={(e) => onChange({ minFoodRating: e.target.value ? Number(e.target.value) : null })}
          className="mt-1"
        >
          <option value="">Any</option>
          <option value="3.5">3.5 and up</option>
          <option value="4">4.0 and up</option>
          <option value="4.5">4.5 and up</option>
        </Select>
      </Group>

      <Group title="Price">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Price range">
          {[1, 2, 3, 4].map((level) => {
            const min = filters.minPrice ?? 1;
            const max = filters.maxPrice ?? 4;
            const active = (filters.minPrice !== null || filters.maxPrice !== null) && level >= min && level <= max;
            return (
              <button
                key={level}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  // First click selects one level; a second click extends the range to it.
                  if (filters.minPrice === null && filters.maxPrice === null) onChange({ minPrice: level, maxPrice: level });
                  else if (level < min) onChange({ minPrice: level });
                  else if (level > max) onChange({ maxPrice: level });
                  else if (min === max) onChange({ minPrice: null, maxPrice: null });
                  else onChange({ minPrice: level, maxPrice: level });
                }}
                className={cn(
                  "min-h-11 min-w-12 rounded-control border px-3 text-[14px] font-semibold transition-colors duration-150",
                  active ? "border-brand bg-brand text-white" : "border-control bg-canvas text-ink hover:border-brand",
                )}
              >
                {"₹".repeat(level)}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Availability">
        <Checkbox label="Open now" checked={filters.openNow} onChange={(v) => onChange({ openNow: v })} />
        <Checkbox label="Delivers" hint="On at least one platform or direct" checked={filters.delivery} onChange={(v) => onChange({ delivery: v })} />
      </Group>

      <Group title="Location">
        <label className="block text-[13.5px] text-muted" htmlFor="f-locality">
          Neighbourhood
        </label>
        <Select id="f-locality" value={filters.locality} onChange={(e) => onChange({ locality: e.target.value })} className="mt-1">
          <option value="">All of Andheri</option>
          {localities.map((l) => (
            <option key={l} value={l.split(",")[0]}>
              {l}
            </option>
          ))}
        </Select>
        {filters.lat !== null ? (
          <div className="mt-3 rounded-control bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-ink">Near your location</p>
              <button
                type="button"
                aria-label="Stop using my location"
                onClick={() => onChange({ lat: null, lng: null, radiusKm: null, sort: filters.sort === "DISTANCE" ? "RELEVANCE" : filters.sort })}
                className="inline-flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-canvas"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <label className="mt-2 block text-[13px] text-muted" htmlFor="f-radius">
              Within
            </label>
            <Select id="f-radius" value={filters.radiusKm ?? 5} onChange={(e) => onChange({ radiusKm: Number(e.target.value) })} className="mt-1">
              {[1, 2, 5, 10, 20].map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={locate} loading={locating} className="mt-3 w-full">
            <LocateFixed className="h-4 w-4" aria-hidden="true" /> Use my location
          </Button>
        )}
        {geoError && <p className="mt-2 text-[13px] text-alert">{geoError}</p>}
      </Group>

      {cuisines.length > 0 && (
        <Group title="Cuisine">
          <ChipList items={cuisines} selected={filters.category} onToggle={toggleCategory} />
        </Group>
      )}
      {styles.length > 0 && (
        <Group title="Style">
          <ChipList items={styles} selected={filters.category} onToggle={toggleCategory} />
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-4">
      <legend className="sg-eyebrow float-left mb-2 w-full">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function ChipList({ items, selected, onToggle }: { items: Category[]; selected: string[]; onToggle: (slug: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => {
        const active = selected.includes(c.slug);
        return (
          <button
            key={c.slug}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(c.slug)}
            className={cn(
              "min-h-9 rounded-full border px-3 text-[13.5px] font-medium transition-colors duration-150",
              active ? "border-brand bg-brand-wash text-brand-strong" : "border-line bg-canvas text-ink hover:border-control",
            )}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
