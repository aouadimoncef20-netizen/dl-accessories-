import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import Navbar from "../Component/Navbar";
import Footer from "../Component/Footer";
import BackToTop from "../Component/BackToTop";
import ScrollProgress from "../Component/ScrollProgress";

function MainLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    // `html { scroll-behavior: smooth }` applies to programmatic scrolls too,
    // so a plain scrollTo(0, 0) glides from the bottom of the old page to the
    // top of the new one. "instant" opts this one call out of the CSS rule:
    // the next page simply starts at its top, and smooth scrolling stays on
    // for anchors and the back-to-top button.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Keyboard visitors land here first: one Tab, one Enter, past the nav. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[10000] focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:font-label-md focus:uppercase focus:tracking-widest focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-grow focus:outline-none">
        <AnimatePresence mode="wait">
          <Outlet key={pathname} />
        </AnimatePresence>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}

export default MainLayout;
