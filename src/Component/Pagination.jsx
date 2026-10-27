/**
 * The page control shared by the shop and the admin.
 *
 * A catalogue of a few hundred products has dozens of pages. Drawing one
 * button per page turns this into a wall of numbers — and a two-row strip on
 * a phone. This keeps a fixed-size window around the current page and folds
 * the rest into an ellipsis, so the control is the same width at 5 pages as
 * it is at 500.
 */

const ELLIPSIS = "…";

/**
 * The page numbers to draw, with `"…"` where pages were folded away.
 * Exported so the admin can reuse the same windowing if it needs to.
 */
export function pageItems(current, pageCount) {
  if (pageCount <= 1) return [];

  // Small catalogues: every page fits, so show every page.
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const keep = new Set([1, pageCount, current - 1, current, current + 1]);

  // Near either end there is room for a couple more before the ellipsis, so
  // the window looks deliberate rather than lopsided.
  if (current <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (current >= pageCount - 2) {
    [pageCount - 1, pageCount - 2, pageCount - 3].forEach((n) => keep.add(n));
  }

  const pages = [...keep]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);

  const items = [];
  let previous = 0;
  for (const page of pages) {
    if (previous && page - previous > 1) items.push(ELLIPSIS);
    items.push(page);
    previous = page;
  }
  return items;
}

const ARROW =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10";

function Pagination({ page, pageCount, onChange, className = "", label = "Pagination" }) {
  if (pageCount <= 1) return null;

  const items = pageItems(page, pageCount);

  return (
    <nav
      aria-label={label}
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={ARROW}
      >
        <span className="material-symbols-outlined text-lg rtl:rotate-180" aria-hidden="true">
          chevron_left
        </span>
      </button>

      {items.map((item, idx) =>
        item === ELLIPSIS ? (
          <span
            key={`gap-${idx}`}
            aria-hidden="true"
            className="grid h-9 w-6 place-items-center text-sm text-outline-variant sm:h-10"
          >
            {ELLIPSIS}
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={`Page ${item}`}
            className={`h-9 min-w-9 px-1 rounded-full font-label-md text-sm transition-colors sm:h-10 sm:min-w-10 ${
              item === page
                ? "bg-primary text-on-primary"
                : "border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
        className={ARROW}
      >
        <span className="material-symbols-outlined text-lg rtl:rotate-180" aria-hidden="true">
          chevron_right
        </span>
      </button>
    </nav>
  );
}

export default Pagination;
