import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ProductCard from "../Component/ProductCard";
import Pagination from "../Component/Pagination";
import useProductStore from "../stores/productStore";

// Same page size as the collections grid, so the shop moves at one rhythm.
const PER_PAGE = 12;

function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [input, setInput] = useState(query);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { products, fetchProducts, loading } = useProductStore();

  // A new search starts at page one. Adjusting during render (rather than in
  // an effect) means the fetch below never runs once for the old page.
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setPage(1);
  }

  useEffect(() => {
    if (!query.trim()) {
      setTotal(0);
      return;
    }

    let cancelled = false;
    fetchProducts({ search: query, page, perPage: PER_PAGE }).then((result) => {
      if (cancelled) return;
      if (result && typeof result.count === "number") setTotal(result.count);
    });

    return () => {
      cancelled = true;
    };
  }, [query, page, fetchProducts]);

  useEffect(() => {
    setInput(query);
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      setPage(1);
      setSearchParams({ q: input.trim() });
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="mb-12">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-6">Search</h1>
        <form onSubmit={handleSubmit} className="max-w-xl">
          <div className="flex items-center border-b-2 border-primary pb-2">
            <span className="material-symbols-outlined text-primary mr-3">search</span>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Search for accessories..."
              className="w-full min-w-0 bg-transparent text-lg font-body-md text-on-surface placeholder:text-on-surface-variant/50 outline-none py-2" autoFocus />
            <button type="submit" className="shrink-0 px-4 py-2 sm:px-6 bg-primary text-on-primary rounded-full font-label-sm uppercase tracking-widest hover:opacity-90 transition-opacity">Search</button>
          </div>
        </form>
      </div>

      {query && (
        <p className="font-body-md text-secondary mb-8">
          {total === 0 && !loading
            ? `No results found for "${query}".`
            : `Showing ${products.length} of ${total} result${total !== 1 ? "s" : ""} for "${query}".`}
        </p>
      )}

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-gutter gap-y-12">
          {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-[4/5] bg-surface-container-low rounded-xl" />)}
        </div>
      ) : query && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-gutter gap-y-12">
          {products.map((p) => (
            <ProductCard key={p.id} id={p.id} name={p.name} category={p.category} price={p.price} salePrice={p.sale_price} isPack={p.is_pack} image={p.images?.[0] || p.image} />
          ))}
        </div>
      ) : null}

      {!loading && query && pageCount > 1 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={setPage}
          label="Search result pages"
          className="mt-14"
        />
      )}

      {!query && (
        <div className="text-center py-24">
          <p className="font-headline-sm text-on-surface-variant mb-6">Search across our entire collection of accessories.</p>
          <div className="flex flex-wrap justify-center gap-3 max-w-lg mx-auto">
            {["Watches", "Rings", "Bracelets", "Earrings", "Nails", "Lashes", "Necklaces"].map((term) => (
              <Link key={term} to={`/collections?cat=${term}`}
                className="px-5 py-2 bg-primary-container/20 text-on-primary-container rounded-full font-label-sm hover:bg-primary-container/40 transition-colors">{term}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchResults;
