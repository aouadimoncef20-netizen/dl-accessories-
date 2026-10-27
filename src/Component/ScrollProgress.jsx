import { motion, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";

/**
 * The reading line at the very top of the page.
 *
 * It is deliberately thin: a hairline that fills as you scroll, so the reader
 * can feel how far into a long page they are without it competing with the
 * navbar or the photographs. It fades in only once the page has actually
 * moved — at the top of a page a progress bar at 0% is noise.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduced = useReducedMotion();

  // A spring smooths the jitter of a mouse wheel into one continuous fill.
  // Someone who asked for reduced motion gets the raw value instead.
  const spring = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const scaleX = reduced ? scrollYProgress : spring;

  const opacity = useTransform(scrollYProgress, [0, 0.01], [0, 1]);

  return (
    <motion.div
      aria-hidden="true"
      style={{ opacity }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2px]"
    >
      <motion.div
        style={{ scaleX }}
        className="h-full origin-left bg-gradient-to-r from-primary/60 via-primary to-primary-fixed-dim shadow-[0_0_14px_hsl(var(--primary)/0.45)]"
      />
    </motion.div>
  );
}
