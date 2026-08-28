import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import useCartStore from "../stores/cartStore";
import useWishlistStore from "../stores/wishlistStore";
import useThemeStore from "../stores/themeStore";
import useLanguageStore from "../stores/languageStore";
import useTranslation from "../i18n/useTranslation";
import MobileMenu from "./MobileMenu";

function Navbar() {
  const itemCount = useCartStore((s) => s.itemCount());
  const wishlistItems = useWishlistStore((s) => s.items);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const { mode, toggle } = useThemeStore();
  const { lang, toggle: toggleLang } = useLanguageStore();
  const { t } = useTranslation();
  const isDark = mode === "dark";

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  return (
    <>
      <motion.nav
        className="fixed top-0 w-full z-50 transition-all duration-500"
        animate={{
          backgroundColor: scrolled
            ? isDark
              ? "hsla(20, 10%, 10%, 0.95)"
              : "hsla(20, 40%, 98%, 0.95)"
            : "transparent",
        }}
        style={{
          boxShadow: scrolled
            ? "0 4px 30px -10px hsla(var(--primary), 0.12)"
            : "none",
        }}
      >
        <div className="flex items-center justify-between py-4 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <Link to="/" className="shrink-0 flex items-center">
            <img
              src="/logo%20dl%20accessories.jpg"
              alt="DL Accessories"
              className={`h-8 md:h-10 w-auto object-contain transition-all duration-500 ${
                scrolled ? "" : "drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]"
              }`}
            />
          </Link>

          <ul className="hidden md:flex items-center gap-8">
            <li>
              <NavLink
                to="/collections"
                end
                className={({ isActive }) =>
                  [
                    "relative uppercase tracking-widest font-label-md transition-colors duration-300",
                    isActive
                      ? "text-primary after:absolute after:bottom-[-2px] after:left-0 after:w-full after:h-px after:bg-primary/30"
                      : scrolled
                        ? "text-on-surface-variant hover:text-primary"
                        : "text-white/80 hover:text-white",
                  ].join(" ")
                }
              >
                {t("nav_collections")}
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
                scrolled
                  ? "border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary"
                  : "border-white/30 text-white/80 hover:text-white hover:border-white"
              }`}
            >
              {lang === "fr" ? "AR" : "FR"}
            </button>

            {/* Dark mode toggle */}
            <button
              type="button"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggle}
              className={`transition-colors duration-300 ${
                scrolled
                  ? "text-on-surface-variant hover:text-primary"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-2xl">
                {isDark ? "light_mode" : "dark_mode"}
              </span>
            </button>

            <Link
              to="/favorites"
              aria-label="Favorites"
              className={`relative transition-colors duration-300 ${
                scrolled
                  ? "text-on-surface-variant hover:text-primary"
                  : "text-white/80 hover:text-white"
              }`}
            >
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

            <Link
              to="/cart"
              aria-label="Shopping bag"
              className={`relative transition-colors duration-300 ${
                scrolled
                  ? "text-on-surface-variant hover:text-primary"
                  : "text-white/80 hover:text-white"
              }`}
            >
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
              className={`md:hidden transition-colors duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                scrolled
                  ? "text-on-surface-variant hover:text-primary"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </motion.nav>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

export default Navbar;
