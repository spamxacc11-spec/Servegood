import { useId, useRef, useState } from "react";
import { revealOnly, useSceneMotion } from "@/lib/motion";
import { Plus } from "lucide-react";
import { FAQS } from "../data/restaurants";

export function Faq() {
  const root = useRef<HTMLElement>(null);
  useSceneMotion(root, revealOnly);
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();

  return (
    <section id="faq" ref={root} className="sg-container py-16 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
        <h2 className="sg-h2" data-reveal="up">
          Questions
        </h2>

        <div className="divide-y divide-line border-y border-line">
          {FAQS.map((faq, i) => {
            const expanded = open === i;
            const buttonId = `${base}-t${i}`;
            const panelId = `${base}-p${i}`;
            return (
              <div key={faq.q}>
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpen(expanded ? null : i)}
                    className="flex w-full items-start justify-between gap-4 py-5 text-left transition-colors duration-150 hover:text-brand-strong"
                  >
                    <span className="sg-h3 min-w-0">{faq.q}</span>
                    <Plus
                      className={`mt-0.5 h-5 w-5 shrink-0 text-brand transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                        expanded ? "rotate-45" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>

                {expanded && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="pb-5"
                  >
                    <p className="max-w-[62ch] text-[15px] leading-relaxed text-muted">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
