/**
 * The heading every editorial section on this site shares.
 *
 * Keeping it in one place is what stops the home page from drifting into five
 * slightly different headings: the eyebrow, its hairline, the type scale and
 * the way the "shop all" link sits on the opposite edge are decided once.
 *
 *   <SectionHeader
 *     eyebrow={t("cat_label")}
 *     title={t("cat_title")}
 *     action={<Link to="/collections">View all</Link>}
 *     actions={<ScrollArrows onScroll={handleScroll} />}
 *   />
 */
export default function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  actions,
  align = "left",
  className = "",
}) {
  const centered = align === "center";
  const hasTrailing = Boolean(action || actions);

  return (
    <div
      className={[
        centered
          ? "flex flex-col items-center text-center"
          : "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        className,
      ].join(" ")}
    >
      <div className={centered ? "max-w-2xl" : "max-w-xl"}>
        {eyebrow && (
          <span
            className={`mb-3 flex items-center gap-3 font-label-sm uppercase tracking-[0.25em] text-primary ${
              centered ? "justify-center" : ""
            }`}
          >
            <span aria-hidden="true" className="h-px w-8 bg-primary/45" />
            {eyebrow}
            {centered && <span aria-hidden="true" className="h-px w-8 bg-primary/45" />}
          </span>
        )}

        {title && (
          <h2 className="text-balance font-display-lg text-display-lg-mobile text-on-surface md:text-headline-md">
            {title}
          </h2>
        )}

        {description && (
          <p
            className={`mt-3 text-pretty font-body-md text-secondary ${
              centered ? "mx-auto max-w-md" : "max-w-lg"
            }`}
          >
            {description}
          </p>
        )}
      </div>

      {hasTrailing && (
        <div
          className={`items-center gap-4 ${
            centered
              ? "flex justify-center"
              : // The trailing edge is a desktop arrangement. Every section that
                // uses it repeats the same call to action below the shelf on
                // phones, so on a narrow screen this container would be an empty
                // row followed by a dead 24px gap.
                "hidden shrink-0 md:flex"
          }`}
        >
          {action}
          {actions}
        </div>
      )}
    </div>
  );
}
