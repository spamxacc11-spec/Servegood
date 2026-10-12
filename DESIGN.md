# ServeGood - Design Reference

Landing page plus the full app (discovery, restaurant pages, and consumer, owner, reviewer and
admin dashboards) backed by the Spring Boot API in `backend/`. No live pricing and no ordering
integrations: prices are entered by people and labelled with when and by whom. The landing page
falls back to its clearly labelled sample listings only when the API cannot be reached.

App pages reuse the same tokens and utilities: `sg-btn*`, `sg-input`, `sg-label`, `sg-eyebrow`
(in `fe/src/index.css`) and the components in `fe/src/components/ui/primitives.tsx`. Dashboards
share one frame (`components/layout/DashboardLayout.tsx`): the landing header bar, a `surface`
sidebar, content on `canvas`.

> Motion lives in [MOTION.md](MOTION.md). This file owns the static system.

## Direction

Clean consumer product page, white-dominant, anchored by one deep green. The brand mark already
carries the whole story (dome, shield, checkmark, leaf), so the page does not re-illustrate it.
Distinctiveness comes from three things: real Indian food photography at a single crop ratio,
a price-comparison panel that shows arithmetic instead of claims, and a hygiene tier system that
reads by icon and word before it reads by colour.

Personality: friendly, plain-spoken, careful about what it claims.

The page is also a directed presentation. One dish is revealed under a dome, carried through the
review explanation, and finally priced three ways, so discovery, hygiene and cost read as one
story rather than three unrelated sections. The white-and-green identity, the type and the
component rules below are unchanged by that; motion gives them depth, it does not replace them.

Explicitly not: dark/cinematic, glassmorphism, gradient meshes, ambient decoration, scroll
hijacking, pinned storytelling, marquees, invented statistics.

## Tokens

Defined once in `fe/src/index.css` under Tailwind v4 `@theme`, consumed as utilities
(`bg-surface`, `text-ink`, `border-line`, ...). No raw hex in components.

### Colour

| Token | Value | Role |
|---|---|---|
| `canvas` | `#FFFFFF` | Page and card background |
| `surface` | `#F4F8F5` | Alternating section bands, quiet panels |
| `brand` | `#166534` | Primary actions, headings accent, verified state |
| `brand-strong` | `#14532D` | Primary hover / pressed |
| `brand-wash` | `#EAF3EC` | Verified badge and best-price row background |
| `ink` | `#253039` | Body and heading text |
| `muted` | `#5F6B63` | Metadata, helper text, captions |
| `line` | `#E2E8E3` | Card and section borders (decorative) |
| `control` | `#788F82` | Form control borders (needs 3:1, see below) |
| `caution` / `caution-wash` | `#B45309` / `#FEF6E7` | Standard Good tier |
| `alert` / `alert-wash` | `#B91C1C` / `#FEF0F0` | Needs Attention tier |

Orange lives only in the supplied logo raster. It is not used anywhere else in the interface.

Measured contrast (sRGB, WCAG 2.1):

```
ink / canvas        13.46   AA    muted / canvas      5.57   AA
ink / surface       12.55   AA    muted / surface     5.20   AA
brand / canvas       7.13   AA    canvas / brand      7.13   AA
brand / surface      6.65   AA    canvas / brand-strong  9.11   AA
brand / brand-wash   6.29   AA    caution / caution-wash 4.67  AA
caution / canvas     5.02   AA    alert / alert-wash     5.83  AA
alert / canvas       6.47   AA    control / canvas       3.47   AA (1.4.11)
```

`line` at 1.24 is decorative only and never carries meaning; every form control and focusable
boundary uses `control` instead.

### Type

Two families, both already loaded: **Plus Jakarta Sans** (headings, `font-display`) and
**Inter** (everything else). Weights limited to Jakarta 600/700/800 and Inter 400/500/600.

| Role | Size | Line height |
|---|---|---|
| h1 | `clamp(2.25rem, 1.35rem + 3.6vw, 3.5rem)` | 1.05 |
| h2 | `clamp(1.75rem, 1.3rem + 1.8vw, 2.5rem)` | 1.12 |
| h3 | 18-20px | 1.3 |
| body | 16px | 1.65 |
| metadata | 13-14px | 1.45 |

Paragraph measure capped at 62ch. Nothing below 13px. Nothing lighter than `muted`.

### Space and shape

- Container: 1200px max, 20px gutters, 24px from `sm`, 32px from `lg`.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.
- Section rhythm: 64px mobile, 96px desktop.
- Radius: 14px cards and panels, 10px inputs and buttons, full pill for status badges only.
- Elevation: borders first. One shadow token, tinted green-grey, used on the hero example card
  and the enquiry card only.

## Component rules

- **Cards** are used where records exist (restaurants, enquiry form). Everything else groups with
  hairlines, bands, or space. No card per paragraph.
- **Badges** are pills and only ever carry a hygiene tier or a "Sample" marker. Each tier pairs an
  icon with a word, so colour is never the only channel.
- **Buttons**: filled `brand` primary, `control`-bordered secondary. `:active` uses
  `scale(0.98)`, never `transition: all`. Minimum target 44px tall on touch.
- **Plate** (`components/Plate.tsx`): one circular dish, one shadow, one lighting direction,
  reused by the hero, the story scene and the price lab. The photograph is a straight square crop
  behind a circular mask, never warped or re-angled; the only movement applied to it is an
  in-plane rotation, which is what turning a real round plate looks like.
- **Listing carousel** (`components/ui/carousel-squeeze.tsx`): one open panel with the rest
  squeezed into slats. Panels, running sentence and button are all derived from the same
  `RESTAURANTS` record and the same `summarisePrices()` call as the cards below, so the two
  presentations cannot disagree. The button is a plain anchor to that listing's card.
- **Price panel**: one disclosure button per restaurant (`aria-expanded` / `aria-controls`),
  three platform rows over one named sample basket. Totals and the saving are derived in code
  from `items + fees + delivery`, so the arithmetic cannot drift from the copy.
- **Accordion and disclosure**: native `<button>` + `aria-expanded` + `aria-controls`, panel is a
  `role="region"` labelled by its trigger and is conditionally rendered, so open and close are
  discrete. No height animation: these are toggled often, and an animated layout property is the
  one thing that can leave the panel stuck shut if it never completes.
- **Focus**: 2px `brand` ring at 2px offset on every interactive element. Never removed.
- **Images**: single 4:3 crop, explicit `width`/`height`, `loading="lazy"` below the fold, hero
  image eager with `fetchpriority="high"`. Alt text describes the dish, not the brand.

## Motion rules

Full choreography, timings and lifecycle are in [MOTION.md](MOTION.md). The invariants that bind
the static system:

- Only `transform`, `opacity` and `stroke-dashoffset` animate. Never a layout property.
- Every hidden state lives in a GSAP `from` argument, never in CSS, so a failed bundle renders the
  finished page rather than a blank one.
- Every scene build returns early under `prefers-reduced-motion: reduce`, which leaves the full
  content in normal document flow.
- Nothing loops, nothing pins, nothing intercepts scroll, and no scroll handler touches React state.
- Three signature moments only: the hero dome lift, the sticky review scene, the price build.
  Everything else is a short entrance or a hover.

## Content honesty rules

These are design constraints, not copy suggestions.

- Every restaurant record carries a visible "Sample listing" marker.
- Price rows are headed "Sample prices, not live" and name the basket being compared.
- The tier section states that this is ServeGood's own proposed framework, not a government
  rating and not a health guarantee.
- The enquiry form states before submission that nothing is sent, and says so again on success.
- No "Order now" action exists, because no destination exists.
- No counts, ratings, inspection dates, reviewer names, partner logos, or testimonials appear
  anywhere, because none of them are real.

## References inspected

Websites:

1. <https://styles.refero.design/style/d91841cf-c717-43ef-97a2-400778fa6e1a> (sweetgreen DESIGN.md)
   Photography is treated as the hero, never as decoration, with one structural deep green
   anchoring an otherwise spare component set. Adopted the "photo carries the section, chrome
   stays quiet" split; rejected the cream canvas and the lime action colour.
2. <https://styles.refero.design/style/e9f5e976-53f7-42f5-a882-4e63b3c2f734> (Ease Health DESIGN.md)
   Flat, shadowless surfaces where depth comes from layered tinted panels and generous padding
   rather than elevation, with ~14px card radius and pills reserved for tags. Adopted the radius
   scale, the border-before-shadow rule, and the 1200px / 64-96px layout rhythm.
3. <https://www.awwwards.com/sites/proteinbolaget> (Awwwards nominee, Food & Drink, Sep 2026;
   surveyed from <https://www.awwwards.com/websites/food-drink/>)
   The award highlights are typography, header design, and content architecture: one large
   product photograph, a two-line headline, a single action, no ambient decoration. Adopted the
   asymmetric hero proportion and the discipline of one action per viewport.

Components:

4. <https://21st.dev/@kavikatiyar/components/performance-benchmark-card>
   Deps: `lucide-react`, `framer-motion`. One focal value above a ranked list of competitor rows
   with icon and value. Adapted that shape for the price panel; not imported, because the layout
   is ~30 lines and `framer-motion` would be a new dependency for a transition CSS already does.
5. <https://21st.dev/@originui/components/accordion>
   Deps: shadcn/ui plus `@radix-ui/react-accordion`. This is a plain Vite project with no shadcn
   registry, alias, or Radix install, so the WAI-ARIA structure was reimplemented by hand
   (trigger `aria-expanded` / `aria-controls`, panel `role="region"` + `aria-labelledby`) rather
   than pulling in the dependency chain.
6. <https://21st.dev/p/carousel-squeeze> (the SqueezeCarousel, the one component actually imported)
   Adapted rather than dropped in: the embedded Geist `@font-face` block was removed to keep the
   page on two families, the shadcn tokens were swapped for the ServeGood ones, the arrows went
   from 36px to 44px, and `--sq-hero` is now capped at `62cqi` with `--sq-room` floored at `0`
   and both gaps scaled to the container. Without that last change the open panel is wider than
   its container below roughly 430px and the whole tail is pushed out of view.
7. <https://21st.dev/community/components/s/comparison>
   Surveyed the comparison category. The pattern that reads fastest is a short labelled row list
   with the winning row promoted, not a full feature matrix. Applied to the three platform rows.
8. Skiper UI "Skiper19" via 21st.dev (`components/ui/svg-follow-scroll.tsx`, used by
   `components/LaunchArea.tsx`). Deps: `framer-motion`, added for this component. Kept the original
   path and its `pathLength` scroll mapping; replaced the demo copy with the Andheri, Mumbai launch
   area, the lime/navy palette with `brand` / `brand-strong`, `w-screen` with `w-full`, the 350vh
   section and 200vh translate with a normal-flow band, and draws the full line under reduced
   motion. Imported as `m` + `LazyMotion` to keep the bundle cost down.

Photography: Unsplash, downloaded and stored locally under `fe/src/assets/food/` at a single 4:3
crop so Vite fingerprints and serves them. Source photo IDs are recorded in
`fe/src/data/restaurants.ts`. The carousel reuses the same files at the same crop rather than
carrying a second set.

`cn` lives at `fe/src/lib/utils.ts` (clsx + tailwind-merge) and `@` is aliased to `fe/src` in
both `vite.config.ts` and `tsconfig.app.json`, so `components/ui` now matches the shadcn layout
that third-party components expect. This project still has no shadcn registry or Radix install;
anything pulled in from a registry has to be checked for those dependencies first.

Plate crops: `plate-thali.webp` (900px) and `plate-biryani` / `plate-dosa` / `plate-chole`
(700px), all produced with Pillow from the existing photographs in `fe/src/assets/food/` as
straight square crops centred on the dish, then encoded as WebP. No new photography was sourced
and nothing was generated.

Brand mark: `fe/src/assets/servegood-logo.png`, extracted unmodified from the supplied
`EdAssignment4-344.docx` (`word/media/image2.png`, 983x232) and downscaled to 374x88 for delivery.
Favicons in `fe/public/` are a square crop of the icon portion of that same raster, not a redraw.
