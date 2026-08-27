import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import ProductCard from "../Component/ProductCard";
import PageTransition from "../Component/PageTransition";
import SEO from "../Component/SEO";
import ScrollReveal from "../Component/ScrollReveal";
import useProductStore from "../stores/productStore";

const categoryFilters = [
  "All Collections",
  "Watches",
  "Bracelets",
  "Rings",
  "Earrings",
  "Necklaces",
  "Nails",
  "Lashes",
  "Bestsellers",
];

const ITEMS_PER_PAGE = 8;

export default function Collections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("cat") || "All Collections";
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { products, fetchProducts, loading } = useProductStore();

  useEffect(() => {
    const categoryName = activeCategory === "All Collections" ? undefined : activeCategory;

    fetchProducts({
      category: categoryName,
      isBestseller: activeCategory === "Bestsellers" ? true : undefined,
      page: currentPage,
      perPage: ITEMS_PER_PAGE,
    }).then((result) => {
      if (result && typeof result.count === "number") {
        setTotalCount(result.count);
      }
    });
  }, [activeCategory, currentPage, fetchProducts]);

  const setCategory = (cat) => {
    if (cat === "All Collections") {
      setSearchParams({});
    } else {
      setSearchParams({ cat });
    }
    setCurrentPage(1);
  };

  const paginated = products;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  return (
    <PageTransition>
      <main>
        <SEO
          title={activeCategory === "All Collections" ? "Collections" : activeCategory}
          description={`Browse our curated collection of ${activeCategory === "All Collections" ? "accessories" : activeCategory.toLowerCase()} — watches, jewelry, nails, and lashes.`}
        />

        {/* HERO SECTION WITH IMAGE */}
        <section className="relative pt-[120px] pb-16 px-margin-mobile md:px-margin-desktop overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="/images/collection%20hero%20pic.jfif"
              alt="Collections"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
          <div className="relative z-10 max-w-container-max mx-auto text-center">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-label-md text-white/80 uppercase tracking-[0.2em] mb-4"
            >
              Curated Pieces
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="font-display-lg text-display-lg mb-6 text-white"
            >
              Our Collections
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="font-body-lg text-body-lg text-white/80 max-w-2xl mx-auto"
            >
              Discover our signature edits — from timeless jewellery to precision-cut
              press-ons, each piece is selected for its craftsmanship, beauty, and the
              quiet confidence it brings to every moment.
            </motion.p>
          </div>
        </section>

        {/* CATEGORY FILTER BAR */}
        <nav className="bg-surface border-b border-outline-variant px-margin-mobile md:px-margin-desktop py-6">
          <div className="max-w-container-max mx-auto flex flex-wrap justify-center gap-8">
            {categoryFilters.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-sm uppercase tracking-widest transition-colors duration-200 ${
                  activeCategory === cat
                    ? "text-primary border-b border-primary pb-1 font-label-md"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>

        {/* PRODUCT COUNT */}
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6">
          <span className="text-sm text-on-surface-variant">
            {totalCount > 0
              ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of ${totalCount} Product${totalCount !== 1 ? "s" : ""}`
              : `${products.length} Product${products.length !== 1 ? "s" : ""}`
            }
          </span>
        </div>

        {/* PRODUCT GRID */}
        <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-gutter gap-y-12">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-surface-container-low rounded-xl animate-pulse" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-24">
              <span className="material-symbols-outlined text-5xl text-outline mb-4">search_off</span>
              <p className="font-headline-sm text-on-surface-variant">No products found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-gutter gap-y-12">
              {paginated.map((product, idx) => (
                <ScrollReveal key={product.id} delay={idx * 0.08} direction="up" distance={30}>
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    category={product.category}
                    price={product.price}
                    image={product.image}
                  />
                </ScrollReveal>
              ))}
            </div>
          )}
        </section>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-16 mb-8">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => { setCurrentPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`w-10 h-10 rounded-full font-label-md text-sm transition-colors ${
                  page === currentPage
                    ? "bg-primary text-on-primary"
                    : "border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => { setCurrentPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
