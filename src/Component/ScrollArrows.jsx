/**
 * The pair of round arrows that drive a horizontal shelf.
 *
 * It is hidden on touch screens: a phone already knows how to swipe, and two
 * buttons that small next to a swipeable row only take up the width the
 * products need.
 */
export default function ScrollArrows({ onScroll, className = "" }) {
  const button =
    "group grid h-10 w-10 place-items-center rounded-full border border-outline/25 text-on-surface-variant transition-all duration-300 hover:border-primary/40 hover:bg-surface-container-low hover:text-primary";

  return (
    <div className={`hidden gap-2 md:flex ${className}`}>
      <button
        type="button"
        onClick={() => onScroll("left")}
        aria-label="Scroll left"
        className={button}
      >
        <span className="material-symbols-outlined text-lg transition-transform duration-300 group-hover:-translate-x-0.5 rtl:rotate-180">
          chevron_left
        </span>
      </button>
      <button
        type="button"
        onClick={() => onScroll("right")}
        aria-label="Scroll right"
        className={button}
      >
        <span className="material-symbols-outlined text-lg transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180">
          chevron_right
        </span>
      </button>
    </div>
  );
}
