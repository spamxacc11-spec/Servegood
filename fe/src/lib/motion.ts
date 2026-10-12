import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/**
 * One shared timing vocabulary. Scenes reference these rather than inventing
 * their own numbers, so the whole page moves at a recognisable speed.
 */
export const DUR = {
  press: 0.14,
  hover: 0.2,
  panel: 0.3,
  enter: 0.55,
  scene: 0.8,
} as const;

export const EASE = {
  /** Interactions and entrances. Front-loaded, so it reads as responsive. */
  out: "power3.out",
  /** Food and plate movement. Eases at both ends, like something being set down. */
  soft: "power2.inOut",
  /** Anything mapped directly to scroll progress. */
  linear: "none",
} as const;

export const STAGGER = 0.06;

/** Conditions every scene is built against. */
const QUERIES = {
  motion: "(prefers-reduced-motion: no-preference)",
  desktop: "(min-width: 1024px)",
  tall: "(min-height: 640px)",
};

export type SceneConditions = {
  motion: boolean;
  desktop: boolean;
  tall: boolean;
};

/**
 * Builds a scene's motion inside a `gsap.matchMedia` scoped to `ref`.
 *
 * matchMedia does three jobs here that a bare effect would not: it scopes every
 * selector string to this component, it re-runs the build when the breakpoint or
 * the motion preference changes, and `revert()` removes every tween, ScrollTrigger
 * and inline style it created. That is what keeps StrictMode's double mount and a
 * desktop/mobile resize from leaving duplicate triggers behind.
 *
 * `build` must be defined at module scope so its identity is stable.
 */
export function useSceneMotion(
  ref: RefObject<HTMLElement | null>,
  build: (scope: HTMLElement, conditions: SceneConditions) => void,
) {
  useLayoutEffect(() => {
    const scope = ref.current;
    if (!scope) return;

    let mm = gsap.matchMedia(scope);
    let created: ScrollTrigger[] = [];

    // Record exactly which ScrollTriggers this build added, by diffing the
    // registry around it. Killing that list is a precise teardown: it never
    // touches a trigger another component owns, and unlike a scope test it
    // still catches the ones whose trigger element is the document itself.
    const attach = () => {
      const before = new Set(ScrollTrigger.getAll());
      mm.add(QUERIES, (ctx) => {
        build(scope, ctx.conditions as SceneConditions);
      });
      created = ScrollTrigger.getAll().filter((t) => !before.has(t));
    };

    const teardown = () => {
      created.forEach((t) => t.kill(true));
      created = [];
      mm.revert();
    };

    attach();

    // Rebuild whenever a breakpoint or the motion preference flips, so resizing
    // a desktop window down to phone width cannot leave desktop-only tweens
    // driving elements that the mobile layout expects to be plainly visible.
    const lists = Object.values(QUERIES).map((query) => window.matchMedia(query));
    const rebuild = () => {
      teardown();
      mm = gsap.matchMedia(scope);
      attach();
      ScrollTrigger.refresh();
    };
    lists.forEach((list) => list.addEventListener("change", rebuild));

    return () => {
      lists.forEach((list) => list.removeEventListener("change", rebuild));
      teardown();
    };
  }, [ref, build]);
}

/**
 * Entrance reveals for supporting content. Three related shapes rather than one
 * fade-up on everything: `up` for text blocks, `pop` for cards and badges,
 * `line` for the masked heading lines.
 *
 * These are `from` tweens, so the resting state is the visible one. If the
 * bundle never loads, nothing is left at opacity 0.
 */
export function reveal(scope: HTMLElement) {
  const shapes = {
    up: { y: 18, opacity: 0 },
    pop: { scale: 0.96, opacity: 0, transformOrigin: "50% 60%" },
    line: { yPercent: 105 },
  } as const;

  (Object.keys(shapes) as (keyof typeof shapes)[]).forEach((kind) => {
    const nodes = gsap.utils.toArray<HTMLElement>(`[data-reveal="${kind}"]`, scope);
    if (!nodes.length) return;

    // Group by nearest revealing ancestor so a list staggers together rather
    // than every item firing its own trigger.
    const groups = new Map<HTMLElement, HTMLElement[]>();
    nodes.forEach((node) => {
      const key = (node.closest("[data-reveal-group]") as HTMLElement | null) ?? node;
      const bucket = groups.get(key);
      if (bucket) bucket.push(node);
      else groups.set(key, [node]);
    });

    groups.forEach((items, trigger) => {
      gsap.from(items, {
        ...shapes[kind],
        duration: kind === "line" ? DUR.scene : DUR.enter,
        ease: EASE.out,
        stagger: STAGGER,
        scrollTrigger: { trigger, start: "top 85%", once: true },
      });
    });
  });
}

/** Ready-made build for sections that only need entrance reveals. */
export const revealOnly = (scope: HTMLElement, { motion }: SceneConditions) => {
  if (motion) reveal(scope);
};
