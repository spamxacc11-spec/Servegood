import { useRef } from "react";
import plateThali from "../assets/food/plate-thali.webp";
import { EASE, gsap, useSceneMotion, type SceneConditions } from "@/lib/motion";
import { Plate } from "./Plate";

/**
 * The three things a review visit records. Positions are a fraction of the
 * square plate stage, so a dot stays on the same part of the dish at any size.
 */
const POINTS = [
  {
    n: 1,
    label: "Preparation surfaces",
    note: "Are worktops and boards wiped down between orders, and is raw food kept away from cooked?",
    x: 27,
    y: 29,
    angle: 205,
  },
  {
    n: 2,
    label: "Storage conditions",
    note: "Is cold storage holding temperature, are containers covered, and is stock dated and rotated?",
    x: 74,
    y: 44,
    angle: 340,
  },
  {
    n: 3,
    label: "Food handling",
    note: "Do staff wash hands between tasks, tie hair back, and keep service surfaces clear during a rush?",
    x: 45,
    y: 76,
    angle: 95,
  },
] as const;

/**
 * Scene two: the meal stays put while the explanation moves.
 *
 * The dish is held by CSS `position: sticky` rather than a ScrollTrigger pin.
 * Sticky gives the same anchored-visual effect with none of the pin failure
 * modes: no pin spacer to duplicate, no layout to destabilise, no invented
 * empty scroll, and it reverses and resizes for free. GSAP is then only ever
 * reading scroll progress and moving transforms, which is the part it is good
 * at. The extra scroll this costs is the height of the two phase blocks,
 * roughly 1.6 viewports on a desktop screen.
 *
 * Below the `lg` breakpoint sticky is off and the scene is two stacked blocks
 * under the dish, which is also exactly what reduced motion gets.
 */
function buildMeal(scope: HTMLElement, { motion, desktop, tall }: SceneConditions) {
  if (!motion || !desktop || !tall) return;

  const q = gsap.utils.selector(scope);
  const phaseOne = q("[data-phase='1']")[0];
  const phaseTwo = q("[data-phase='2']")[0];
  if (!phaseTwo) return;

  const acrossScene = {
    trigger: scope,
    start: "top top",
    end: "bottom bottom",
    scrub: 1,
  } as const;

  // The dish turns a little and settles back as the story runs. An in-plane
  // rotation is the one move a flat overhead photo can make honestly.
  gsap.to(q("[data-plate-rotor]"), {
    rotate: 10,
    scale: 0.94,
    ease: EASE.linear,
    scrollTrigger: acrossScene,
  });
  gsap.to(q("[data-plate-shadow]"), {
    scaleX: 0.92,
    opacity: 0.38,
    ease: EASE.linear,
    scrollTrigger: acrossScene,
  });
  gsap.to(q("[data-rail-fill]"), {
    scaleX: 1,
    ease: EASE.linear,
    scrollTrigger: { ...acrossScene, scrub: true },
  });

  // Phase one reads on its own; phase two is the choreographed part.
  if (phaseOne) {
    // Travel only again: everything inside the two signature scenes stays
    // readable whether or not its trigger ever runs. Ordinary sections keep the
    // conventional fade-up, which only ever hides content that is already
    // scrolled past the viewport edge.
    gsap.from(q("[data-phase='1'] [data-phase-item]"), {
      y: 20,
      duration: 0.5,
      stagger: 0.07,
      ease: EASE.out,
      scrollTrigger: { trigger: phaseOne, start: "top 80%", once: true },
    });
  }

  // Each observation lights its dot, extends a short leader line and brings in
  // its note. Scrubbed, so scrolling back up takes them off again in order.
  const tl = gsap.timeline({
    defaults: { ease: EASE.out },
    scrollTrigger: { trigger: phaseTwo, start: "top 78%", end: "bottom 72%", scrub: true },
  });

  POINTS.forEach((_, i) => {
    const at = i * 0.18;
    tl.from(q(`[data-point="${i}"]`), { scale: 0, opacity: 0, duration: 0.3 }, at)
      .from(q(`[data-point-line="${i}"]`), { scaleX: 0, duration: 0.3 }, at + 0.06)
      // Travel only. These notes are the checklist itself, so they must stay
      // readable even if this trigger never runs.
      .from(q(`[data-note="${i}"]`), { x: 18, duration: 0.35 }, at + 0.04);
  });

  // The proposed review closes with the brand's own shield drawing itself in.
  const shield = scope.querySelector<SVGPathElement>("[data-shield-path]");
  const check = scope.querySelector<SVGPathElement>("[data-check-path]");
  if (shield && check) {
    [shield, check].forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    tl.to(shield, { strokeDashoffset: 0, duration: 0.5, ease: EASE.linear }, 0.62)
      .to(check, { strokeDashoffset: 0, duration: 0.3, ease: EASE.linear }, 0.9)
      .from(q("[data-shield-label]"), { x: -8, duration: 0.3 }, 1.0);
  }
}

export function FollowTheMeal() {
  const root = useRef<HTMLElement>(null);
  useSceneMotion(root, buildMeal);

  return (
    <section id="how-it-works" ref={root} className="relative border-y border-line bg-surface">
      {/* Softens the white-to-pale-green boundary without animating a colour. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-canvas to-transparent"
      />

      <div className="sg-container relative py-16 lg:py-24">
        <div className="max-w-2xl">
          <h2 className="sg-h2">
            Follow the meal <span className="text-brand">from kitchen to checkout.</span>
          </h2>
          <p className="sg-prose mt-4 text-muted">
            One dish, two questions. How clean is the kitchen behind it, and where does the same
            order cost least? This is the review half. The price half is next.
          </p>
        </div>

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          {/* The dish. Sticky on desktop, plain flow everywhere else. */}
          <div className="lg:sticky lg:top-[calc(var(--sg-header-h)+2.5rem)] lg:self-start">
            <div className="relative mx-auto w-full max-w-[23rem]">
              <Plate
                src={plateThali}
                alt="An Indian thali of rice, dal, curries and flatbread served on a steel platter"
              />

              {POINTS.map((p, i) => (
                <span
                  key={p.n}
                  className="absolute z-10 block"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  <span
                    data-point-line={i}
                    aria-hidden="true"
                    className="absolute top-1/2 left-1/2 block h-px w-10 origin-left bg-canvas/85"
                    style={{ transform: `rotate(${p.angle}deg)` }}
                  />
                  <span
                    data-point={i}
                    className="relative flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand font-display text-[13px] font-bold text-white ring-2 ring-canvas/80"
                  >
                    {p.n}
                    <span className="sr-only">: {p.label}</span>
                  </span>
                </span>
              ))}

              <div className="absolute -right-2 -bottom-3 z-10 flex items-center gap-2 rounded-full border border-line bg-canvas py-1.5 pr-3.5 pl-2 shadow-raised">
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
                  <path
                    data-shield-path
                    d="M12 3.2 19 6v5.4c0 4.3-2.9 7.6-7 9.4-4.1-1.8-7-5.1-7-9.4V6l7-2.8Z"
                    fill="none"
                    stroke="var(--color-brand)"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    data-check-path
                    d="m8.6 12.1 2.5 2.5 4.4-4.9"
                    fill="none"
                    stroke="var(--color-brand)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span data-shield-label className="text-[13px] font-semibold text-brand-strong">
                  Hygiene audit passed
                </span>
              </div>
            </div>

            {/* Phase rail. Decorative: each phase already carries a numbered heading. */}
            <div aria-hidden="true" className="mx-auto mt-10 hidden w-full max-w-[23rem] lg:block">
              <div className="relative h-px w-full bg-control/35">
                <span
                  data-rail-fill
                  className="absolute inset-0 block origin-left scale-x-0 bg-brand"
                />
              </div>
              <div className="mt-2 flex justify-between text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
                <span>Discover</span>
                <span>Understand the review</span>
              </div>
            </div>

            <p className="mt-6 text-[13px] text-muted lg:text-center">
              Illustrative food photography. Not a photo of any listed restaurant.
            </p>
          </div>

          {/* The story. Two blocks, spaced so the dish stays with them on desktop. */}
          <div className="flex flex-col gap-14 lg:gap-[30vh] lg:pt-[4vh] lg:pb-[12vh]">
            <article data-phase="1">
              <p
                data-phase-item
                className="text-[12px] font-semibold tracking-[0.1em] text-brand uppercase"
              >
                One
              </p>
              <h3 data-phase-item className="sg-h2 mt-2 text-[1.75rem] lg:text-[2rem]">
                Discover the dish
              </h3>
              <p data-phase-item className="sg-prose mt-4 text-muted">
                Listings open with the food and the neighbourhood, not a star average. A thali from
                a tiffin room and a biryani from a dum kitchen are different promises, and the page
                says which one you are looking at before it says anything else.
              </p>
              <dl
                data-phase-item
                className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2"
              >
                <div>
                  <dt className="text-[13px] text-muted">Shown first</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold text-ink">
                    Dish, cuisine, neighbourhood
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">Not shown</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold text-ink">
                    Star ratings, sponsored order
                  </dd>
                </div>
              </dl>
            </article>

            <article data-phase="2">
              <p className="text-[12px] font-semibold tracking-[0.1em] text-brand uppercase">Two</p>
              <h3 className="sg-h2 mt-2 text-[1.75rem] lg:text-[2rem]">Understand the review</h3>
              <p className="sg-prose mt-4 text-muted">
                A visit works through a fixed checklist. These are the three things it records, and
                the numbers match the points marked on the dish.
              </p>

              <ol className="mt-7 space-y-5 border-t border-line pt-6">
                {POINTS.map((p, i) => (
                  <li key={p.n} data-note={i} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-wash font-display text-[13px] font-bold text-brand-strong">
                      {p.n}
                    </span>
                    <div>
                      <h4 className="sg-h3 text-[16px]">{p.label}</h4>
                      <p className="mt-1 max-w-[46ch] text-[14.5px] leading-relaxed text-muted">
                        {p.note}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-7 rounded-card border border-line bg-canvas p-4 text-[14px] leading-relaxed text-muted">
                This is ServeGood&rsquo;s own framework, not a government food safety rating and
                not a health guarantee. The points above describe what a visit looks at; each
                restaurant&rsquo;s page shows what its own audit actually found.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
