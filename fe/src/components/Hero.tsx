import { useRef } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import plateThali from "../assets/food/plate-thali.webp";
import { rupees, summarisePrices } from "../data/restaurants";
import { useLandingData } from "./landing/landingData";
import { DUR, EASE, STAGGER, gsap, useSceneMotion, type SceneConditions } from "@/lib/motion";
import { HygieneBadge } from "./HygieneBadge";
import { Dome, Plate, Steam } from "./Plate";

/**
 * Scene one: the food reveal.
 *
 * The dome rests over the dish, lifts up and out while its shadow spreads and
 * softens (further from the surface means a larger, lighter shadow), the dish
 * settles out of a slight rotation and overshoot, and steam rises once.
 *
 * The headline, lede and both calls to action run on their own track from t=0,
 * so nothing the visitor actually needs is gated behind the choreography.
 */
function buildHero(scope: HTMLElement, { motion }: SceneConditions) {
  if (!motion) return;

  const q = gsap.utils.selector(scope);
  const tl = gsap.timeline({ defaults: { ease: EASE.out } });

  // The headline and the buttons start from a hidden state, so if the ticker
  // never advances (a tab that is throttled the whole time, a stalled frame
  // loop, an error later in the build) they would stay hidden. If the timeline
  // has not moved by the time it should have finished, jump it to the end.
  const failsafe = window.setTimeout(() => {
    if (tl.progress() === 0) tl.progress(1);
  }, 2600);
  tl.eventCallback("onComplete", () => window.clearTimeout(failsafe));

  tl.from(q("[data-hero-line]"), { yPercent: 105, duration: 0.75, stagger: 0.08 }, 0)
    .from(q("[data-hero-lede]"), { y: 14, opacity: 0, duration: DUR.enter }, 0.18)
    .from(q("[data-hero-cta]"), { y: 12, opacity: 0, duration: 0.45, stagger: STAGGER }, 0.26)
    .from(q("[data-hero-stage]"), { scale: 0.96, opacity: 0, duration: 0.7, ease: EASE.soft }, 0.05)

    // The dome covers the dish from t=0 and is clear of the frame by t=1.25.
    .fromTo(
      q("[data-dome]"),
      { yPercent: 0, scale: 1, opacity: 1 },
      { yPercent: -128, scale: 1.05, duration: 0.85, ease: "power2.in" },
      0.4,
    )
    .to(q("[data-dome]"), { opacity: 0, duration: 0.3 }, 0.95)

    // The shadow answers the lift; then the dish settles.
    .fromTo(
      q("[data-plate-shadow]"),
      { scaleX: 0.86, scaleY: 0.78, opacity: 0.9 },
      { scaleX: 1.1, scaleY: 1.04, opacity: 0.5, duration: 0.9, ease: EASE.soft },
      0.4,
    )
    .from(q("[data-plate-rotor]"), { rotate: -7, duration: 1.1, ease: EASE.soft }, 0.45)
    .from(q("[data-plate-img]"), { scale: 1.06, duration: 1.1, ease: EASE.soft }, 0.45)

    .from(q("[data-hero-card]"), { y: 18, opacity: 0, duration: DUR.enter }, 0.95)

    // One-shot steam once the dome is clear. It never loops, so it needs no
    // pause control and stops competing with the headline after a moment.
    .fromTo(
      q("[data-steam]"),
      { yPercent: 14, opacity: 0 },
      { yPercent: -70, opacity: 0.5, duration: 1.5, ease: "power1.out", stagger: 0.18 },
      1.1,
    )
    .to(q("[data-steam]"), { opacity: 0, duration: 0.9, stagger: 0.18 }, 2.1)

    .from(q("[data-scroll-cue]"), { y: -8, opacity: 0, duration: 0.45 }, 1.3);
}

export function Hero() {
  const root = useRef<HTMLElement>(null);
  useSceneMotion(root, buildHero);

  // The example panel reuses the same data and the same arithmetic as the
  // listings below, so what the hero promises and what they show never disagree.
  const { restaurants, live } = useLandingData();
  const sample = restaurants.find((r) => r.quotes.length > 1) ?? restaurants[0];
  const prices = sample && sample.quotes.length > 0 ? summarisePrices(sample.quotes) : null;

  return (
    <section ref={root} className="border-b border-line">
      <div className="sg-container grid items-center gap-12 py-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16 lg:py-20">
        <div>
          <h1 className="sg-h1">
            <span className="block overflow-hidden pb-[0.08em]">
              <span data-hero-line className="block">
                Find cleaner kitchens.
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.08em]">
              <span data-hero-line className="block text-brand">
                Compare delivery prices.
              </span>
            </span>
          </h1>

          <p data-hero-lede className="sg-lede mt-5 text-muted">
            ServeGood puts a kitchen hygiene review and a side-by-side price check on the same
            listing, so you can see how clean a place is and where the same order costs least.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link data-hero-cta to="/restaurants" className="sg-btn sg-btn-primary max-sm:w-full">
              Explore restaurants
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a data-hero-cta href="#how-it-works" className="sg-btn sg-btn-secondary max-sm:w-full">
              How it works
            </a>
          </div>

          <p
            data-scroll-cue
            className="mt-10 hidden items-center gap-2.5 text-[13px] text-muted lg:flex"
          >
            <span aria-hidden="true" className="h-7 w-px bg-control/60" />
            <ChevronDown className="h-4 w-4 text-brand" aria-hidden="true" />
            Follow the meal
          </p>
        </div>

        <div>
          <div data-hero-stage className="relative mx-auto w-full max-w-[25rem]">
            <Plate
              src={plateThali}
              alt="An Indian thali of rice, dal, curries and flatbread served on a steel platter"
              priority
            />
            <Steam />
            <Dome className="inset-y-auto bottom-[-2%] h-[80%]" />
          </div>

          {sample && (
            <div
              data-hero-card
              className="relative mt-5 rounded-card border border-line bg-canvas p-4 shadow-raised sm:-mt-8 sm:ml-6 sm:w-[min(100%,26rem)] sm:p-5"
            >
              <p className="text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">
                {live ? "Listed in Andheri" : "Demonstration of a listing"}
              </p>
              <p className="sg-h3 mt-2">
                {sample.href ? (
                  <Link to={sample.href} className="after:absolute after:inset-0 after:content-[''] hover:text-brand-strong">
                    {sample.name}
                  </Link>
                ) : (
                  sample.name
                )}
              </p>
              <p className="mt-0.5 text-[13.5px] text-muted">{sample.neighbourhood}</p>

              <div className="mt-3">
                <HygieneBadge tier={sample.tier} />
              </div>

              {prices && (
                <dl className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3">
                  <div>
                    <dt className="text-[13px] text-muted">
                      Lowest {live ? "" : "sample "}total on {prices.best.platform}
                    </dt>
                    <dd className="font-display text-2xl font-bold text-brand-strong">
                      {rupees(prices.best.total)}
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-[13px] text-muted">vs highest</dt>
                    <dd className="text-[15px] font-semibold text-ink">{rupees(prices.saving)} more</dd>
                  </div>
                </dl>
              )}
            </div>
          )}

          <p className="mt-4 text-[13px] text-muted">
            Illustrative food photography. Not a photo of any listed restaurant.
          </p>
        </div>
      </div>
    </section>
  );
}
