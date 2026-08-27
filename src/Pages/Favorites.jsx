import { Link } from "react-router-dom";
import useWishlistStore from "../stores/wishlistStore";
import ProductCard from "../Component/ProductCard";
import SEO from "../Component/SEO";

function Favorites() {
  const wishlist = useWishlistStore((s) => s.items);

  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEO title="Wishlist" description="Your saved favorites — pieces you love at a glance." />
      <div className="mb-12">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-2">Your Favorites</h1>
        <p className="text-on-surface-variant font-body-md">
          {wishlist.length === 0
            ? "You haven't saved any favorites yet."
            : `${wishlist.length} saved item${wishlist.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-24">
          <span className="material-symbols-outlined text-6xl text-outline mb-6">favorite</span>
          <p className="font-headline-sm text-on-surface-variant mb-6">Browse our collections and save your favorite pieces.</p>
          <Link to="/collections" className="inline-block px-10 py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity">Explore Collections</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-gutter gap-y-12">
          {wishlist.map((p) => (
            <ProductCard key={p.id} id={p.id} name={p.name} category={p.category} price={p.sale_price || p.price} image={p.images?.[0] || p.image} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;
