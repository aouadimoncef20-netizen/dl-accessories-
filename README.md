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
| `/admin/*` | Admin dashboard — orders (filter, search, CSV, invoice, edit, take an order by phone), products (with a low-stock filter), customers, gallery, delivery prices, promo codes |
| `/watches`, `/jewelry`, `/lashes` | Redirects into `/collections` |

## Project structure

```text
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

Four SQL files sit in the project root. Run them in this order on a fresh
project:

1. `SUPABASE_SETUP.sql` — tables, and the storage bucket
2. `SUPABASE_MIGRATION.sql` — later columns the app needs
3. `SUPABASE_AUTH_LOCKDOWN.sql` — closes the database to strangers
4. `SUPABASE_UPGRADE.sql` — **run this last.** Delivery prices, coupons, the
   gallery table, the DHD columns, and `place_order()`: the function that
   recalculates the price and takes the stock itself.

`SUPABASE_UPGRADE.sql` is the one that replaces `lookup_order()` with the
version that includes the courier tracking number, so it must come after the
lockdown file (running the lockdown afterwards would put the 8-column version
back and Postgres would refuse the change).

All four are safe to run more than once. After any change, `npm run check:db`
tells you what is in place and what is still missing.

### Admin account

The dashboard trusts one address: `zaki1@dlaccessories.com`
(`admin@dlaccessories.com` is accepted as an alias at the login form).
For the database policies to let the dashboard read every order, that address
must exist as a **Supabase Auth user** with a confirmed email. Create it in
Authentication → Users, then sign in with it on `/admin`.

Without that, the dashboard still opens (the built-in account works offline)
but the orders tab shows the "saved in this browser only" banner, because the
database refuses the read.

### Delivery (DHD)

Wilaya orders are sent to the DHD courier through one Edge Function:

```bash
supabase secrets set DHD_TOKEN=... DHD_API_URL=...
supabase functions deploy dhd --project-ref <your-project-ref>
npm run dhd:sync        # fills dhd_wilayas and dhd_communes
```

The storefront calls the function with the public key, which is not a JWT, so
JWT verification is off for `dhd` (see `supabase/config.toml`). If you deploy
from the dashboard instead, turn "Verify JWT" off on the function.

Booking a parcel is therefore gated by the order id alone: the function takes an
id, reads the real address from `orders` with the service key, and returns the
existing tracking number if one is already saved — so a stranger cannot post a
made-up address, and a double-click cannot book twice.

Reading is protected separately. A label or a tracking history contains the
customer's name, phone and full address, so `GET ?action=label` and
`?action=track` require a Supabase session belonging to `ADMIN_EMAIL` (the
function verifies it with `auth.getUser`). The dashboard sends the session
token; an admin signed in only through the built-in offline password sees
"Sign in with your Supabase admin account to print labels".

Campus and Réghaïa orders never go to DHD — the shop delivers those itself.

#### Delivery prices

`src/lib/shipping.js` holds the courier's published card — one door price per
wilaya in `WILAYA_HOME_PRICES` — and the stop-desk price is derived from it
rather than typed 58 times:

- stop desk = door price **+ 100 DZD** for every wilaya
- **+ 150 DZD** for Blida (`09`), Boumerdès (`35`) and Tipaza (`42`)

So Blida is 500 at the door and 650 at the desk, Boumerdès 600 → 750, Tipaza
600 → 750; Oran (31) is 700 at the door and 800 at the desk. `stopDeskExtraFor`
and `stopDeskPriceFor` are the only places that rule lives in the frontend,
with the same arithmetic mirrored in the `SUPABASE_UPGRADE.sql` seed.

The customer picks "home" or "stop desk" at checkout, and the fee follows that
choice: `delivery_zones` carries both `price_dzd` and `stopdesk_dzd`, and
`place_order()` re-prices the order itself from the same two columns, so a
tampered browser cannot set its own delivery fee. Admin → Delivery shows both
numbers per wilaya and can recalculate the stop-desk column from the rule
above. Until `SUPABASE_UPGRADE.sql` has been run, that column is missing and
the table falls back to the stop-desk prices computed in `shipping.js`.

#### Customer comment

Checkout has an optional "A word for the shop" box (400 characters). It is
stored as `orders.customer_note` and shown to the owner in Admin → Orders —
in the order row and in the order's edit dialog. It is a note for the shop, not
a courier instruction, so it never reaches DHD.

## Deploying

```bash
npm run build
```

Upload the contents of `build/` to your host (Netlify drop, Vercel, or any static
host). `public/_redirects` keeps client-side routes working on refresh.

## Notes

- **Prices** are in Algerian dinars end to end. The number typed in the admin form is the number the customer pays; `src/lib/currency.js` only formats it for display.
- **Language** switcher supports English, French and Arabic, including right-to-left.

### Stock by colour and size

A bracelet is sold in colours *and* lengths, and the shop counts each pair
separately: nine red in 15, one red in 14, and so on. The product form asks for
that grid — one box for every colour × size the product offers — and stores it
as JSONB in `products.variants`:

```json
[{ "color": "Red", "size": "15", "stock": 9 },
 { "color": "Red", "size": "14", "stock": 1 }]
```

`products.stock` stays a plain number and is always the **sum** of the grid, so
anything that only asks "is there any left?" keeps working. Leave a box empty
to mean "we don't sell that pair" — that is different from typing `0`, which
means "sold out". Colour and size are matched case- and space-insensitively
(`variantKey`), so `Red` and `Red` with a trailing space cannot split the same
stock in two.

On the storefront the picker greys out combinations with nothing left, and the
cart keeps one line per colour/size pair rather than merging them. `place_order()`
checks the exact row before accepting an order and decrements only that row.

Phone orders typed into Admin → Orders ask for the colour and size too, and the
line carries them into `place_order()`. If a line for a counted product arrives
**without** a pair (an old client, or a product with a grid but no picker), the
function spreads the sale across the grid, earliest combination first, and
restates the total — the goods left the shelf, so the figure has to follow, and
no later sale can quietly overwrite the decrement.

### Collections filters

The filter bar on `/collections` is `Promo` (`sale_price` set and below `price`),
`Packs` (`is_pack`), `New Arrivals`, `Bestsellers`, and the categories. A
product on promo shows its old price struck through with a `-N%` badge; a pack
shows a `Pack` badge. Both flags are set in the admin product form.
