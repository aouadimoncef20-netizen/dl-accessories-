import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import ProductCard from "../Component/ProductCard";
import Pagination from "../Component/Pagination";
import PageTransition from "../Component/PageTransition";
import SEO from "../Component/SEO";
import ScrollReveal from "../Component/ScrollReveal";
import useProductStore from "../stores/productStore";
import useTranslation from "../i18n/useTranslation";

// Every category the admin can file a product under (see CATEGORY_OPTIONS in
// ProductManager) has to be reachable here, or a product added in, say, Bags
// can only be found by scrolling "All".
const categoryFilters = [
  "All",
  "Promo",
  "Packs",
  "Best Sellers",
  "Watches",
  "Jewelry",
  "Bracelets",
  "Rings",
  "Earrings",
  "Necklaces",
  "Nails",
  "Lashes",
  "Bags",
  "Sunglasses",
  "Scarves",
  "Belts",
  "Wallets",
  "Accessories",
];

/**
 * The chips above the grid are two different questions wearing the same
 * clothes: most of them narrow by category, a few cut across every category
 * (on promotion, sold as a pack, best sellers). This decides which is which so
 * the query below doesn't have to guess from the label.
 *
 * The lookup is case-insensitive because the same filter also arrives from
 * links — `/collections?cat=packs`, the category tiles' lower-case URLs — and
 * those must not fall through to an impossible `category = "packs"` query.
 */
const SPECIAL_FILTERS = {
  promo: { onSale: true },
  packs: { isPack: true },
  "best sellers": { isBestseller: true },
};

function filterQuery(active) {
  const key = String(active || "").trim().toLowerCase();
  if (!key || key === "all") return {};
  return SPECIAL_FILTERS[key] || { category: key };
}

const ITEMS_PER_PAGE = 12;

const CHIP =
  "shrink-0 whitespace-nowrap rounded-full border px-4 py-2.5 font-label-sm uppercase tracking-[0.14em] transition-colors duration-200";

export default function Collections() {
  const [searchParams, setSearchParams] = useSearchParams();
  // `?cat=watches` (the category cards link in lower case) and `?cat=Watches`
  // are the same filter, so both the chip and the query read from one key.
  const activeCategory = searchParams.get("cat") || "All";
  const activeKey = activeCategory.toLowerCase();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { products, fetchProducts, loading } = useProductStore();
  const { t } = useTranslation();
  const heroRef = useRef(null);
  const reduced = useReducedMotion();

  // The photograph behind the title drifts more slowly than the page, the same
  // way it does on the home hero, so the two pages feel like one site.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  useEffect(() => {
    // A slow answer for the previous chip must not overwrite the count for
    // the chip on screen now.
    let cancelled = false;
    const filters = filterQuery(activeCategory);

    fetchProducts({
      ...filters,
      page: currentPage,
      perPage: ITEMS_PER_PAGE,
    }).then((result) => {
      if (cancelled) return;
      if (result && typeof result.count === "number") {
        setTotalCount(result.count);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeCategory, currentPage, fetchProducts]);

  const setCategory = (cat) => {
    if (cat.toLowerCase() === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ cat });
    }
    setCurrentPage(1);
  };

  // Paging used to throw the visitor back to the very top, hero included, so
  // the next page of products arrived off-screen. This lands on the first row.
  const goToPage = (page) => {
    setCurrentPage(page);
    document
      .getElementById("collection-grid")
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  const paginated = products;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const countLabel =
    totalCount > 0
      ? t("collections_showing")
          .replace(
            "{range}",
            `${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
              currentPage * ITEMS_PER_PAGE,
              totalCount
            )}`
          )
          .replace("{total}", totalCount)
      : t("collections_total").replace("{n}", products.length);

  return (
    <PageTransition>
      <main>
        <SEO
          title={activeKey === "all" ? "Collections" : activeCategory}
          description={`Browse our curated collection of ${activeKey === "all" ? "accessories" : activeCategory.toLowerCase()} — watches, jewelry, nails, and lashes.`}
        />

        {/* ── HERO ── the photograph comes up to meet the title rather than
            sitting above it the way a banner would. */}
        <section
          ref={heroRef}
          className="relative flex min-h-[52svh] items-end overflow-hidden md:min-h-[58svh]"
        >
          <motion.div
            className="absolute inset-0"
            style={reduced ? undefined : { y: heroY, scale: heroScale }}
          >
            <img
              src="/images/collection%20hero%20pic.jfif"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="ken-burns h-full w-full object-cover"
            />
          </motion.div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-transparent" />
          <div className="grain absolute inset-0" />

          <div className="relative z-10 mx-auto w-full max-w-container-max px-margin-mobile pb-10 pt-32 md:px-margin-desktop md:pb-16">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mb-5 flex items-center gap-3 font-label-sm uppercase tracking-[0.28em] text-white/75"
            >
              <span aria-hidden="true" className="h-px w-10 bg-white/45" />
              {t("collections_hero_label")}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-balance font-display-lg text-[36px] leading-[1.04] tracking-[-0.02em] text-white sm:text-[46px] lg:text-[58px]"
            >
              {t("collections_hero_title")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-xl text-pretty font-body-lg text-body-lg leading-relaxed text-white/80"
            >
              {t("collections_hero_desc")}
            </motion.p>
          </div>
        </section>

        {/* ── FILTERS ── one rail. On a phone it slides sideways inside its own
            row instead of stacking into three lines of chips that push the
            products off the screen. */}
        <nav
          aria-label={t("collections_filter_label")}
          className="border-b border-outline-variant/60 bg-surface"
        >
          <div className="relative mx-auto max-w-container-max">
            <div className="hide-scrollbar flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-margin-mobile py-4 md:flex-wrap md:justify-center md:gap-3 md:px-margin-desktop">
              {categoryFilters.map((cat) => {
                const active = cat.toLowerCase() === activeKey;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    aria-pressed={active}
                    className={`${CHIP} ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-outline-variant/70 text-on-surface-variant hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* The rail fades at the edge it continues past, so a phone shows
                there is more to swipe to instead of looking like a dead row. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 end-0 w-12 bg-gradient-to-l from-surface to-transparent md:hidden"
            />
          </div>
        </nav>

        {/* ── RESULT LINE ── what is on screen, ruled off from what is next */}
        <div className="mx-auto flex max-w-container-max items-center gap-5 px-margin-mobile py-6 md:px-margin-desktop">
          <p className="shrink-0 font-label-sm uppercase tracking-[0.18em] text-on-surface-variant">
            {loading ? " " : countLabel}
          </p>
          <span aria-hidden="true" className="h-px flex-1 bg-outline-variant/60" />
        </div>

        {/* ── PRODUCT GRID ── */}
        <section
          id="collection-grid"
          className="mx-auto max-w-container-max scroll-mt-24 px-margin-mobile md:px-margin-desktop"
        >
          {loading ? (
            <div className="grid grid-cols-1 gap-x-gutter gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="mb-6 aspect-[4/5] rounded-xl bg-surface-container-low" />
                  <div className="mb-2 h-3 w-2/3 rounded bg-surface-container-low" />
                  <div className="h-3 w-1/3 rounded bg-surface-container-low" />
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center md:py-28">
              <span className="material-symbols-outlined text-4xl text-outline">search_off</span>
              <h2 className="mt-6 font-display-lg text-2xl text-on-surface md:text-headline-md">
                {t("collections_empty_title")}
              </h2>
              <p className="mt-3 max-w-sm text-pretty font-body-md text-secondary">
                {t("collections_empty_desc")}
              </p>
              <button
                type="button"
                onClick={() => setCategory("All")}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-3.5 font-label-sm uppercase tracking-widest text-on-primary-fixed transition-opacity duration-300 hover:opacity-90"
              >
                {t("collections_empty_cta")}
                <span className="material-symbols-outlined text-base rtl:rotate-180">arrow_forward</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-gutter gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {paginated.map((product, idx) => (
                <ScrollReveal key={product.id} delay={idx * 0.06} direction="up" distance={24}>
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    category={product.category}
                    price={product.price}
                    salePrice={product.sale_price}
                    isPack={product.is_pack}
                    image={product.image}
                  />
                </ScrollReveal>
              ))}
            </div>
          )}
        </section>

        {/* ── PAGINATION ── A catalogue this size has dozens of pages, so the
            control shows a window around the current one instead of every
            page number. */}
        {totalPages > 1 && (
          <div className="mx-auto mt-14 max-w-container-max px-margin-mobile pb-4 md:px-margin-desktop">
            <Pagination
              page={currentPage}
              pageCount={totalPages}
              onChange={goToPage}
              label="Product pages"
            />
          </div>
        )}
      </main>
    </PageTransition>
  );
}
