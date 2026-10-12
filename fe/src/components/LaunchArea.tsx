import { ArrowRight } from "lucide-react";
import { SvgFollowScroll } from "./ui/svg-follow-scroll";

const DETAILS = [
  { label: "Launch area", value: "Andheri, Mumbai" },
  { label: "Region", value: "Maharashtra, India" },
  { label: "Launch date", value: "To be announced" },
] as const;

/**
 * Where ServeGood starts. A single brand-green stroke draws itself down the
 * band as you scroll, from the heading to the launch card.
 *
 * Driven by framer-motion's `useScroll`, which reads scroll into a motion value
 * and writes the path directly, so like the GSAP scenes it never touches React
 * state. Nothing pins and the page scrolls natively throughout.
 */
export function LaunchArea() {
  return (
    <SvgFollowScroll
      id="launch-area"
      className="border-y border-line bg-surface"
      // The loops occupy x 38-99% of the drawing. They are placed in the empty
      // right half on desktop and mostly off the right edge on smaller screens,
      // so they never sit under the heading; the tail is what crosses the band.
      pathClassName="top-6 left-[calc(84%-198px)] h-auto w-[520px] sm:left-[calc(72%-327px)] sm:w-[860px] lg:top-10 lg:right-[-1%] lg:left-auto lg:w-[min(1150px,72vw)]"
    >
      <div className="sg-container pt-16 lg:pt-24">
        <p className="text-[12px] font-semibold tracking-[0.1em] text-brand uppercase">
          Where we start
        </p>
        <h2 className="mt-3 max-w-[14ch] font-display text-[clamp(2rem,1.1rem+4.2vw,4.25rem)] leading-[1.04] font-extrabold tracking-[-0.035em] text-ink lg:max-w-[30rem]">
          One neighbourhood first. <span className="text-brand">Andheri, Mumbai.</span>
        </h2>
        <p className="sg-lede mt-5 max-w-[30rem] text-muted">
          ServeGood launches in Andheri before anywhere else. The first review visits and price
          checks are planned for kitchens there, so the listings you see will be from places you can
          actually order from.
        </p>
      </div>

      {/* Room for the stroke to travel between the heading and the card. */}
      <div aria-hidden="true" className="h-[38vh] lg:h-[62vh]" />

      <div className="sg-container pb-16 lg:pb-24">
        <div className="@container rounded-card bg-brand-strong px-5 pt-6 pb-8 text-white sm:px-8 lg:px-10 lg:pb-10">
          <p
            aria-hidden="true"
            className="text-center font-display text-[21cqi] leading-[0.9] font-extrabold tracking-[-0.045em]"
          >
            Andheri
          </p>

          <div className="mt-8 grid gap-6 border-t border-white/20 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {DETAILS.map((d) => (
              <div key={d.label}>
                <p className="text-[12px] font-semibold tracking-[0.08em] text-brand-wash uppercase">
                  {d.label}
                </p>
                <p className="mt-1 text-[15px] font-semibold">{d.value}</p>
              </div>
            ))}
            <div>
              <p className="text-[12px] font-semibold tracking-[0.08em] text-brand-wash uppercase">
                Run a kitchen in Andheri?
              </p>
              <a
                href="#for-restaurants"
                className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold underline decoration-white/40 underline-offset-4 transition-colors duration-150 hover:decoration-white"
              >
                Register interest
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </SvgFollowScroll>
  );
}
