import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Thin progress bar at the top of the viewport showing scroll position.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] origin-left bg-primary"
    />
  );
}
