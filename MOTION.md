# ServeGood - Motion Reference

Companion to [DESIGN.md](DESIGN.md). That file owns the static system; this one owns movement.

The page has three signature moments with quiet stretches between them. Everything else is a
short entrance or a hover. Nothing loops, nothing hijacks scroll, nothing is pinned.

## Shared rules

Defined once in `fe/src/lib/motion.ts` and imported by every scene.

| Token | Value | Used for |
|---|---|---|
| `DUR.press` | 140ms | Button press |
| `DUR.hover` | 200ms | Hover and small state changes |
| `DUR.panel` | 300ms | Menus, panels |
| `DUR.enter` | 550ms | Content entrances |
| `DUR.scene` | 800ms | Masked heading lines |
| `EASE.out` | `power3.out` | Interactions and entrances |
| `EASE.soft` | `power2.inOut` | Food and plate movement |
| `EASE.linear` | `none` | Anything mapped to scroll progress |
| `STAGGER` | 60ms | List and group staggers |

- Only `transform`, `opacity` and `stroke-dashoffset` are animated. No width, height, top or left.
- No `transition: all` anywhere; every CSS transition names its properties.
- Scroll position is read by ScrollTrigger only. There is no scroll listener and no React state
  updated from scroll or pointer movement, so scrolling never re-renders the tree.
- Hidden states live in GSAP `from` / `fromTo` arguments, never in CSS. If the bundle fails to
  load, every element renders in its finished, visible state.
- **Inside the two signature scenes, nothing that carries words or figures ever fades from zero.**
  Headings, checklist notes, totals, the lowest-price flag and the savings line only ever travel.
  Decorative layers (bars, dots, the dome, steam, the drawn shield) may fade or scale from nothing
  because they are `aria-hidden` and the same information is written out in text beside them. So a
  trigger that never runs costs a flourish, not the content. Ordinary section entrances keep the
  conventional fade-up, which only hides elements already below the viewport edge.

## Scene 1 - The food reveal (`components/Hero.tsx`)

**Trigger:** page load. **Total:** ~1.35s, plus a steam tail to ~3.0s.

| At | Element | Movement |
|---|---|---|
| 0.00 | Headline lines | `yPercent 105 → 0` inside an overflow mask, 750ms, 80ms stagger |
| 0.05 | Plate stage | `scale 0.96 → 1`, fade, 700ms |
| 0.18 | Lede | 14px rise, fade |
| 0.26 | Both CTAs | 12px rise, fade, 60ms stagger |
| 0.40 | Dome | `yPercent 0 → -128`, `scale → 1.05`, 850ms `power2.in`; opacity drops only in the last 300ms |
| 0.40 | Plate shadow | `scaleX 0.86 → 1.10`, `scaleY 0.78 → 1.04`, opacity `0.9 → 0.5` |
| 0.45 | Plate | settles from `rotate -7deg` and `scale 1.06` |
| 0.95 | Demo listing card | 18px rise, fade |
| 1.10 | Steam | three wisps, `yPercent 14 → -70`, fade in then out by 3.0s. Plays once |
| 1.30 | Scroll cue | 8px drop, fade |

The dome lifts rather than dissolving, and the shadow grows and lightens with it because an
object further from a surface casts a larger, softer shadow.

**Assets:** `plate-thali.webp` (square crop, circular mask). The dome is the flat brand shape
from the logo, drawn as inline SVG in `components/Plate.tsx`. There is no photographic cloche
asset and no honest way to fake one over a fixed-angle photograph, so the dome is deliberately
graphic rather than photoreal.

**Failsafe:** the headline and buttons start hidden, so a `setTimeout` at 2.6s jumps the timeline
to its end if it has not moved. A throttled tab or a stalled frame loop cannot leave the hero
blank.

**Mobile:** identical, stacked. **Reduced motion:** no timeline at all. The dome and steam rest at
`opacity: 0`, so the dish is simply uncovered and every word is in place on first paint.

## Scene 2 - Follow the meal (`components/FollowTheMeal.tsx`)

**Trigger:** scroll. **Anchoring:** CSS `position: sticky`, not a ScrollTrigger pin.

A pin was the obvious choice and the wrong one. Sticky produces the same anchored dish with no pin
spacer to duplicate, no layout for the pin to destabilise, no invented empty scroll, and correct
reversal and resizing for free. GSAP is then only reading progress and moving transforms.

**Cost:** the section is 1.89 viewport heights at 1440x900, so roughly 0.9 of a screen of extra
scroll. The brief's ceiling was 1.5 to 2.

| Range | Element | Movement |
|---|---|---|
| Whole section | Plate | `rotate 0 → 10deg`, `scale 1 → 0.94`, scrubbed |
| Whole section | Plate shadow | `scaleX → 0.92`, opacity `→ 0.38` |
| Whole section | Phase rail | `scaleX 0 → 1` |
| Phase 1 enters | Phase 1 items | 20px rise (travel only), 70ms stagger, once |
| Phase 2, 0.00-0.54 | Three callout dots | `scale 0 → 1`, each with a leader line `scaleX 0 → 1` and its note sliding 18px (travel only) |
| Phase 2, 0.62-1.00 | Shield then checkmark | `stroke-dashoffset` drawn from the measured path length, then the label fades in |

Phase 2 uses `scrub: true` rather than smoothed scrub: the dots and notes carry content, so they
track the reader's position exactly instead of easing toward it a frame behind.

**Mobile and short viewports:** the build returns early below `1024px` wide or `640px` tall.
Sticky is a `lg:` class, so the scene becomes the dish followed by two stacked blocks, with all
three callouts, all three notes and the shield in their finished state.

**Reduced motion:** same early return, same stacked result.

## Scene 3 - The price lab (`components/PriceLab.tsx`)

**Trigger:** first scroll into view, then every selection change.

Entry, once, in the order the sentence reads:

| At | Movement |
|---|---|
| 0.00 | Food segment of each bar, `scaleX 0 → 1` |
| 0.18 | Charges segment |
| 0.36 | Delivery segment |
| 0.42 | Totals rise 10px (travel only) |
| 0.72 | The "Lowest" flag pops from `scale 0.85` (no fade) |
| 0.84 | The savings sentence rises 12px (travel only) |

Each segment is a fixed-width element animated with `scaleX`, so the build never touches layout.

On selection change: previous tweens are killed, bars redraw in 400ms, the dish cross-fades, and
the three totals count to their new values in 500ms. A pale green disc sits behind the dish so a
swap never shows a hole.

**Numbers:** React renders the true figure; the count only decorates it. Every effect writes the
real value into the node before starting, which is what stops a fast run of selections leaving the
previous meal's total behind. There is no `aria-live`, so a screen reader reads the settled figure
rather than every frame.

**Reduced motion:** no entry build and no counting. Bars, totals, the lowest-price flag and the
savings line are all present on first paint, and the selector still works.

## Supporting motion

| Where | What |
|---|---|
| Header | Reading-progress line, `scaleX` against document scroll; a hairline shadow after 80px |
| Section entrances | `reveal()` in `lib/motion.ts`, three related shapes: `up` for text, `pop` for cards, `line` for masked headings. Grouped by `data-reveal-group` so a list fires once, not per item |
| Restaurant cards | 2px lift, border shift, and a 4% image scale inside a clipped box. Cancelled under `motion-reduce` |
| Launch area | One brand-green stroke whose drawn length follows scroll through the band (`pathLength 0.5 → 1`), via framer-motion `useScroll`. No pin, no React state. Reduced motion shows the finished line |
| Carousel | Unchanged from the existing `ui/carousel-squeeze.tsx`; it already owns its own width transition and nothing new was layered over it |
| Partnership form, FAQ | Heading reveal only. The fields and the accordion do not move |

## Lifecycle

`useSceneMotion(ref, build)` wraps every scene:

- `gsap.matchMedia` scoped to the component, so selector strings cannot reach another section.
- The build function lives at module scope, so its identity is stable and the effect needs no
  dependency suppression.
- Each build's ScrollTriggers are identified by diffing the registry around it and killed by that
  exact list on teardown. Nothing global is ever killed.
- Teardown runs on unmount and again whenever a breakpoint or the motion preference changes, so a
  window dragged from desktop to phone width cannot strand desktop-only tweens on elements the
  mobile layout expects to be plainly visible.

## References

- <https://oryzo.ai/> - observed live at 1280x800. 44,463px of scroll (55.6 viewports), one
  `position: fixed` full-viewport WebGL canvas carried across the whole page plus four local
  canvases, 15 sticky or fixed elements, native scrolling. The opening frame is a flat olive field
  with an orange vector outline of the product; by ~1600px that outline scales up while the real
  object fades in behind it, and by ~5200px the whole-page background has become near-black.
  Taken: one persistent food visual carried between scenes instead of a fresh entrance per
  section, and scene changes marked by a background shift. Rejected: 55 viewports of scroll, the
  WebGL layer and the dark palette. Not verified: anything past ~6500px or on mobile, because the
  canvas stopped painting in a throttled browser pane.
- <https://www.awwwards.com/lusion/> - verification of the award claim on Oryzo's own page.
  Lusion holds 1 Site of the Year, 3 Site of the Month, 14 Site of the Day and 20 Honourable
  Mentions.
- <https://styles.refero.design/style/1e7dae3b-cb34-4fcf-8c32-051152aebbab> (Foodnoms) - pure
  white canvas, one oversized visual anchor per screen, and a two-tone headline where the accent
  colour carries the key phrase. Adopted for the scene headings in brand green and charcoal.
- <https://21st.dev/@nayan_radadiya6/components/timeline-rail/timeline-rail-variants> and
  <https://21st.dev/community/components/s/timeline> - an `active` flag per item driving a filled
  rail. Reimplemented as the scrubbed phase rail rather than imported, since it is about twenty
  lines and the package is a shadcn-extras registry component.
