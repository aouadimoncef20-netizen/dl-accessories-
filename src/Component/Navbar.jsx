import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import useCartStore from "../stores/cartStore";
import useWishlistStore from "../stores/wishlistStore";
import MobileMenu from "./MobileMenu";

const navLinks = [
  // { label: "Collections", to: "/collections" },
  // { label: "Watches", to: "/watches" },
  // { label: "Jewelry", to: "/jewelry" },
  // { label: "Lashes", to: "/lashes" },
];

function Navbar() {
  const itemCount = useCartStore((s) => s.itemCount());
  const wishlistItems = useWishlistStore((s) => s.items);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-sm shadow-primary/5">
        <div className="flex items-center justify-between py-4 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <Link to="/" className="font-display-lg text-primary shrink-0">
            DL Accessories
          </Link>

          <ul className="hidden md:flex items-center gap-8">
            {navLinks.map(({ label, to }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    [
                      "relative uppercase tracking-widest font-label-md transition-colors duration-300",
                      isActive
                        ? "text-primary after:absolute after:bottom-[-2px] after:left-0 after:w-full after:h-px after:bg-primary/30"
                        : "text-on-surface-variant hover:text-primary",
                    ].join(" ")
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4 md:gap-5">
            <button
              type="button"
              aria-label="Search"
              onClick={() => navigate("/search")}
              className="text-on-surface-variant hover:text-primary transition-colors duration-300"
            >
              <span className="material-symbols-outlined text-2xl">search</span>
            </button>

            <Link
              to="/favorites"
              aria-label="Favorites"
              className="relative text-on-surface-variant hover:text-primary transition-colors duration-300"
            >
              <span className="material-symbols-outlined text-2xl">favorite</span>
              {wishlistItems.length > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-primary text-[10px] font-semibold text-white leading-none">
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              aria-label="Shopping bag"
              className="relative text-on-surface-variant hover:text-primary transition-colors duration-300"
            >
              <span className="material-symbols-outlined text-2xl">shopping_bag</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-primary text-[10px] font-semibold text-white leading-none">
                  {itemCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden text-on-surface-variant hover:text-primary transition-colors duration-300"
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </nav>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

export default Navbar;
