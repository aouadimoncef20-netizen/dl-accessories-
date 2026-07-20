// Shared Framer Motion variants — minimal and elegant

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

export const cardHover = {
  rest: { y: 0, boxShadow: "0 0 0 0 rgba(246, 200, 213, 0)" },
  hover: {
    y: -4,
    boxShadow: "0 10px 40px -10px rgba(246, 200, 213, 0.3)",
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export const buttonTap = { scale: 0.97 };
export const buttonHover = { scale: 1.02 };

export const imageZoom = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};
