import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import logo from "../assets/servegood-logo.png";
import { EASE, ScrollTrigger, gsap, useSceneMotion, type SceneConditions } from "@/lib/motion";
import { homeFor, useAuth } from "@/lib/auth";
import { AccountMenu } from "@/components/app/AccountMenu";

/** Section links point at the landing page from anywhere; app links are routes. */
const NAV = [
  { to: "/restaurants", label: "Restaurants" },
  { to: "/#how-it-works", label: "How it works" },
  { to: "/#standards", label: "Our standards" },
  { to: "/#for-restaurants", label: "For restaurants" },
];

/**
 * A reading-progress line under the header, and a hairline shadow once the hero
 * is behind you. Both are driven by ScrollTrigger rather than a scroll listener,
 * and neither touches React state, so scrolling never re-renders the tree.
 */
function buildHeader(scope: HTMLElement, { motion }: SceneConditions) {
  const bar = scope.querySelector("[data-progress]");

  if (bar && motion) {
    gsap.to(bar, {
      scaleX: 1,
      ease: EASE.linear,
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });
  }

  ScrollTrigger.create({
    trigger: document.documentElement,
    start: "top top-=80",
    onToggle: ({ isActive }) => scope.classList.toggle("is-scrolled", isActive),
  });
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-control px-3 py-2 text-[15px] font-medium whitespace-nowrap transition-colors duration-150 hover:bg-surface hover:text-ink ${
    isActive ? "text-ink" : "text-muted"
  }`;

export function SiteHeader() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { status, user } = useAuth();
  const location = useLocation();

  // Escape closes the panel and returns focus to the control that opened it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Navigating closes the mobile menu.
  const [lastPath, setLastPath] = useState(location.pathname + location.hash);
  if (lastPath !== location.pathname + location.hash) {
    setLastPath(location.pathname + location.hash);
    if (open) setOpen(false);
  }

  useSceneMotion(root, buildHeader);

  const nextParam = location.pathname === "/" ? "" : `?next=${encodeURIComponent(location.pathname + location.search)}`;

  return (
    <header
      ref={root}
      className="sticky top-0 z-50 border-b border-line bg-canvas transition-shadow duration-200 [&.is-scrolled]:shadow-[0_1px_0_rgba(226,232,227,1),0_8px_20px_-16px_rgba(37,48,57,0.25)]"
    >
      <a
        href="#main"
        className="sr-only rounded-control bg-brand px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-10"
      >
        Skip to content
      </a>

      <div className="sg-container flex h-[68px] items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center self-stretch" aria-label="ServeGood, home">
          <img
            src={logo}
            alt="ServeGood"
            width={373}
            height={88}
            className="h-8 w-auto sm:h-9"
            fetchPriority="high"
          />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) =>
            item.to.includes("#") ? (
              <Link key={item.to} to={item.to} className={navClass({ isActive: false })}>
                {item.label}
              </Link>
            ) : (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ),
          )}
          {status === "authenticated" && user ? (
            <div className="ml-2">
              <AccountMenu />
            </div>
          ) : (
            <>
              <Link to={`/login${nextParam}`} className="sg-btn sg-btn-ghost ml-1 whitespace-nowrap">
                Sign in
              </Link>
              <Link to="/restaurants" className="sg-btn sg-btn-primary ml-1 whitespace-nowrap">
                Explore restaurants
              </Link>
            </>
          )}
        </nav>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-control text-ink transition-colors duration-150 hover:bg-surface lg:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Absolutely positioned so opening the menu never shifts the page. */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-canvas shadow-raised lg:hidden"
      >
        <nav aria-label="Main, mobile" className="sg-container flex flex-col gap-1 py-4">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-control px-3 py-3 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-surface"
            >
              {item.label}
            </Link>
          ))}
          {status === "authenticated" && user ? (
            <Link to={homeFor(user)} onClick={() => setOpen(false)} className="sg-btn sg-btn-primary mt-2">
              My dashboard
            </Link>
          ) : (
            <>
              <Link to={`/login${nextParam}`} onClick={() => setOpen(false)} className="sg-btn sg-btn-secondary mt-2">
                Sign in
              </Link>
              <Link to="/register" onClick={() => setOpen(false)} className="sg-btn sg-btn-primary">
                Create an account
              </Link>
            </>
          )}
        </nav>
      </div>

      <span
        data-progress
        aria-hidden="true"
        className="absolute inset-x-0 bottom-[-1px] block h-0.5 origin-left scale-x-0 bg-brand"
      />
    </header>
  );
}
