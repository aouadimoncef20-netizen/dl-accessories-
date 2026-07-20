import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import Navbar from "../Component/Navbar";
import Footer from "../Component/Footer";

function MainLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <Outlet key={pathname} />
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

export default MainLayout;
