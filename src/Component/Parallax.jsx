import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Applies a parallax scroll effect to its child.
 *
 * Props:
 *  - speed: how fast the inner content scrolls relative to viewport (-1 to 1, default -0.3)
 *  - className: extra classes on the outer wrapper
 */
export default function Parallax({ children, speed = -0.3, className = "" }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [speed * 120, -speed * 120]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y }} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}
