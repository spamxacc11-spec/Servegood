import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Check } from "lucide-react";
import plateBiryani from "../assets/food/plate-biryani.webp";
import plateChole from "../assets/food/plate-chole.webp";
import plateDosa from "../assets/food/plate-dosa.webp";
import plateThali from "../assets/food/plate-thali.webp";
import { formatDate } from "@/lib/format";
import { rupees, summarisePrices, type Restaurant } from "../data/restaurants";
import { DUR, EASE, gsap, useSceneMotion, type SceneConditions } from "@/lib/motion";
import { Plate } from "./Plate";
import { useLandingData } from "./landing/landingData";
import { cn } from "@/lib/utils";

/**
 * The square plate crops. A listing gets the crop that matches its cuisine,
 * and the thali otherwise; the dish is illustrative, never a photo of that kitchen.
 */
function plateFor(r: Restaurant) {
  const c = `${r.cuisine} ${r.name}`.toLowerCase();
  if (c.includes("biryani") || c.includes("mughlai")) return plateBiryani;
  if (c.includes("south indian") || c.includes("dosa") || c.includes("tiffin")) return plateDosa;
  if (c.includes("chaat") || c.includes("chole")) return plateChole;
  return plateThali;
}

const SEGMENTS = [
  { key: "items", label: "Food", tint: "bg-brand" },
  { key: "fees", label: "Charges", tint: "bg-brand/55" },
  { key: "delivery", label: "Delivery", tint: "bg-brand/28" },
] as const;

const canMove = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

/**
 * Scene three: the same basket, priced three ways.
 *
 * On first entry the bars build in the order the sentence reads. The food price
 * draws, the charges extend it, delivery extends it again, then the totals and
 * the saving land. Every segment is a `scaleX` on a fixed-width element, so the
 * build never touches layout.
 */
function buildLab(scope: HTMLElement, { motion }: SceneConditions) {
  if (!motion) return;

  const q = gsap.utils.selector(scope);
  const tl = gsap.timeline({
    defaults: { ease: EASE.out },
    scrollTrigger: { trigger: scope, start: "top 72%", once: true },
  });

  SEGMENTS.forEach((seg, i) => {
    tl.from(
      q(`[data-seg="${seg.key}"]`),
      { scaleX: 0, duration: 0.45, stagger: 0.05 },
      i * 0.18,
    );
  });

  // Nothing that carries a figure is ever faded from zero. The bars above are
  // decorative and aria-hidden, so they can build from nothing; a total, the
  // lowest-price flag and the saving only ever travel. A trigger that fails to
  // fire then costs the reader a flourish rather than the prices themselves.
  tl.from(q("[data-row-total]"), { y: 10, duration: DUR.enter, stagger: 0.06 }, 0.42)
    .from(q("[data-best-flag]"), { scale: 0.85, duration: 0.35 }, 0.72)
    .from(q("[data-saving]"), { y: 12, duration: DUR.enter }, 0.84);
}

/**
 * Renders the real value every render, then decorates the change with a count.
 * React holds the truth, so a killed or skipped tween can never leave a stale
 * number on screen. There is no `aria-live` here on purpose: a screen reader
 * reads the final figure when it reaches it rather than every frame of the count.
 */
function Amount({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = previous.current;
    previous.current = value;

    // Settle on the real figure first. A previous count that was interrupted
    // may have left its own last frame in the text node, and React will not
    // repaint a node it did not write, so correcting it here is what stops a
    // rapid run of selections leaving the earlier meal's total on screen.
    el.textContent = rupees(value);
    if (from === value || !canMove()) return;

    const proxy = { n: from };
    const tween = gsap.to(proxy, {
      n: value,
      duration: 0.5,
      ease: EASE.out,
      onUpdate: () => {
        el.textContent = rupees(Math.round(proxy.n));
      },
      onComplete: () => {
        el.textContent = rupees(value);
      },
    });

    return () => {
      tween.kill();
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {rupees(value)}
    </span>
  );
}

export function PriceLab() {
  const root = useRef<HTMLElement>(null);
  const rowsRef = useRef<HTMLUListElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const { restaurants, live } = useLandingData();
  // Three meals that can actually be compared (two or more priced options).
  const meals = restaurants.filter((r) => r.quotes.length > 1).slice(0, 3);
  const [selected, setSelected] = useState<string | null>(null);
  const first = useRef(true);

  useSceneMotion(root, buildLab);

  const meal = meals.find((m) => m.id === selected) ?? meals[0];
  const summary = meal ? summarisePrices(meal.quotes) : null;
  const rows = summary?.rows ?? [];
  const best = summary?.best;
  const saving = summary?.saving ?? 0;
  const max = Math.max(1, ...rows.map((r) => r.items + r.fees + r.delivery));

  // Redraw on selection. Existing tweens are killed and their targets snapped
  // to the finished state first, so hammering the chips cannot stack timelines
  // or strand a bar at a half-drawn width from the previous meal.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const bars = rowsRef.current?.querySelectorAll("[data-seg]");
    const plate = plateRef.current;
    if (!canMove()) return;

    if (bars?.length) {
      gsap.killTweensOf(bars);
      gsap.fromTo(
        bars,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.4, ease: EASE.out, stagger: 0.03, overwrite: true },
      );
    }
    if (plate) {
      gsap.killTweensOf(plate);
      gsap.fromTo(
        plate,
        { opacity: 0, scale: 0.97 },
        { opacity: 1, scale: 1, duration: 0.45, ease: EASE.soft, overwrite: true },
      );
    }
  }, [selected]);

  if (!meal || !best) return null;
  const count = rows.length === 3 ? "three" : String(rows.length);

  return (
    <section id="compare" ref={root} className="sg-container py-16 lg:py-24">
      <div className="max-w-2xl">
        <h2 className="sg-h2">
          The same basket, <span className="text-brand">priced {count} ways.</span>
        </h2>
        <p className="sg-prose mt-4 text-muted">
          Menu prices differ between apps, and so do packaging, platform and delivery charges. This
          is the whole total for one identical basket on each option. Pick a meal to see it change.
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <div className="relative mx-auto w-full max-w-[20rem]">
            {/* Sits behind the dish so a swap never shows an empty hole. */}
            <div
              aria-hidden="true"
              className="absolute inset-[4%] rounded-full bg-brand-wash"
            />
            <div ref={plateRef} className="relative">
              <Plate key={meal.id} src={plateFor(meal)} alt="Illustrative dish on a steel plate" />
            </div>
          </div>

          <div className="mt-6 text-center lg:text-left">
            <p className="sg-h3">
              {meal.href ? (
                <Link to={meal.href} className="hover:text-brand-strong">
                  {meal.name}
                </Link>
              ) : (
                meal.name
              )}
            </p>
            <p className="mt-1 text-[14px] text-muted">{meal.neighbourhood}</p>
            <p className="mt-3 text-[14px] text-muted">
              {live ? "Basket" : "Sample basket"}: <span className="text-ink">{meal.basket}</span>
            </p>
          </div>
        </div>

        <div>
          <div role="group" aria-label="Choose a meal" className="flex flex-wrap gap-2">
            {meals.map((m) => {
              const active = m.id === meal.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(m.id)}
                  className={cn(
                    "min-h-11 rounded-control border px-4 text-[14px] font-semibold",
                    "transition-[background-color,border-color,color] duration-150 active:scale-98",
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-control bg-canvas text-ink hover:border-brand hover:text-brand-strong",
                  )}
                >
                  {m.cuisine}
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-[13px] text-muted">
            {live
              ? `Entered manually by ServeGood or the restaurant, not live${
                  meal.lastUpdated ? `; last updated ${formatDate(meal.lastUpdated)}` : ""
                }. Check the final price on the platform before ordering.`
              : "Sample amounts, not live prices. Nothing here is fetched from Swiggy, Zomato or any restaurant."}
          </p>

          <ul ref={rowsRef} className="mt-4 space-y-4">
            {rows.map((row) => {
              const isBest = row.platform === best.platform;
              const parts = { items: row.items, fees: row.fees, delivery: row.delivery };

              return (
                <li
                  key={row.platform}
                  className={cn(
                    "rounded-card border p-4 transition-colors duration-200",
                    isBest ? "border-brand bg-brand-wash" : "border-line bg-canvas",
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                      {row.platform}
                      {isBest && (
                        <span
                          data-best-flag
                          className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[12px] font-semibold text-white"
                        >
                          <Check className="h-3 w-3" aria-hidden="true" />
                          Lowest
                        </span>
                      )}
                    </p>
                    <p
                      data-row-total
                      className={cn(
                        "font-display text-xl font-bold tabular-nums",
                        isBest ? "text-brand-strong" : "text-ink",
                      )}
                    >
                      <Amount value={row.total} />
                    </p>
                  </div>

                  {/* Decorative: the same figures are written out underneath. */}
                  <div
                    aria-hidden="true"
                    className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-line"
                  >
                    {SEGMENTS.map((seg) => (
                      <span
                        key={seg.key}
                        data-seg={seg.key}
                        className={cn("block h-full origin-left", seg.tint)}
                        style={{ width: `${(parts[seg.key] / max) * 100}%` }}
                      />
                    ))}
                  </div>

                  <p className="mt-2 text-[13px] text-muted">
                    Food {rupees(row.items)} · Charges {rupees(row.fees)} · Delivery{" "}
                    {rupees(row.delivery)}
                    {(row.discount ?? 0) > 0 && <> · Discount −{rupees(row.discount ?? 0)}</>}
                  </p>
                </li>
              );
            })}
          </ul>

          <p data-saving className="mt-5 text-[15px] text-ink">
            Ordering on <span className="font-semibold text-brand-strong">{best.platform}</span>{" "}
            saves <Amount value={saving} className="font-semibold text-brand-strong" /> against the
            most expensive of the {count}.
          </p>

          <p className="mt-3 text-[13px] text-muted">
            {live ? (
              <>
                ServeGood does not take orders itself.{" "}
                {meal.href && (
                  <Link to={`${meal.href}#prices`} className="font-semibold text-brand hover:text-brand-strong">
                    See ordering links
                  </Link>
                )}
              </>
            ) : (
              "ServeGood does not take orders, so there is nothing to check out to yet."
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

