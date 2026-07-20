# DL Accessories — Details Make You Shine

Luxury accessories e-commerce website built with React + Tailwind CSS.

## Tech Stack

- **React 19** — UI framework
- **React Router 6** — Client-side routing
- **Tailwind CSS 3** — Styling with custom design tokens
- **Context API** — State management (cart, wishlist)

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, categories, new arrivals, best sellers, mood board, reviews, Instagram grid, newsletter |
| `/collections` | Collections | Filterable product grid with category/price/sort, pagination |
| `/product/:id` | Product Details | 5 distinct layouts (Watch, Bracelet, Ring, Nails, Lashes) |
| `/cart` | Shopping Bag | Cart items, gift wrapping, order summary, complementary items |
| `/checkout` | Checkout | 3-step checkout (info → shipping → payment) with validation |
| `/order-confirmed` | Order Confirmation | Post-purchase confirmation with order number |
| `/gallery` | Gallery | Editorial masonry gallery with lightbox |
| `/contact` | Contact | Contact form, studio info, social links |
| `/favorites` | Favorites | Saved/liked products |
| `/search` | Search | Product search with filters |
| `/privacy` | Privacy Policy | Legal page |
| `/terms` | Terms of Service | Legal page |
| `/shipping` | Shipping & Returns | Shipping policy page |

## Quick Start

```bash
npm install
npm start        # Development server at localhost:3000
npm run build    # Production build → build/ folder
```

## Project Structure

```
src/
├── Component/     → Reusable UI (Navbar, Footer, ProductCard, etc.)
├── Context/       → CartContext, WishlistContext
├── Data/          → products.js
├── Layouts/       → MainLayout
├── Pages/         → All 15 page components
├── App.jsx        → Routes
└── index.js       → Entry point
```

## Customization

- **Colors**: Edit `tailwind.config.js` (primary: `#785560`)
- **Products**: Edit `src/Data/products.js`
- **Content**: Each page is in `src/Pages/`
- **Images**: Replace CDN URLs in `products.js` and pages

## Deployment

```bash
npm run build
# Then drag build/ folder to https://app.netlify.com/drop
```

---

Built with ❤️ for DL Accessories
