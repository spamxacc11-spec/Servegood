import { cn } from "@/lib/utils";

/**
 * The visual thread of the page: one circular dish, one shadow, one lighting
 * direction, reused by the hero, the story scene and the price lab.
 *
 * The photograph is a straight square crop shown through a circular mask. It is
 * never warped, tilted in perspective or re-angled, because a flat photo cannot
 * honestly do any of those. The only movement applied to it elsewhere is an
 * in-plane rotation, which is what turning a real round plate looks like.
 */
export function Plate({
  src,
  alt,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-square w-full", className)}>
      {/* Contact shadow. Sits under the dish, lit from above and slightly left. */}
      <div
        data-plate-shadow
        aria-hidden="true"
        className="absolute inset-x-[12%] bottom-[2%] h-[14%] rounded-[50%] blur-xl"
        style={{ background: "rgba(37, 48, 57, 0.32)" }}
      />
      <div data-plate-rotor className="absolute inset-0">
        <img
          data-plate-img
          src={src}
          alt={alt}
          width={900}
          height={900}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className="h-full w-full rounded-full object-cover"
          style={{ boxShadow: "0 24px 48px -28px rgba(20, 83, 45, 0.55)" }}
        />
      </div>
    </div>
  );
}

/**
 * The serving dome, drawn as the flat brand shape from the ServeGood mark rather
 * than a photographic cloche. A photoreal dome would need a real photograph at
 * the dish's exact angle, which does not exist here, and faking one would show.
 *
 * Its resting style is hidden. Only the hero timeline brings it in, so if the
 * motion never runs the dish is simply uncovered.
 */
export function Dome({ className }: { className?: string }) {
  return (
    <svg
      data-dome
      viewBox="0 0 200 150"
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ opacity: 0 }}
    >
      <ellipse cx="100" cy="128" rx="88" ry="9" fill="var(--color-brand-strong)" opacity="0.18" />
      <path d="M22 122a78 78 0 0 1 156 0Z" fill="var(--color-brand)" />
      <path
        d="M52 122a48 48 0 0 1 60-46 78 78 0 0 0-60 46Z"
        fill="#ffffff"
        opacity="0.16"
      />
      <rect x="8" y="118" width="184" height="13" rx="6.5" fill="var(--color-brand-strong)" />
      <rect x="96" y="30" width="8" height="18" rx="4" fill="var(--color-brand-strong)" />
      <circle cx="100" cy="27" r="9" fill="var(--color-brand-strong)" />
    </svg>
  );
}

/**
 * Three soft wisps. Played once by the hero timeline after the dome clears, then
 * gone: a loop would be ambient motion that needs its own pause control, and it
 * would compete with the headline for the rest of the visit.
 */
export function Steam({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-x-0 bottom-[38%] top-0", className)}
    >
      {[38, 50, 62].map((left, i) => (
        <span
          key={left}
          data-steam
          className="absolute bottom-0 block h-24 w-7 rounded-full blur-md"
          style={{
            left: `${left}%`,
            opacity: 0,
            background:
              "linear-gradient(to top, rgba(255,255,255,0.7), rgba(255,255,255,0))",
            transform: `translateY(0) scaleY(${0.85 + i * 0.12})`,
          }}
        />
      ))}
    </div>
  );
}
