import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import useCartStore from "../stores/cartStore";
import useWishlistStore from "../stores/wishlistStore";
import useThemeStore from "../stores/themeStore";
import useLanguageStore from "../stores/languageStore";
import useTranslation from "../i18n/useTranslation";
import useScrollDirection from "../Hooks/useScrollDirection";
import MobileMenu from "./MobileMenu";

function Navbar() {
  const itemCount = useCartStore((s) => s.itemCount());
  const wishlistItems = useWishlistStore((s) => s.items);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hidden, atTop } = useScrollDirection();
  const { mode, toggle } = useThemeStore();
  const { lang, toggle: toggleLang } = useLanguageStore();
  const nextLang = { en: "FR", fr: "AR", ar: "EN" };
  const { t } = useTranslation();
  const isDark = mode === "dark";
  const reduced = useReducedMotion();
  const { pathname } = useLocation();

  // Only these pages open with a full-bleed photograph under the bar. On every
  // other route the first thing on screen is the page's own light surface, so
  // the bar must be solid from the first pixel — white type on cream is not a
  // design choice, it is invisible text.
  const opensWithAPhoto = pathname === "/" || pathname === "/collections";

  // While the bar floats over that photograph it is glass on top of an image;
  // once the page moves it becomes a solid plate. `solid` drives colour,
  // height and shadow together, so the three can never disagree.
  const solid = !opensWithAPhoto || !atTop;
  // Reading down hides the bar; scrolling up brings it back. An open mobile
  // menu always pins it, or the close button would slide away with it.
  const tucked = hidden && !mobileOpen && !reduced;

  // Close mobile menu when viewport is desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // The menu is a sheet over the page; the page behind it must not scroll.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const iconTone = solid
    ? "text-on-surface-variant hover:text-primary"
    : "text-white/85 hover:text-white";

  return (
    <>
      <motion.nav
        className="fixed inset-x-0 top-0 z-50"
        initial={false}
        animate={{ y: tucked ? "-105%" : "0%" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* A soft scrim under the transparent bar, so white type stays legible
            whatever the photograph behind it happens to be. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 via-black/15 to-transparent transition-opacity duration-500 ${
            solid ? "opacity-0" : "opacity-100"
          }`}
        />

        <div
          className={`relative transition-colors duration-500 ${
            solid
              ? "bg-surface/85 backdrop-blur-xl border-b border-outline-variant/60 shadow-[0_12px_40px_-28px_rgba(0,0,0,0.5)]"
              : "border-b border-transparent"
          }`}
        >
          <div
            className={`flex items-center justify-between max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop transition-[padding] duration-500 ${
              solid ? "py-2.5" : "py-5"
            }`}
          >
            <Link to="/" className="shrink-0 flex items-center" aria-label="DL Accessories — home">
              <img
                src="/logo%20dl%20accessories.jpg"
                alt="DL Accessories"
                className={`w-auto object-contain transition-all duration-500 ${
                  solid ? "h-8 md:h-9" : "h-9 md:h-11"
                } ${solid ? "" : "drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]"}`}
              />
            </Link>

            <ul className="hidden md:flex items-center gap-8">
              <li>
                <NavLink
                  to="/collections"
                  end
                  className={({ isActive }) =>
                    [
                      "group relative uppercase tracking-widest font-label-md transition-colors duration-300",
                      isActive ? "text-primary" : solid ? "text-on-surface-variant hover:text-primary" : "text-white/85 hover:text-white",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      {t("nav_collections")}
                      {/* The rule under the link draws itself on hover and
                          stays drawn while the route is open. */}
                      <span
                        aria-hidden="true"
                        className={`absolute -bottom-1.5 left-0 h-px w-full origin-left bg-current transition-transform duration-300 ${
                          isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              </li>
            </ul>

            <div className="flex items-center gap-3 md:gap-5">
              {/* Language toggle */}
              <button
                type="button"
                aria-label="Toggle language"
                onClick={(e) => { e.stopPropagation(); toggleLang(); setMobileOpen(false); }}
                className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-all duration-300 z-50 ${
                  solid
                    ? "border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary"
                    : "border-white/30 text-white/85 hover:text-white hover:border-white"
                }`}
              >
                {nextLang[lang]}
              </button>

              {/* Dark mode toggle */}
              <button
                type="button"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                onClick={toggle}
                className={`transition-colors duration-300 ${iconTone}`}
              >
                <span className="material-symbols-outlined text-2xl">
                  {isDark ? "light_mode" : "dark_mode"}
                </span>
              </button>

              <Link to="/favorites" aria-label="Favorites" className={`relative transition-colors duration-300 ${iconTone}`}>
                <span className="material-symbols-outlined text-2xl">favorite</span>
                {wishlistItems.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-primary text-[10px] font-semibold text-white leading-none"
                  >
                    {wishlistItems.length}
                  </motion.span>
                )}
              </Link>

              <Link to="/cart" aria-label="Shopping bag" className={`relative transition-colors duration-300 ${iconTone}`}>
                <span className="material-symbols-outlined text-2xl">shopping_bag</span>
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="absolute -top-1 -right-1 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-primary text-[10px] font-semibold text-white leading-none"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Link>

              <button
                type="button"
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                onClick={(e) => { e.stopPropagation(); setMobileOpen((prev) => !prev); }}
                className={`md:hidden transition-colors duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center ${iconTone}`}
              >
                <span className="material-symbols-outlined text-2xl">
                  {mobileOpen ? "close" : "menu"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <MobileMenu key={lang} isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

export default Navbar;
