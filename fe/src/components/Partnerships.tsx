import { useRef } from "react";
import { Link } from "react-router";
import { revealOnly, useSceneMotion } from "@/lib/motion";
import { ArrowRight, BadgeCheck, Megaphone, ShieldCheck } from "lucide-react";
import { homeFor, useAuth } from "@/lib/auth";

const BENEFITS = [
  {
    title: "A listing that says something specific",
    body: "A written note about your kitchen instead of a star average, so the care you already take is visible to someone deciding where to order from.",
  },
  {
    title: "Your direct channel priced fairly",
    body: "The comparison shows your own ordering channel next to the aggregators on the same basket, including charges, so diners can see when ordering direct costs less.",
  },
  {
    title: "Reviewed on the checklist, not on spend",
    body: "Tiers come from the review visit. Paid placement is labelled as sponsored and kept out of the tier, the ratings and the reviews.",
  },
];

const STEPS = [
  { icon: BadgeCheck, text: "Create an owner account and add your restaurant." },
  { icon: ShieldCheck, text: "A ServeGood admin approves the listing, then a reviewer visits for the hygiene audit." },
  { icon: Megaphone, text: "Manage your menu, reply to reviews, keep ordering links current, and optionally buy sponsored placement." },
];

export function Partnerships() {
  const root = useRef<HTMLElement>(null);
  useSceneMotion(root, revealOnly);
  const { status, user, hasRole } = useAuth();
  const isOwner = status === "authenticated" && hasRole("RESTAURANT_OWNER");

  return (
    <section id="for-restaurants" ref={root} className="border-y border-line bg-surface">
      <div className="sg-container grid gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16 lg:py-24">
        <div data-reveal-group>
          <h2 className="sg-h2" data-reveal="up">
            For restaurants
          </h2>
          <p className="sg-prose mt-4 text-muted" data-reveal="up">
            ServeGood is built for kitchens that already run clean and have no easy way to prove it to
            someone scrolling a delivery app.
          </p>

          <dl className="mt-8 divide-y divide-line border-t border-line">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="py-5">
                <dt className="sg-h3">{benefit.title}</dt>
                <dd className="mt-1.5 max-w-[54ch] text-[15px] leading-relaxed text-muted">
                  {benefit.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-card border border-line bg-canvas p-6 shadow-raised sm:p-8">
          <h3 className="sg-h3">List your restaurant</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
            Listing is free. It takes a few minutes, and your restaurant goes live once an admin has
            checked the details.
          </p>

          <ol className="mt-5 space-y-4">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-wash text-brand-strong">
                  <s.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-[14.5px] leading-relaxed text-ink">{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-2">
            {isOwner ? (
              <Link to="/restaurant-dashboard" className="sg-btn sg-btn-primary">
                Go to your restaurant dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : status === "authenticated" && user ? (
              <>
                <p className="rounded-control bg-surface p-3 text-[13.5px] text-muted">
                  You are signed in with a {hasRole("CONSUMER") ? "diner" : "staff"} account. Restaurant
                  listings are managed from a separate owner account.
                </p>
                <Link to={homeFor(user)} className="sg-btn sg-btn-secondary">
                  Back to my dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/register?type=owner" className="sg-btn sg-btn-primary">
                  Create an owner account <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/login?next=%2Frestaurant-dashboard" className="sg-btn sg-btn-secondary">
                  I already have an account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
