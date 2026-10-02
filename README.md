# DL Accessories — Details Make You Shine

Jewellery and accessories storefront, plus the admin dashboard that runs it.

The shop reads its products, orders and photos from Supabase. There is no product
list in the code — everything the customer sees is whatever is in the database.

## Tech stack

| | |
| --- | --- |
| **React 19** | UI |
| **React Router 6** | Routing |
| **Tailwind CSS 3** | Styling, with brand tokens in `tailwind.config.js` |
| **Zustand** | State (cart, auth, products, wishlist, theme, language) |
| **framer-motion** | Page transitions and scroll animations |
| **Supabase** | Postgres, authentication and image storage |

## Getting started

```bash
npm install
cp .env.example .env      # then fill in your Supabase URL and anon key
npm start                 # http://localhost:3000
```

`.env` holds the Supabase project URL and public key. The public key is safe to
ship — it is in every page load anyway. Never put the **service-role** key there.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Development server |
| `npm run build` | Production build into `build/` |
| `npm run check:db` | Checks the live database: tables, columns, policies, admin access |
| `npm run check:site` | Opens the built site in a headless browser and walks the main flows |
| `npm run admin:password` | Changes the built-in admin password (updates its hash and the Supabase account) |
| `npm run supabase:sql <cmd>` | Runs the SQL files against the live project via the Supabase Management API |

## Routes

| Route | Page |
| --- | --- |
| `/` | Home — hero, categories, new arrivals, best sellers, mood board, reviews |
| `/collections` | Product grid with category, price and sort filters |
| `/product/:id` | Product details, with a layout per category |
| `/cart` | Shopping bag |
| `/checkout` | Checkout — details, delivery, confirmation |
| `/order-confirmed` | Order placed |
| `/track-order` | Guest order tracking, by order number + phone |
| `/gallery` | Editorial gallery |
| `/contact` | Contact form and studio details |
| `/favorites` | Saved products |
| `/search` | Search results |
| `/privacy`, `/terms` | Legal pages |
| `/login`, `/register`, `/forgot-password` | Customer accounts (standalone, no navbar) |
| `/account`, `/my-orders` | Signed-in customer area |
| `/admin/*` | Admin dashboard — products, stock, orders, photos |
| `/watches`, `/jewelry`, `/lashes` | Redirects into `/collections` |

## Project structure

```
src/
├── Component/    Reusable UI, and the admin product/order managers
├── Contexts/     ToastContext
├── Data/         images.js — imports the design assets in one place
├── Hooks/        useProducts
├── Layouts/      MainLayout — navbar, footer, scroll progress
├── Pages/        One file per route
├── assets/       Local images
├── i18n/         translations.js (EN / FR / AR) and useTranslation
├── lib/          Supabase clients, auth, currency, shipping, product options
├── stores/       Zustand stores
└── App.jsx       Routes
```

## Database

Three SQL files sit in the project root. Run them in this order on a fresh project:

1. `SUPABASE_SETUP.sql` — tables, and the storage bucket
2. `SUPABASE_MIGRATION.sql` — later columns the app needs
3. `SUPABASE_AUTH_LOCKDOWN.sql` — closes the database to strangers. **Run this last.**

All three are safe to run more than once. After any change, `npm run check:db`
tells you what is in place and what is still missing.

## Deploying

```bash
npm run build
```

Upload the contents of `build/` to your host (Netlify drop, Vercel, or any static
host). `public/_redirects` keeps client-side routes working on refresh.

## Notes

- **Prices** are stored in USD and shown in DZD using the rate in `src/lib/currency.js`.
- **Language** switcher supports English, French and Arabic, including right-to-left.
- **Stock** lives in the database. A product at 0 stock shows as sold out and cannot be ordered.
