import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../Component/ProductCard";
import PageTransition from "../Component/PageTransition";

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

const allProducts = [
  { id: "essential-gold-hoops", name: "Essential Gold Hoops", category: "Earrings", price: 28.0, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhKMjTssYsyDEABKdOzWRKCt4iorKglA6zhts71dMoLwmwbtCYdAzvzrkMmxzK5t3tYqgJWw8spSV0epcRFRlkx2c-rUZp2LDn3Z-ntio2etWX-7yOXncovqMUpx13k4sBrs0HaFM-U0sDERiLCIMbOgCxUNR17W3wkc6rGyaozMEq2Qdik8tqAfWxKlJfU5NENncwSE1TM1L7grYRUoM4V-z4FsOdfhss6-Lhzbstp-cnpnkR3CEP" },
  { id: "petite-pearl-strand", name: "Petite Pearl Strand", category: "Necklaces", price: 42.0, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCGHFnbtdFVyPNtoVNE71YeilwQU1cmwuJOvz4_XHrycZhLsH2l_P5YbUvV3bNhzw0NpaZZddUufWgHFWiF9jU43UzQZbNrb-GOPMSsNxD6YILKrACzzWwd0cKdvFn6KzG-ZEDYTXZDXbheksFOtA7r7tBdqhsEiuBgAcgSQX3WeXu4BJjnLTd5VEJeBYnFKYEdSLyph_ryppa5DFZQWEhFnZsXxA792ut9a7t465Hj1NRodTliiDzi" },
  { id: "orbit-band-ring", name: "Orbit Band Ring", category: "Rings", price: 35.0, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA_bwUl3MoP7NGYQo1ID4-huR1Jhta-zZ-19-dxqzU_cIbX7UpmV5TEFp9RkAH1RlakWxmddOB0BpC_llmWB7eizfar08PiVlghGi6DqPRur8YZ2p4RAMn164Den09hJHI2G9Z9bBtdYjuiOhEWofSiHTMJS0a9cHL6biHz2tJUJSmX8e_lVTr6_8V4izfPWMEVHpzzXK34nh4F1M5MivSdBgaVnABCafE1T1Tbejs5bTzFcf7hyX8e" },
  { id: "rose-minimalist-watch", name: "Rose Minimalist Watch", category: "Watches", price: 145.0, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBu4h8IBTPRc89xp0G0cZ1wdI4ToUwceLlfOiDRuttgRJzWLGHbKCx_Ad-pvK95BtYdd8aDuI7Q9QOQWk-D7ywVrQwSUxMWT_ZCKW8lddANNGM_guB-1tu1u_AkePJhH1OyIRG3Pj0i3va_4zh7tf1IBhZKRhFSrMw6OgBrXS04CwgQd6pvsrMvPY-crpZp-c7XV33QZWbGq5tbOKjPMrLVGXRIdO2qM2s1ha7niZupdhhYYx4LRnkh" },
  { id: "midnight-wispy-lashes", name: "Midnight Wispy Lashes", category: "Lashes", price: 18.0, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBslu0EmM3luCxMXkoL6Cb_rWUay7kbHy5Fq-mN0YMN4V8vcI6E6wUCPKTW56AlwsKuXORlqmLcXg0-GD58Z2xHuXzQy6CZsKYcnWGH2TUSCx3TtUwfPYxqYl9vwshLoJRirnAxucBtUBGJ4DH_62_ztzr9ngjp5cCKn3fKsGCjddSKngAE31upg9ZGCCLTBzX_5h0ymU66ZtJYnmH8gJ2Y1hyp0RPwBj4-AWoq9R8q0e_flNnc0TlG" },
  { id: "blush-matte-press-ons", name: "Blush Matte Press-Ons", category: "Nails", price: 22.0, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC5n29ZEOz8Z4jCwIC_qxjgj8HZIBVJ4tzFAEFD_oCX51nLFjtysvTlm0WPGKqmnejz2m1GOBgrAXs1Bw53GP1UK4xTYYU_PD43_kBnTnPVDn-PY4NGRvg9IYeBvU8I_elJRJyYKep3mBL3lHq9E0E9i3oCrXaiLCD0ttthdEkSi7rr3s9JMvSjE74o7G_8KwKaEsn3xpYpyWUU7U0hMX9WHNY7M2juznCpRpWBM3NyAxhxhtFSrDQ6" },
  { id: "gold-bracelet-stack", name: "Gold Bracelet Stack", category: "Bracelets", price: 85.0, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHYpEhVHrYvxZiEr2ODwhY0X0pMvzVk0PIDCfSiaYDSSMDr1_Jnfru9Yy82AXEYOq1wWL_A36ZLHO9XwlnrGTz1dm_rW7wghNXDAhqpeWnePmZjTU5vMNFi0-5wQPFwFcb4PsdHzAyqXQLQPGgTjOBbfghNEQ3xZsLinMJ4EFdQF5Ix2RQmZMdbpT3Itncb3b5wkZ7KjiNJXaUkvEHX3Yg8PXXoK_PNUFFaG0zjETPU7ve-X33Vmhb" },
  { id: "rose-locket-necklace", name: "Rose Locket Necklace", category: "Necklaces", price: 45.0, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDfHnVtInlfrlcZXtD2qjGkVybha3AZ433X3V4K5u7XlqdwC5y-ec8yd6JfAdjepSTYYMmAgQw6W6EjLGz8FFDpgWBPayqY-U3DujO7HxtT5wiwwXCqx0PBmH4PUf_2Sb_bfIZ2hlSKPArWOM8OySIHkV3ppcVeetk1qHURQxycrSHrSZvjQlymkEqMGeTEMWqK9lDLuYLrWLDexNs0lS_5TnvU6odUFvvzT-FzF5JAHhalk7uoJOr6" },
  { id: "pearl-harmony-bracelet", name: "Pearl Harmony Bracelet", category: "Bracelets", price: 65.0, image: "https://lh3.googleusercontent.com/aida/AP1WRLtcBM7WfOvB2ZtwOPL2fZ2M66TJ9IumAMTH1LHuQfqdE3WMtUwy-NFA9-yXnW3fEgr1TJI9-0RDtw_CDP7RjSX__2aS1HzUj4WKsbcF-8GwuUWF024gqz5kCTUwM9cuvYjJ30XxlkyGkDrmYFJ62Ahicn5o-doFQN6JfQPK2NletjOpjfAC0AAEktfgaGOZ6d4q1h4OvKEnsThghoa7bZT5rREG2hGHblDebc2pM_Y_lVupMGbLXBGsvxM" },
  { id: "aelia-rose-gold-watch", name: "Aelia Rose Gold Watch", category: "Watches", price: 185.0, image: "https://lh3.googleusercontent.com/aida/AP1WRLsmjMNAByrJjLiaL1-vxH4KSAuf4YqtcWagA3RgBl3fcqWau9UikUeVVtEvYMfI9USbLuFywVET998Cx1jCv_3jKAZfaODmV3IgV89O_eDqIlTVMlbabjV0sKLxEFYstm4smcZzu6-1pTrT3eREEm4X4UjSe5jxyQLFq2Jpqsg8JhyWuU8YmTvd0wgnC05NKb4twLIgRz3_w58FvyV-ihxE3O-chAtIZ16GiCv0ChjOcM4eSP5JNrP8m4k" },
  { id: "luxe-gold-hoops", name: "Luxe Gold Hoops", category: "Earrings", price: 32.0, image: "https://lh3.googleusercontent.com/aida/AP1WRLtefGEtp6QJqWeNdyjfyZkhx640QuPt8RBkJ_HBD4Gs6PdrYJzwE9QFbmHL7W6pcOHKasf62fGbzDgCsBR41HWwy0JVuyRBzclCYF6MLA0btjrs9z_vGuT-iF-2OXVUZodHvgwfaDTfhzuExcQ24_QulrjDC4b6WaikexHsIRkgarBqNc8J7Z2TLbnLsvX20jb3_Bewgme8o4nokCMo3v4r23XeSeUdLFv_bJzu6wK_2YZ-d16j-BmKHu8" },
  { id: "nude-minimalist-nails", name: "Nude Minimalist Nails", category: "Nails", price: 24.0, image: "https://lh3.googleusercontent.com/aida/AP1WRLu-yU61lXPxFMZZjgSoy3iPJtKsDzoMk-6HGH3iWtESa6Ypn0bH3ysDp0eO2BUKzvyaU0v96XT3xy8K-TbGX4WI4TFvlhMYQft69yAN8PHJjoySbVEcpUn6OS7tHACyHPfbh2QJe_jgWYEPnCTeVkLXkksgLLKrgwNiEbi0CgWlGD1V_SSJmFAopZluFQtiLE0gwb0ix3kITCS34jpMss-amp7t7Z1EP0wlBbkUW-yqJln6EXhO6kZ9dt0" },
  { id: "golden-pearl-stack", name: "Golden Pearl Stack", category: "Bracelets", price: 95.0, image: "https://lh3.googleusercontent.com/aida/AP1WRLtcBM7WfOvB2ZtwOPL2fZ2M66TJ9IumAMTH1LHuQfqdE3WMtUwy-NFA9-yXnW3fEgr1TJI9-0RDtw_CDP7RjSX__2aS1HzUj4WKsbcF-8GwuUWF024gqz5kCTUwM9cuvYjJ30XxlkyGkDrmYFJ62Ahicn5o-doFQN6JfQPK2NletjOpjfAC0AAEktfgaGOZ6d4q1h4OvKEnsThghoa7bZT5rREG2hGHblDebc2pM_Y_lVupMGbLXBGsvxM" },
  { id: "classic-silk-watch", name: "Classic Silk Watch", category: "Watches", price: 160.0, image: "https://lh3.googleusercontent.com/aida/AP1WRLsmjMNAByrJjLiaL1-vxH4KSAuf4YqtcWagA3RgBl3fcqWau9UikUeVVtEvYMfI9USbLuFywVET998Cx1jCv_3jKAZfaODmV3IgV89O_eDqIlTVMlbabjV0sKLxEFYstm4smcZzu6-1pTrT3eREEm4X4UjSe5jxyQLFq2Jpqsg8JhyWuU8YmTvd0wgnC05NKb4twLIgRz3_w58FvyV-ihxE3O-chAtIZ16GiCv0ChjOcM4eSP5JNrP8m4k" },
  { id: "morning-light-hoops", name: "Morning Light Hoops", category: "Earrings", price: 38.0, image: "https://lh3.googleusercontent.com/aida/AP1WRLtefGEtp6QJqWeNdyjfyZkhx640QuPt8RBkJ_HBD4Gs6PdrYJzwE9QFbmHL7W6pcOHKasf62fGbzDgCsBR41HWwy0JVuyRBzclCYF6MLA0btjrs9z_vGuT-iF-2OXVUZodHvgwfaDTfhzuExcQ24_QulrjDC4b6WaikexHsIRkgarBqNc8J7Z2TLbnLsvX20jb3_Bewgme8o4nokCMo3v4r23XeSeUdLFv_bJzu6wK_2YZ-d16j-BmKHu8" },
  { id: "luxury-press-on-set", name: "Luxury Press-On Set", category: "Nails", price: 28.0, image: "https://lh3.googleusercontent.com/aida/AP1WRLu-yU61lXPxFMZZjgSoy3iPJtKsDzoMk-6HGH3iWtESa6Ypn0bH3ysDp0eO2BUKzvyaU0v96XT3xy8K-TbGX4WI4TFvlhMYQft69yAN8PHJjoySbVEcpUn6OS7tHACyHPfbh2QJe_jgWYEPnCTeVkLXkksgLLKrgwNiEbi0CgWlGD1V_SSJmFAopZluFQtiLE0gwb0ix3kITCS34jpMss-amp7t7Z1EP0wlBbkUW-yqJln6EXhO6kZ9dt0" },
];

const ITEMS_PER_PAGE = 8;

export default function Collections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("cat") || "All Collections";
  const [currentPage, setCurrentPage] = useState(1);
  const [priceFilter, setPriceFilter] = useState("");
  const [sortBy, setSortBy] = useState("featured");

  const setCategory = (cat) => {
    if (cat === "All Collections") {
      setSearchParams({});
    } else {
      setSearchParams({ cat });
    }
    setCurrentPage(1);
  };

  // Filter by category
  let filtered = [...allProducts];
  if (activeCategory !== "All Collections" && activeCategory !== "Bestsellers") {
    filtered = filtered.filter((p) => p.category === activeCategory);
  }

  // Filter by price
  if (priceFilter) {
    filtered = filtered.filter((p) => {
      if (priceFilter === "under50") return p.price < 50;
      if (priceFilter === "50to100") return p.price >= 50 && p.price <= 100;
      if (priceFilter === "100to200") return p.price > 100 && p.price <= 200;
      if (priceFilter === "over200") return p.price > 200;
      return true;
    });
  }

  // Sort
  if (sortBy === "price-asc") filtered.sort((a, b) => a.price - b.price);
  else if (sortBy === "price-desc") filtered.sort((a, b) => b.price - a.price);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, priceFilter, sortBy]);

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
              Showing {filtered.length} Product{filtered.length !== 1 ? "s" : ""}
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
        {paginated.length === 0 ? (
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

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="mt-24 mb-16 flex justify-center items-center gap-4">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-label-md transition-colors ${
                  safePage === pageNum
                    ? "bg-primary text-white"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {totalPages > 5 && (
            <>
              <span className="w-10 h-10 flex items-center justify-center text-sm text-on-surface-variant">...</span>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-label-md transition-colors ${
                  safePage === totalPages
                    ? "bg-primary text-white"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </div>
      )}
    </main>
    </PageTransition>
  );
}
