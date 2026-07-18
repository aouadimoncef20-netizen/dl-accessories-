/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "media", // Changed to media for automatic dark mode based on system preference
  theme: {
    extend: {
      colors: {
        "primary": "#D4AF37", // Refined Gold
        "secondary": "#2C2C2C", // Deep Charcoal
        "accent": "#8B4513", // Rich Brown
        "background-light": "#FAF9F6", // Ivory
        "background-dark": "#1A1A1A", // Deep Black
        "text-light": "#2C2C2C", // Charcoal Text
        "text-dark": "#FAF9F6", // Ivory Text
        "card-light": "#FFFFFF", // Pure White
        "card-dark": "#2A2A2A", // Dark Gray
        "border-light": "#E8E8E8", // Light Gray
        "border-dark": "#404040", // Medium Gray
        "luxury-gold": "#D4AF37",
        "luxury-brown": "#8B4513",
        "luxury-cream": "#FAF9F6",
        "luxury-charcoal": "#2C2C2C",
      },
      fontFamily: {
        "display": ["Playfair Display", "serif"],
        "sans": ["Inter", "sans-serif"],
        "luxury": ["Playfair Display", "serif"],
      },
      fontSize: {
        "luxury-sm": ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.025em" }],
        "luxury-base": ["1rem", { lineHeight: "1.5rem", letterSpacing: "0.025em" }],
        "luxury-lg": ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "0.025em" }],
        "luxury-xl": ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "0.025em" }],
        "luxury-2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "0.025em" }],
        "luxury-3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "0.025em" }],
        "luxury-4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "0.025em" }],
        "luxury-5xl": ["3rem", { lineHeight: "1", letterSpacing: "0.025em" }],
      },
      spacing: {
        "luxury-xs": "0.5rem",
        "luxury-sm": "0.75rem",
        "luxury-md": "1rem",
        "luxury-lg": "1.5rem",
        "luxury-xl": "2rem",
        "luxury-2xl": "3rem",
        "luxury-3xl": "4rem",
      },
      borderRadius: {
        "luxury": "0.5rem",
        "luxury-lg": "0.75rem",
        "luxury-xl": "1rem",
      },
      boxShadow: {
        "luxury": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "luxury-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "luxury-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },
      // Added brand-specific animations for luxury feel
      animation: {
        "luxury-fade-in": "fadeIn 0.6s ease-in-out",
        "luxury-slide-up": "slideUp 0.8s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}

