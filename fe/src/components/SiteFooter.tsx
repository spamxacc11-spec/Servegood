import { Link } from "react-router";
import logo from "../assets/servegood-logo.png";

const LINKS = [
  { to: "/restaurants", label: "Explore restaurants" },
  { to: "/search", label: "Search dishes and places" },
  { to: "/#how-it-works", label: "How it works" },
  { to: "/#standards", label: "The three tiers" },
  { to: "/#for-restaurants", label: "For restaurants" },
  { to: "/#faq", label: "Questions" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="sg-container grid gap-10 py-14 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-16">
        <div>
          <img src={logo} alt="ServeGood" width={373} height={88} loading="lazy" className="h-8 w-auto" />
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-muted">
            Restaurant hygiene reviews and delivery price comparisons side by side, starting with
            Andheri, Mumbai.
          </p>
        </div>

        <nav aria-label="Sections">
          <h2 className="text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">Explore</h2>
          <ul className="mt-1">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex min-h-11 items-center text-[15px] text-ink transition-colors duration-150 hover:text-brand-strong"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="sg-container border-t border-line py-6">
        <p className="text-[13.5px] leading-relaxed text-muted">
          Hygiene tiers come from ServeGood&rsquo;s own audit framework, not a government rating.
          Delivery prices are entered by people and show when they were last updated; they are not
          live. Sponsored placements are always labelled and never change ratings.
        </p>
        <p className="mt-2 text-[13.5px] text-muted">&copy; {new Date().getFullYear()} ServeGood</p>
      </div>
    </footer>
  );
}
