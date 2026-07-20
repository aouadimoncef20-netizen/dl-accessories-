import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ProductCard from "../Component/ProductCard";
import { collectionProducts } from "../Data/products";

function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [input, setInput] = useState(query);

  const allProducts = collectionProducts;

  const results = query
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      setSearchParams({ q: input.trim() });
    }
  };

  useEffect(() => {
    setInput(query);
  }, [query]);

  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="mb-12">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-6">
          Search
        </h1>
        <form onSubmit={handleSubmit} className="max-w-xl">
          <div className="flex items-center border-b-2 border-primary pb-2">
            <span className="material-symbols-outlined text-primary mr-3">search</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search for accessories..."
              className="w-full bg-transparent text-lg font-body-md text-on-surface placeholder:text-on-surface-variant/50 outline-none py-2"
              autoFocus
            />
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-on-primary rounded-full font-label-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {query && (
        <p className="font-body-md text-secondary mb-8">
          {results.length === 0
            ? `No results found for "${query}".`
            : `Showing ${results.length} result${results.length !== 1 ? "s" : ""} for "${query}".`}
        </p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-gutter gap-y-12">
          {results.map((p) => (
            <ProductCard key={p.id} id={p.id} name={p.name} category={p.category} price={p.price} image={p.image} />
          ))}
        </div>
      )}

      {!query && (
        <div className="text-center py-24">
          <p className="font-headline-sm text-on-surface-variant mb-6">
            Search across our entire collection of accessories.
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-w-lg mx-auto">
            {["Watches", "Rings", "Bracelets", "Earrings", "Nails", "Lashes", "Necklaces"].map(
              (term) => (
                <Link
                  key={term}
                  to={`/collections?cat=${term}`}
                  className="px-5 py-2 bg-primary-container/20 text-on-primary-container rounded-full font-label-sm hover:bg-primary-container/40 transition-colors"
                >
                  {term}
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchResults;
