import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../Component/ProductCard";
import PageTransition from "../Component/PageTransition";
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

// Map category names to their category_id for filtering
const CATEGORY_MAP = {
  "Bracelets": 1,
  "Earrings": 2,
  "Lashes": 3,
  "Rings": 4,
  "Necklaces": 5,
  "Watches": 6,
};

const ITEMS_PER_PAGE = 8;

export default function Collections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("cat") || "All Collections";
  const [currentPage, setCurrentPage] = useState(1);
  const [priceFilter, setPriceFilter] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const { products, fetchProducts, loading } = useProductStore();

  useEffect(() => {
    const categoryId = CATEGORY_MAP[activeCategory] || undefined;

    fetchProducts({
      category: categoryId,
      isBestseller: activeCategory === "Bestsellers" ? true : undefined,
      sortBy: sortBy !== "featured" ? sortBy : undefined,
      page: currentPage,
      perPage: ITEMS_PER_PAGE,
    });
  }, [activeCategory, priceFilter, sortBy, currentPage, fetchProducts]);

  const setCategory = (cat) => {
    if (cat === "All Collections") {
      setSearchParams({});
    } else {
      setSearchParams({ cat });
    }
    setCurrentPage(1);
  };

  const paginated = products;

  return (
    <PageTransition>
      <main>
        {/* HEADER */}
        <section className="pt-[140px] pb-12 px-margin-mobile md:px-margin-desktop bg-surface-container-low">
          <div className="max-w-container-max mx-auto text-center">
            <p className="font-label-md text-primary uppercase tracking-[0.2em] mb-4">
              Curated Pieces
            </p>
            <h1 className="font-display-lg text-display-lg mb-6">Our Collections</h1>
            <p className="font-body-lg text-body-lg text-secondary max-w-2xl mx-auto">
              Discover our signature edits — from timeless jewellery to precision-cut
              press-ons, each piece is selected for its craftsmanship, beauty, and the
              quiet confidence it brings to every moment.
            </p>
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

        {/* FILTER & SORT BAR */}
        <div className="sticky top-20 z-40 bg-surface/95 backdrop-blur-md py-6 border-b border-outline-variant mb-12">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="rounded-full bg-white border border-outline-variant px-6 py-2.5 text-sm text-on-surface appearance-none cursor-pointer pr-10"
              >
                <option value="">All Prices</option>
                <option value="under50">Under $50</option>
                <option value="50to100">$50 – $100</option>
                <option value="100to200">$100 – $200</option>
                <option value="over200">$200+</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-on-surface-variant">
                Showing {products.length} Product{products.length !== 1 ? "s" : ""}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-full bg-white border border-outline-variant px-6 py-2.5 text-sm text-on-surface appearance-none cursor-pointer pr-10"
              >
                <option value="featured">Sort by: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
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
              {paginated.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  category={product.category}
                  price={product.price}
                  image={product.image}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
