import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from "framer-motion";

/**
 * A way back to the top that also says where you are.
 *
 * The ring around the button is the same value as the top progress bar, so a
 * reader who has forgotten how long the page is can see it close before they
 * reach for the arrow. It only appears once the reader is genuinely deep in a
 * page, so it never floats over the hero.
 */
function BackToTop() {
  const [visible, setVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const reduced = useReducedMotion();
  const spring = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const pathLength = reduced ? scrollYProgress : spring;

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toTop = () => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "instant" : "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={toTop}
          aria-label="Back to top"
          className="group fixed bottom-6 left-6 z-50 grid h-12 w-12 place-items-center rounded-full border border-outline-variant/70 bg-surface/90 text-primary shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors duration-300 hover:border-primary/50 hover:text-primary-fixed-dim"
        >
          {/* progress ring */}
          <svg
            viewBox="0 0 48 48"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
          >
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              strokeWidth="1.5"
              className="stroke-outline-variant/50"
            />
            <motion.circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ pathLength }}
              className="stroke-primary"
            />
          </svg>

          <span className="material-symbols-outlined relative text-[20px] transition-transform duration-300 group-hover:-translate-y-0.5">
            arrow_upward
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default BackToTop;
