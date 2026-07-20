// =============================================
// DL Accessories — Local Image Assets Index
// Import this file for all local images
// =============================================

// Hero
import heroBg from "../assets/hero-bg.jfif";

// Category Cards
import catWatch from "../assets/cat-watch.jfif";
import catBracelet from "../assets/cat-bracelet.jfif";
import catRings from "../assets/cat-rings.jfif";
import catEarrings from "../assets/cat-earrings.jfif";
import catSets from "../assets/cat-sets.jfif";
import catNails from "../assets/cat-nails.jfif";
// Lashes category uses CDN (no local asset)

// Best Sellers (3 products × 2 views each = hover swap)
import best1a from "../assets/best-1a.jpg";
import best2a from "../assets/best-2a.jpg";
import best3a from "../assets/best-3a.jpg";


// Mood Board
import mood1 from "../assets/mood-1.jfif";
import mood2 from "../assets/mood-2.jfif";
import mood3 from "../assets/mood-3.jfif";
import mood4 from "../assets/mood-4.jfif";
import mood5 from "../assets/mood-5.jfif";

// Reviews
import review1 from "../assets/review-1.jfif";
import review2 from "../assets/review-2.jfif";
// Review 3 uses CDN

export const images = {
  hero: heroBg,

  categories: {
    Watches: catWatch,
    Bracelets: catBracelet,
    Rings: catRings,
    Earrings: catEarrings,
    Sets: catSets,
    Nails: catNails,
  },

  bestSellers: [
    { front: best1a},
    { front: best2a},
    { front: best3a},
  ],

  moodBoard: [mood1, mood2, mood3, mood4, mood5],

  reviews: [review1, review2],
};
