import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/**
 * Wraps children with a scroll-triggered entrance animation.
 *
 * Props:
 *  - direction: "up" | "down" | "left" | "right" | "none"
 *  - delay: seconds before animation starts
 *  - duration: animation duration in seconds
 *  - distance: how far the element slides (px)
 *  - once: animate only the first time (default true)
 *  - className: extra classes on the wrapper
 */
export default function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.7,
  distance = 40,
  once = true,
  className = "",
  ...props
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: "-60px" });

  const dirMap = {
    up:    { x: 0, y: distance },
    down:  { x: 0, y: -distance },
    left:  { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none:  { x: 0, y: 0 },
  };

  const offset = dirMap[direction] || dirMap.up;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: offset.x, y: offset.y }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
