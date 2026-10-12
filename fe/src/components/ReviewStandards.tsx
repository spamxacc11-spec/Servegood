import { useRef } from "react";
import { TIERS } from "../data/restaurants";
import { revealOnly, useSceneMotion } from "@/lib/motion";
import { TIER_STYLE } from "./tierStyle";

export function ReviewStandards() {
  const root = useRef<HTMLElement>(null);
  useSceneMotion(root, revealOnly);

  return (
    <section id="standards" ref={root} className="sg-container py-16 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 className="sg-h2">The three tiers</h2>
          <p className="mt-4 text-muted">
            A tier is meant to say what a reviewer found, in plain words, rather than compress a
            kitchen into a score.
          </p>
          <p className="mt-4 rounded-card border border-line bg-surface p-4 text-[14px] leading-relaxed text-muted">
            This is ServeGood&rsquo;s own review framework. It is not a government food safety
            rating, it is not an accreditation, and it is not a guarantee about your health.
            Scores of 85 and above are Verified Clean, 70 to 84 Standard Good, and below 70 Needs
            Attention.
          </p>
        </div>

        <dl className="divide-y divide-line border-y border-line" data-reveal-group>
          {TIERS.map(({ tier, label, summary, detail }) => {
            const { Icon, icon, chip } = TIER_STYLE[tier];
            return (
              <div key={tier} data-reveal="up" className="flex gap-4 py-6 first:pt-0 last:pb-0 sm:gap-5">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-card ${chip}`}
                >
                  <Icon className={`h-5 w-5 ${icon}`} aria-hidden="true" />
                </span>
                <div>
                  <dt className="sg-h3">{label}</dt>
                  <dd>
                    <p className="mt-1 text-[15px] font-medium text-ink">{summary}</p>
                    <p className="mt-1.5 max-w-[56ch] text-[14.5px] leading-relaxed text-muted">
                      {detail}
                    </p>
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
