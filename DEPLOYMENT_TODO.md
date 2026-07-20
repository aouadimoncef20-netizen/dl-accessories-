# DL Accessories — Deployment & Handoff To-Do List

## Owner Info
- **Brand**: DL Accessories
- **Tagline**: Details Make You Shine
- **Primary Color**: #785560 (rosewood pink)
- **Background**: #fcf9f8 (warm white)
- **Fonts**: Playfair Display (headings) + Plus Jakarta Sans (body)

---

## PHASE 1: BRANDING FIXES ✅ DONE

### 1.1 Fix public/index.html ✅
- [x] Change `<title>` → "DL Accessories | Details Make You Shine"
- [x] Change meta description → brand description
- [x] Change meta theme-color → `#fcf9f8`
- [x] Remove old "Dapper Algeria" references
- [ ] Add Google Analytics tracking ID if owner requests it

### 1.2 Fix public/manifest.json ✅
- [x] Change short_name → "DL Accessories"
- [x] Change name → "DL Accessories — Details Make You Shine"
- [x] Change theme_color → "#785560"
- [x] Change background_color → "#fcf9f8"
- [x] Update icon references to SVG

### 1.3 Fix package.json ✅
- [x] Change "name": "site" → "name": "dl-accessories"
- [x] Change "version": "0.1.0" → "version": "1.0.0"
- [x] Remove unused dependencies

### 1.4 Create brand assets ✅
- [x] Create logo.svg — DL monogram on rosewood background
- [x] Create logo192.svg
- [x] Create logo512.svg
- [x] Place all in `public/` folder

---

## PHASE 2: SEO & META ✅ DONE

### 2.1 Meta tags ✅
- [x] Open Graph tags (og:title, og:description, og:image, og:url, og:type)
- [x] Twitter Card tags (summary_large_image)
- [x] Canonical URL tag
- [x] Updated apple-touch-icon to SVG

### 2.2 SPA routing ✅
- [x] Created `public/_redirects` for Netlify (`/* /index.html 200`)

---

## PHASE 3: IMAGE & ASSET OPTIMIZATION (owner needs to do)

### 3.1 Move images from CDN to local
- [ ] Download ~50 product/category/editorial images from Google CDN URLs
- [ ] Place in `src/assets/images/products/`
- [ ] Update all image paths in data files and pages

### 3.2 Image optimization
- [ ] Compress all JPEGs to < 200KB
- [ ] Convert to WebP format
- [ ] Add lazy loading

---

## PHASE 4: PERFORMANCE (optional)

### 4.1 Code optimization
- [ ] Code-split ProductDetails.jsx with React.lazy()
- [ ] Code-split Gallery.jsx (lightbox modal)

---

## PHASE 5: CONTENT & DATA (owner needs to do)

### 5.1 Product data review
- [ ] Verify all prices with owner
- [ ] Add real SKUs/IDs

### 5.2 Contact info
- [ ] Update studio address with real address
- [ ] Update email with real email
- [ ] Update phone number
- [ ] Add real social media links
- [ ] Link Instagram grid to real account

### 5.3 Legal pages (recommended)
- [ ] Create Privacy Policy page
- [ ] Create Terms of Service page
- [ ] Create Shipping & Returns page
- [ ] Update Footer links

---

## PHASE 6: FUNCTIONALITY FIXES ✅ CORE DONE

### 6.1 All flows work ✅
- [x] Home → ProductDetails → Cart
- [x] Home → Category → Collections (filtered)
- [x] Collections → filter/sort/paginate
- [x] Gallery → Lightbox
- [x] Contact → form submit
- [x] Search → results
- [x] Favorites → wishlist
- [x] Navbar cart badge

### 6.2 Missing functionality to build ✅ PARTIALLY DONE
- [x] **Checkout form validation** — 3-step form with required field validation
- [x] **Order confirmation page** — `/order-confirmed` with order number + shipping details
- [x] **Size guide modal** — Rings page "Sizing Guide" opens modal with US sizes chart + measuring guide
- [x] **Gift wrapping toggle** — Cart page has working toggle with visual feedback
- [ ] **Newsletter backend** — needs API call instead of alert
- [ ] **Contact form backend** — needs Formspree / EmailJS integration
- [ ] **Payment processing** — needs Stripe/PayPal

### 6.3 Legal pages ✅ DONE
- [x] Privacy Policy page (`/privacy`)
- [x] Terms of Service page (`/terms`)
- [x] Shipping & Returns page (`/shipping`)
- [x] Footer links updated to real routes

---

## PHASE 7: ENVIRONMENT (owner needs to do)

### 7.1 Environment variables
- [ ] Create `.env.production` with site URL
- [ ] Create `.env.development`
- [ ] Add `.env` to `.gitignore`

---

## PHASE 8: ANALYTICS (owner needs to do)

### 8.1 Analytics
- [ ] Set up Google Analytics 4
- [ ] Add GA tracking code to index.html
- [ ] Track key events

---

## PHASE 9: DEPLOYMENT

### 9.1 Choose platform
- [ ] **Option A: Netlify (recommended — drag & drop)**
  - [ ] Run `npm run build`
  - [ ] Go to https://app.netlify.com/drop
  - [ ] Drag `build/` folder onto page
  - [ ] Site is live instantly at `https://random-name.netlify.app`
  - [ ] (Optional) Set custom domain
- [ ] **Option B: Vercel**
  - [ ] Run `npx vercel --prod`
- [ ] **Option C: Traditional hosting**
  - [ ] Upload build/ to server

### 9.2 Post-deploy checks
- [ ] Visit live URL on desktop & mobile
- [ ] Test all routes
- [ ] Check images load

---

## PHASE 10: HANDOFF TO OWNER

### 10.1 Create README.md
- [ ] Project description and tech stack
- [ ] How to run locally: `npm install && npm start`
- [ ] How to build: `npm run build`
- [ ] How to add products: edit `src/Data/products.js`
- [ ] How to change colors: edit `tailwind.config.js`
- [ ] How to deploy

### 10.2 Deliverables
- [ ] Source code (ZIP or GitHub repo)
- [ ] Production build folder
- [ ] README file
- [ ] Hosting account credentials

---

## QUICK DEPLOY (Netlify — 2 minutes)

```bash
npm run build
# Then go to https://app.netlify.com/drop
# Drag "build" folder onto the page
```

---

## Summary of what I already fixed

| # | Task | Status |
|---|------|--------|
| 1.1 | index.html branding | ✅ Done |
| 1.2 | manifest.json | ✅ Done |
| 1.3 | package.json | ✅ Done |
| 1.4 | SVG logos created | ✅ Done |
| 2.1 | OG + Twitter meta tags | ✅ Done |
| 2.2 | _redirects for SPA routing | ✅ Done |
| 6.1 | All user flows functional | ✅ Done |
| 9.1 | Build ready to deploy | ✅ Ready |
