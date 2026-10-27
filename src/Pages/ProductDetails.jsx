import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import useCartStore from "../stores/cartStore";
import { useToast } from "../Contexts/ToastContext";
import { formatDZD } from "../lib/currency";
import Breadcrumb from "../Component/Breadcrumb";
import ProductCard from "../Component/ProductCard";
import SectionHeader from "../Component/SectionHeader";
import SizeGuideModal from "../Component/SizeGuideModal";
import ImageZoomModal from "../Component/ImageZoomModal";
import SEO from "../Component/SEO";
import useProductStore from "../stores/productStore";
import {
  stockForVariant,
  LOW_STOCK,
  chargedPrice,
  isOnSale,
  percentOff,
} from "../lib/productOptions";
import useTranslation from "../i18n/useTranslation";

const PLACEHOLDER = "/placeholder-product.svg";

// The categories with a layout of their own. Anything else falls through to
// GenericDetails at the bottom of this file.
const DETAIL_CATEGORIES = ["Watches", "Bracelets", "Rings", "Nails", "Lashes"];

/**
 * `product.category` arrives exactly as it was typed into the admin, but the
 * filters that lead here match case-insensitively — so a row stored as
 * "watches" or "Watches " was listed under the Watches chip correctly and then
 * opened the generic layout, as if the product had no category. Compare on the
 * tidy lower-case form instead.
 */
function categoryKey(category) {
  return String(category || "").trim().toLowerCase();
}

const DETAIL_CATEGORY_KEYS = DETAIL_CATEGORIES.map(categoryKey);

function imgSrc(url) {
  if (!url) return PLACEHOLDER;
  try { return encodeURI(decodeURI(url)); } catch { return encodeURI(url); }
}

/* ─────────────────────────────────────────────
   Reusable sub‑components
   ───────────────────────────────────────────── */

// The little "you can zoom this" mark in the corner of the large image. On a
// photo that is already a button, saying so beats hoping the cursor implies it.
function ZoomMark() {
  return (
    <span
      aria-hidden="true"
      className="material-symbols-outlined pointer-events-none absolute bottom-3 end-3 rounded-full bg-black/35 px-2 py-1 text-[18px] text-white/90 backdrop-blur-sm transition-opacity duration-300"
    >
      zoom_in
    </span>
  );
}

function ProductGallery({ images, name, onImageClick }) {
  const main = images[0];
  const secondary = images.slice(1);
  const frame =
    "group relative overflow-hidden rounded-2xl bg-surface-container-low cursor-zoom-in";
  const photo =
    "w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]";

  return (
    <>
      {/* Mobile: single full-bleed image */}
      <div className={`md:hidden w-full aspect-[4/5] ${frame}`} onClick={() => onImageClick?.(main, name)}>
        <img
          src={imgSrc(main)}
          alt={name}
          className={photo}
          onError={(e) => { e.target.src = PLACEHOLDER; }}
          loading="eager"
        />
      </div>

      {/* Desktop: bento gallery */}
      <div className="hidden md:grid grid-cols-2 gap-3">
        <div className={`col-span-2 aspect-[4/5] ${frame}`} onClick={() => onImageClick?.(main, name)}>
          <img
            src={imgSrc(main)}
            alt={name}
            className={photo}
            onError={(e) => { e.target.src = PLACEHOLDER; }}
            loading="eager"
          />
          <ZoomMark />
        </div>
        {secondary.map((src, i) => (
          <div key={i} className={`aspect-square ${frame}`}>
            <img
              src={imgSrc(src)}
              alt=""
              className={photo}
              onError={(e) => { e.target.src = PLACEHOLDER; }}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </>
  );
}

function StickyAddToBag({ added, onClick, disabled }) {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface/95 backdrop-blur-md border-t border-outline-variant/20 px-4 py-3 safe-area-bottom shadow-[0_-12px_30px_-24px_rgba(0,0,0,0.55)]">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full py-4 bg-primary-container text-on-primary-fixed font-label-md rounded-full uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-xl">
          {disabled ? "block" : added ? "check" : "shopping_bag"}
        </span>
        {disabled ? t("pd_out_of_stock") : added ? t("pd_added") : t("pd_add_to_bag")}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Stock + add-to-bag, shared by all six layouts
   ───────────────────────────────────────────── */

// A stock value that isn't a number means the database has no figure for this
// product. We show nothing and never block the customer — an unknown number
// must not be mistaken for "sold out".
function StockNote({ stock }) {
  const { t } = useTranslation();
  if (typeof stock !== "number") return null;

  if (stock <= 0) {
    return (
      <p className="flex items-center gap-2 text-sm font-label-sm text-error" role="status">
        <span className="material-symbols-outlined text-[18px]">block</span>
        {t("pd_out_of_stock")}
      </p>
    );
  }

  if (stock <= LOW_STOCK) {
    return (
      <p className="flex items-center gap-2 text-sm font-label-sm text-primary" role="status">
        <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
        {t("pd_only_left").replace("{n}", stock)}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-2 text-sm font-label-sm text-on-surface-variant" role="status">
      <span className="material-symbols-outlined text-[18px]">check_circle</span>
      {t("pd_in_stock")}
    </p>
  );
}

/**
 * The price, with the promo shown the way a shop shows one: what you pay in
 * front, the old figure struck through behind it, and the saving.
 */
function PriceLine({ product }) {
  const onSale = isOnSale(product);
  const off = percentOff(product);

  return (
    <p className="text-lg md:text-headline-sm font-headline-sm flex items-baseline flex-wrap gap-x-3 gap-y-1">
      <span className={onSale ? "text-error" : "text-primary"}>
        {formatDZD(chargedPrice(product))}
      </span>
      {onSale && (
        <>
          <span className="text-sm md:text-base text-outline-variant line-through">
            {formatDZD(product.price)}
          </span>
          {off > 0 && (
            <span className="text-[10px] font-label-sm uppercase tracking-widest bg-error text-white rounded-full px-2 py-1">
              -{off}%
            </span>
          )}
        </>
      )}
    </p>
  );
}

/**
 * One add-to-bag implementation for every layout.
 * `variant` is the customer's actual choice ("Finish: Rose Gold", "Size 6") and
 * is carried all the way through to the admin's order screen.
 *
 * `choice` ({ color, size }) is the same choice in the shape the stock count
 * understands, so the bag can be limited to what is really on the shelf for
 * that colour and size — and `stock` below is that combination's number, not
 * the shop-wide total.
 */
function useAddToBag(product) {
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const { t } = useTranslation();
  const [added, setAdded] = useState(false);

  const addToBag = (variant, choice) => {
    const color = choice?.color || "";
    const size = choice?.size || "";
    const usesVariants = (product.variants || []).length > 0;
    const stock = usesVariants ? stockForVariant(product, color, size) : product.stock;
    const inStock = typeof stock !== "number" || stock > 0;

    if (!inStock) {
      toast.error(t("pd_out_of_stock"));
      return false;
    }

    const result = addItem(
      {
        id: product.id,
        name: product.name,
        // The promo price is what is charged; `original_price` lets the bag
        // show the same struck-through "was" figure the card showed.
        price: chargedPrice(product),
        original_price: isOnSale(product) ? Number(product.price) : undefined,
        image: product.images?.[0] || product.image,
        stock,
        // The colour and size travel as data as well as as a sentence: the
        // order needs to take the right one off the shelf.
        ...(color ? { color } : {}),
        ...(size ? { size } : {}),
        // Only a real choice counts. If this is ever handed straight to an
        // onClick, React passes the click event — which is truthy and would
        // end up in the saved cart as an unusable object.
        ...(typeof variant === "string" && variant ? { variant } : {}),
      },
      1
    );

    if (result?.ok === false) {
      toast.error(
        result.available > 0
          ? t("pd_stock_limit").replace("{n}", result.available)
          : t("pd_out_of_stock")
      );
      return false;
    }

    setAdded(true);
    toast.success(t("pd_added_toast"));
    setTimeout(() => setAdded(false), 2000);
    return true;
  };

  return { added, addToBag };
}

/**
 * Colour swatches and size chips for any layout, wired to the real stock.
 *
 * A size that has none left in the chosen colour is drawn struck through and
 * cannot be picked; picking a size greys out the colours it isn't made in. The
 * chosen pair is reported back through `onChange`, which the layouts feed to
 * useAddToBag().
 */
function VariantPicker({ product, color, size, onChange, labels }) {
  const colors = product.colors || [];
  const sizes = product.sizes || [];
  const usesVariants = (product.variants || []).length > 0;

  if (!colors.length && !sizes.length) return null;

  const nameOf = (c) => (typeof c === "string" ? c : c.name);
  const hexOf = (c) => (typeof c === "string" ? "" : c.hex || "");

  const available = (nextColor, nextSize) => {
    if (!usesVariants) return true;
    const n = stockForVariant(product, nextColor, nextSize);
    return n === null || n > 0;
  };

  return (
    <div className="space-y-4">
      {colors.length > 0 && (
        <div className="space-y-2">
          <p className="font-label-sm uppercase tracking-widest text-on-surface">
            {labels?.color || "Colour"}
            {color ? ` — ${color}` : ""}
          </p>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => {
              const name = nameOf(c);
              const ok = available(name, size);
              const active = name === color;
              return (
                <button
                  key={name}
                  type="button"
                  disabled={!ok}
                  aria-pressed={active}
                  aria-label={ok ? name : `${name} — unavailable`}
                  title={ok ? name : `${name} — unavailable`}
                  onClick={() => onChange({ color: name, size })}
                  className={`relative w-10 h-10 rounded-full transition-shadow disabled:opacity-30 disabled:cursor-not-allowed ${
                    active
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:ring-2 hover:ring-outline-variant hover:ring-offset-2"
                  }`}
                  style={{ backgroundColor: hexOf(c) || "#E5E2E1" }}
                >
                  {!hexOf(c) && (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-on-surface/70 uppercase">
                      {name.slice(0, 3)}
                    </span>
                  )}
                  {!ok && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-full h-px bg-on-surface/60 rotate-45" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div className="space-y-2">
          <p className="font-label-sm uppercase tracking-widest text-on-surface">
            {labels?.size || "Size"}
            {size ? ` — ${size}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const ok = available(color, s);
              const active = s === size;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!ok}
                  aria-pressed={active}
                  onClick={() => onChange({ color, size: s })}
                  className={`relative min-w-12 h-12 px-3 rounded-full font-label-md flex items-center justify-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                    active
                      ? "border-primary text-primary bg-primary-container"
                      : "border border-outline-variant/50 text-on-surface-variant hover:border-outline-variant"
                  }`}
                >
                  {s}
                  {!ok && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-px h-full bg-on-surface/40 rotate-12" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {usesVariants && (
        <p className="text-xs text-secondary" role="status">
          {(() => {
            const n = stockForVariant(product, color, size);
            if (n === null) return "";
            if (n === 0) return labels?.outOfStock || "Sold out";
            if (n <= LOW_STOCK) {
              return (labels?.onlyLeft || "Only {n} left").replace("{n}", n);
            }
            return (labels?.inStock || "In stock");
          })()}
        </p>
      )}
    </div>
  );
}

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-outline-variant/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 md:py-5 text-left font-label-md uppercase tracking-widest text-on-surface"
      >
        {title}
        <span
          className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-96 pb-4 md:pb-5" : "max-h-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The one add-to-bag button, shared by every layout.
 *
 * Six layouts used to carry their own copy of this markup, which is how they
 * drifted apart — one had dark text on the pink fill, one had no bag icon, one
 * sat on a different radius. It is one control, with one press animation, and
 * it is only rendered on md+ because the sticky bar owns the phone.
 */
function AddToBagButton({ added, available, onClick, className = "" }) {
  const { t } = useTranslation();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!available}
      whileTap={available ? { scale: 0.985 } : undefined}
      className={`hidden w-full items-center justify-center gap-2 rounded-full bg-primary-container py-5 font-label-md uppercase tracking-[0.2em] text-on-primary-fixed soft-glow transition-opacity duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:flex ${className}`}
    >
      <span className="material-symbols-outlined">
        {!available ? "block" : added ? "check" : "shopping_bag"}
      </span>
      {!available ? t("pd_out_of_stock") : added ? t("pd_added") : t("pd_add_to_bag")}
    </motion.button>
  );
}

/**
 * The shelf of other pieces under a product, in the same editorial voice as the
 * home page: a centred eyebrow, the display heading, then the cards.
 */
function RelatedSection({ title, related, columns = 4, className = "mt-section-gap" }) {
  const { t } = useTranslation();
  if (related.length === 0) return null;

  return (
    <section className={className}>
      <SectionHeader
        align="center"
        eyebrow={t("pd_more_eyebrow")}
        title={title}
        className="mb-10 md:mb-14"
      />
      <div
        className={`grid grid-cols-1 gap-x-gutter gap-y-10 sm:grid-cols-2 ${
          columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
        }`}
      >
        {related.map((p) => (
          <ProductCard
            key={p.id}
            id={p.id}
            name={p.name}
            category={p.category}
            price={p.price}
            salePrice={p.sale_price}
            isPack={p.is_pack}
            image={p.image}
            link={`/product/${p.id}`}
          />
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Layout‑specific renderers
   ───────────────────────────────────────────── */

function WatchDetails({ product, related, onImageClick }) {
  // Real colours from the database. An empty list hides the swatch row
  // entirely rather than showing three invented ones.
  const colorCodes = product.colors || [];
  const images = product.images || [];
  const { added, addToBag } = useAddToBag(product);
  const { t } = useTranslation();

  const colorNames = colorCodes.map((c) => c.name);
  const [choice, setChoice] = useState({ color: colorNames[0] || "", size: "" });
  const finish = choice.color || colorNames[0] || "";
  const available = (() => {
    const n = (product.variants || []).length
      ? stockForVariant(product, choice.color, "")
      : product.stock;
    return typeof n !== "number" || n > 0;
  })();

  const handleAddToBag = () =>
    addToBag(finish ? `${t("pd_finish")}: ${finish}` : null, { color: finish });

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-gutter items-start">
        <div className="lg:col-span-7">
          <ProductGallery images={images} name={product.name} onImageClick={onImageClick} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-5 md:space-y-6 pb-24 md:pb-0">
          <div className="flex items-start justify-between">
            <span className="inline-block bg-primary-container/30 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
              {t("pd_new_collection")}
            </span>
            <button type="button" aria-label="Share" className="w-10 h-10 flex items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>

          <h1 className="text-2xl md:text-display-lg font-display-lg leading-tight">{product.name}</h1>
          <PriceLine product={product} />
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>
          <StockNote stock={product.stock} />

          {colorCodes.length > 0 && (
            <VariantPicker
              product={product}
              color={choice.color}
              size=""
              onChange={setChoice}
              labels={{
                color: t("pd_finish"),
                inStock: t("pd_in_stock"),
                outOfStock: t("pd_out_of_stock"),
                onlyLeft: t("pd_only_left"),
              }}
            />
          )}

          <AddToBagButton added={added} available={available} onClick={handleAddToBag} />
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!available} />

      <RelatedSection title={t("pd_you_may_also_like")} related={related} />
    </>
  );
}

function BraceletDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const features = product.features || [];
  const { added, addToBag } = useAddToBag(product);
  const { t } = useTranslation();

  // A bracelet is sold in colours and lengths — red in 15, green in 14 — and
  // the shop counts each pair separately. Both selectors are driven by what
  // the owner actually entered; a product with neither shows no picker.
  const colorNames = (product.colors || []).map((c) => c.name).filter(Boolean);
  const sizeList = product.sizes || [];
  const [choice, setChoice] = useState({
    color: colorNames[0] || "",
    size: sizeList[0] || "",
  });

  const available = (() => {
    const n = (product.variants || []).length
      ? stockForVariant(product, choice.color, choice.size)
      : product.stock;
    return typeof n !== "number" || n > 0;
  })();

  const handleAddToBag = () => {
    const parts = [];
    if (choice.color) parts.push(`${t("pd_finish")}: ${choice.color}`);
    if (choice.size) parts.push(`${t("pd_size")}: ${choice.size}`);
    return addToBag(parts.join(" · ") || null, choice);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-gutter items-start">
        <div className="lg:col-span-7">
          <ProductGallery images={images} name={product.name} onImageClick={onImageClick} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-5 md:space-y-6 pb-24 md:pb-0">
          {product.badge && (
            <span className="inline-block bg-primary-container/30 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
              {product.badge}
            </span>
          )}

          <h1 className="text-2xl md:text-display-lg font-display-lg leading-tight">{product.name}</h1>
          <PriceLine product={product} />
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>
          <StockNote stock={product.stock} />

          {features.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {features.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full border border-outline-variant/30 text-xs font-label-sm text-on-surface">
                  <span className="material-symbols-outlined text-[16px]">{f.icon}</span>
                  {f.label}
                </span>
              ))}
            </div>
          )}

          <VariantPicker
            product={product}
            color={choice.color}
            size={choice.size}
            onChange={setChoice}
            labels={{
              color: t("pd_finish"),
              size: t("pd_select_size"),
              inStock: t("pd_in_stock"),
              outOfStock: t("pd_out_of_stock"),
              onlyLeft: t("pd_only_left"),
            }}
          />

          <div className="hidden md:flex gap-3">
            <AddToBagButton added={added} available={available} onClick={handleAddToBag} className="flex-1" />
            <button type="button" aria-label="Add to wishlist"
              className="w-14 h-14 flex items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined">favorite</span>
            </button>
          </div>
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!available} />

      <RelatedSection title={t("pd_complete_the_look")} related={related} />
    </>
  );
}

function RingDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const specs = product.specs || [];
  // Real sizes from the database — no invented 4–8 range.
  const sizes = product.sizes || [];
  const colorNames = (product.colors || []).map((c) => c.name).filter(Boolean);
  const [choice, setChoice] = useState({
    color: colorNames[0] || "",
    size: sizes[0] || "",
  });
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const { added, addToBag } = useAddToBag(product);
  const { t } = useTranslation();

  const available = (() => {
    const n = (product.variants || []).length
      ? stockForVariant(product, choice.color, choice.size)
      : product.stock;
    return typeof n !== "number" || n > 0;
  })();

  const handleAddToBag = () => {
    const parts = [];
    if (choice.color) parts.push(`${t("pd_finish")}: ${choice.color}`);
    if (choice.size) parts.push(`${t("pd_size")}: ${choice.size}`);
    return addToBag(parts.join(" · ") || null, choice);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-gutter">
        <div className="lg:col-span-7">
          <ProductGallery images={images} name={product.name} onImageClick={onImageClick} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-5 md:space-y-6 pb-24 md:pb-0">
          <span className="inline-block bg-primary-container/30 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
            {t("pd_fine_jewelry")}
          </span>

          <h1 className="text-2xl md:text-display-lg font-display-lg leading-tight">{product.name}</h1>
          <PriceLine product={product} />
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>
          <StockNote stock={product.stock} />

          {specs.length > 0 && (
            <div className="grid grid-cols-1 gap-3 py-4 md:py-6 border-y border-outline-variant/30">
              {specs.map((s, i) => (
                <div key={i} className="flex justify-between text-sm md:text-body-lg">
                  <span className="text-on-surface-variant">{s.label}</span>
                  <span className="text-on-surface font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {sizes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-label-sm uppercase tracking-widest text-on-surface">{t("pd_select_size")}</p>
                <button type="button" onClick={() => setShowSizeGuide(true)}
                  className="font-label-sm text-primary underline underline-offset-4 hover:opacity-80 transition-opacity">
                  {t("pd_sizing_guide")}
                </button>
              </div>
              <VariantPicker
                product={product}
                color={choice.color}
                size={choice.size}
                onChange={setChoice}
                labels={{
                  color: t("pd_finish"),
                  size: t("pd_select_size"),
                  inStock: t("pd_in_stock"),
                  outOfStock: t("pd_out_of_stock"),
                  onlyLeft: t("pd_only_left"),
                }}
              />
            </div>
          )}

          <AddToBagButton added={added} available={available} onClick={handleAddToBag} />
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!available} />

      <RelatedSection title={t("pd_art_of_stacking")} related={related} columns={3} />

      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </>
  );
}

function NailsDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const specs = product.specs || [];
  const { added, addToBag } = useAddToBag(product);
  // This layout has no colour or size selector, so the whole product's stock
  // is the only number that matters.
  const inStock = typeof product.stock !== "number" || product.stock > 0;
  const handleAddToBag = () => addToBag();
  const { t } = useTranslation();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-gutter">
        <div className="lg:col-span-7">
          <ProductGallery images={images} name={product.name} onImageClick={onImageClick} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-5 md:space-y-6 pb-24 md:pb-0">
          <span className="inline-block opacity-70 bg-primary-container/30 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
            {t("pd_new_collection")}
          </span>

          <h1 className="text-2xl md:text-display-lg font-display-lg leading-tight">{product.name}</h1>
          <PriceLine product={product} />
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>
          <StockNote stock={product.stock} />

          {specs.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:gap-4 py-4 md:py-6 border-y border-outline-variant/30">
              {specs.map((s, i) =>
                s.fullWidth ? (
                  <div key={i} className="col-span-2">
                    <p className="text-[10px] md:font-label-sm text-on-surface-variant uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-sm md:text-body-lg text-on-surface">{s.value}</p>
                  </div>
                ) : (
                  <div key={i}>
                    <p className="text-[10px] md:font-label-sm text-on-surface-variant uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-sm md:text-body-lg text-on-surface">{s.value}</p>
                  </div>
                )
              )}
            </div>
          )}

          <p className="flex items-center gap-2 text-xs md:font-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-[16px] md:text-[18px]">replay</span>
            {t("pd_reusable_5_times")}
          </p>

          <AddToBagButton added={added} available={inStock} onClick={handleAddToBag} />
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!inStock} />

      {/* Application Ritual */}
      <section className="mt-section-gap rounded-3xl bg-surface-container-low py-20 md:py-section-gap">
        <div className="mx-auto max-w-3xl px-margin-mobile md:px-margin-desktop">
          <SectionHeader align="center" title={t("pd_application_ritual")} className="mb-14 md:mb-16" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[t("pd_nails_prep"), t("pd_nails_select"), t("pd_nails_apply")].map((step, i) => (
              <div key={i} className="text-center space-y-4">
                <span className="inline-flex w-16 h-16 items-center justify-center rounded-full bg-primary-container text-primary font-display-lg text-[28px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-headline-sm text-on-surface">{step}</h3>
                <p className="font-body-lg text-on-surface-variant">
                  {i === 0 && t("pd_nails_prep_desc")}
                  {i === 1 && t("pd_nails_select_desc")}
                  {i === 2 && t("pd_nails_apply_desc")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Complete the Look */}
      <RelatedSection title={t("pd_complete_the_look")} related={related} columns={3} />
    </>
  );
}

function GenericDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const { added, addToBag } = useAddToBag(product);
  const { t } = useTranslation();

  // Anything without a layout of its own still gets the real options the owner
  // entered — bags with colours, jewellery with lengths, and so on.
  const colorNames = (product.colors || []).map((c) => c.name).filter(Boolean);
  const sizeList = product.sizes || [];
  const [choice, setChoice] = useState({
    color: colorNames[0] || "",
    size: sizeList[0] || "",
  });

  const available = (() => {
    const n = (product.variants || []).length
      ? stockForVariant(product, choice.color, choice.size)
      : product.stock;
    return typeof n !== "number" || n > 0;
  })();

  const handleAddToBag = () => {
    const parts = [];
    if (choice.color) parts.push(`${t("pd_finish")}: ${choice.color}`);
    if (choice.size) parts.push(`${t("pd_size")}: ${choice.size}`);
    return addToBag(parts.join(" · ") || null, choice);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-gutter items-start">
        <div className="lg:col-span-7">
          <ProductGallery images={images} name={product.name} onImageClick={onImageClick} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-5 md:space-y-6 pb-24 md:pb-0">
          {product.category && (
            <span className="inline-block bg-primary-container/30 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
              {product.category}
            </span>
          )}

          <h1 className="text-2xl md:text-display-lg font-display-lg leading-tight">{product.name}</h1>
          <PriceLine product={product} />
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>
          <StockNote stock={product.stock} />

          <VariantPicker
            product={product}
            color={choice.color}
            size={choice.size}
            onChange={setChoice}
            labels={{
              color: t("pd_finish"),
              size: t("pd_select_size"),
              inStock: t("pd_in_stock"),
              outOfStock: t("pd_out_of_stock"),
              onlyLeft: t("pd_only_left"),
            }}
          />

          <AddToBagButton added={added} available={available} onClick={handleAddToBag} />
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!available} />

      <RelatedSection title={t("pd_you_may_also_like")} related={related} />
    </>
  );
}

function LashesDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const specs = product.specs || [];
  const { added, addToBag } = useAddToBag(product);
  // This layout has no colour or size selector, so the whole product's stock
  // is the only number that matters.
  const inStock = typeof product.stock !== "number" || product.stock > 0;
  const handleAddToBag = () => addToBag();
  const { t } = useTranslation();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-gutter">
        <div className="lg:col-span-7">
          <ProductGallery images={images} name={product.name} onImageClick={onImageClick} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-5 md:space-y-6 pb-24 md:pb-0">
          <h1 className="text-2xl md:text-display-lg font-display-lg leading-tight">{product.name}</h1>
          <PriceLine product={product} />

          {specs.length > 0 && (
            <div className="flex gap-6 md:gap-8 border-y border-outline-variant/30 py-4 md:py-6 overflow-x-auto">
              {specs.map((s, i) => (
                <div key={i} className="flex flex-col flex-shrink-0">
                  <span className="text-[10px] md:font-label-sm text-on-surface-variant uppercase tracking-widest">{s.label}</span>
                  <span className="text-base md:text-headline-sm text-on-surface">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>
          <StockNote stock={product.stock} />

          <Accordion title={t("pd_lash_care_guide")}>
            <ol className="space-y-3 text-sm md:text-body-lg text-on-surface-variant list-decimal list-inside">
              <li>{t("pd_lash_step_1")}</li>
              <li>{t("pd_lash_step_2")}</li>
              <li>{t("pd_lash_step_3")}</li>
              <li>{t("pd_lash_step_4")}</li>
            </ol>
          </Accordion>

          <AddToBagButton added={added} available={inStock} onClick={handleAddToBag} />
        </div>
      </div>

      {/* Complete the Look */}
      <RelatedSection
        title={t("pd_complete_the_look")}
        related={related}
        columns={3}
        className="mt-12 md:mt-section-gap"
      />

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!inStock} />
    </>
  );
}

/* ─────────────────────────────────────────────
   Router / entry point
   ───────────────────────────────────────────── */

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState({ open: false, src: "", alt: "" });
  const { fetchById, fetchRelated } = useProductStore();
  const { t } = useTranslation();

  const openZoom = useCallback((src, alt) => {
    setZoom({ open: true, src, alt });
  }, []);

  const closeZoom = useCallback(() => {
    setZoom({ open: false, src: "", alt: "" });
  }, []);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchById(id).then((data) => {
        setProduct(data);
        setLoading(false);
        if (data) {
          fetchRelated(data.category, data.id, 4).then(setRelated);
        }
      });
    }
  }, [id, fetchById, fetchRelated]);

  if (loading) {
    return (
      <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-7"><div className="aspect-[4/5] bg-surface-container-low rounded-2xl" /></div>
          <div className="lg:col-span-5 space-y-4"><div className="h-8 bg-surface-container-low rounded w-3/4" /><div className="h-6 bg-surface-container-low rounded w-1/3" /><div className="h-32 bg-surface-container-low rounded" /></div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto text-center">
        <p className="font-headline-md text-on-surface-variant">{t("pd_not_found")}</p>
      </main>
    );
  }

  const breadcrumbItems = [
    { label: t("nav_collections"), link: "/collections" },
    { label: product.category, link: "/collections" },
    { label: product.name, link: null },
  ];

  return (
    <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEO
        title={product.name}
        description={product.description}
        image={product.images?.[0] || product.image}
      />
      <Breadcrumb items={breadcrumbItems} />

      {categoryKey(product.category) === "watches" && <WatchDetails product={product} related={related} onImageClick={openZoom} />}
      {categoryKey(product.category) === "bracelets" && <BraceletDetails product={product} related={related} onImageClick={openZoom} />}
      {categoryKey(product.category) === "rings" && <RingDetails product={product} related={related} onImageClick={openZoom} />}
      {categoryKey(product.category) === "nails" && <NailsDetails product={product} related={related} onImageClick={openZoom} />}
      {categoryKey(product.category) === "lashes" && <LashesDetails product={product} related={related} onImageClick={openZoom} />}
      {!DETAIL_CATEGORY_KEYS.includes(categoryKey(product.category)) && (
        <GenericDetails product={product} related={related} onImageClick={openZoom} />
      )}

      <ImageZoomModal
        isOpen={zoom.open}
        onClose={closeZoom}
        src={zoom.src}
        alt={zoom.alt}
      />
    </main>
  );
}
