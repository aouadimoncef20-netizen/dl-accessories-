/**
 * A slow ticker of short brand lines, sitting between the hero and the shop.
 *
 * The track is the *same list twice* and the keyframes slide it by exactly
 * half its width, so the moment it snaps back the eye is looking at an
 * identical frame — the loop has no seam. The second copy is hidden from
 * screen readers so the words are announced once.
 *
 * Motion: `prefers-reduced-motion` stops the animation in CSS (index.css),
 * which leaves the first copy in place, still readable.
 */
export default function Marquee({ items = [], duration = 38, className = "" }) {
  if (!items.length) return null;

  return (
    <div
      className={`marquee relative overflow-hidden border-y border-outline-variant/50 bg-surface-container-low/70 py-4 ${className}`}
    >
      <div className="marquee-track" style={{ animationDuration: `${duration}s` }}>
        {[0, 1].map((copy) =>
          items.map((item, i) => (
            <span
              key={`${copy}-${i}`}
              aria-hidden={copy === 1 || undefined}
              className="flex shrink-0 items-center px-6 font-label-sm uppercase tracking-[0.3em] text-on-surface-variant"
            >
              {item}
              <span aria-hidden="true" className="ms-6 text-primary/45">
                ✦
              </span>
            </span>
          ))
        )}
      </div>

      {/* The edges fade into the page instead of being cut off by a hard line. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-0 w-16 bg-gradient-to-r from-surface-container-low to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 end-0 w-16 bg-gradient-to-l from-surface-container-low to-transparent"
      />
    </div>
  );
}
