import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import useCartStore from "../stores/cartStore";
import { useToast } from "../Contexts/ToastContext";
import { formatDZD } from "../lib/currency";
import Breadcrumb from "../Component/Breadcrumb";
import ProductCard from "../Component/ProductCard";
import SizeGuideModal from "../Component/SizeGuideModal";
import ImageZoomModal from "../Component/ImageZoomModal";
import SEO from "../Component/SEO";
import useProductStore from "../stores/productStore";
import { LOW_STOCK } from "../lib/productOptions";
import useTranslation from "../i18n/useTranslation";

const PLACEHOLDER = "/placeholder-product.svg";

// The categories with a layout of their own. Anything else falls through to
// GenericDetails at the bottom of this file.
const DETAIL_CATEGORIES = ["Watches", "Bracelets", "Rings", "Nails", "Lashes"];

function imgSrc(url) {
  if (!url) return PLACEHOLDER;
  try { return encodeURI(decodeURI(url)); } catch { return encodeURI(url); }
}

/* ─────────────────────────────────────────────
   Reusable sub‑components
   ───────────────────────────────────────────── */

function ProductGallery({ images, name, onImageClick }) {
  const main = images[0];
  const secondary = images.slice(1);
  return (
    <>
      {/* Mobile: single full-bleed image */}
      <div
        className="md:hidden w-full aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container-low cursor-zoom-in"
        onClick={() => onImageClick?.(main, name)}
      >
        <img src={imgSrc(main)} alt={name} className="w-full h-full object-cover" onError={(e) => { e.target.src = PLACEHOLDER; }} loading="eager" />
      </div>

      {/* Desktop: bento gallery */}
      <div className="hidden md:grid grid-cols-2 gap-3">
        <div className="col-span-2 aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container-low cursor-zoom-in" onClick={() => onImageClick?.(main, name)}>
          <img src={imgSrc(main)} alt={name} className="w-full h-full object-cover" onError={(e) => { e.target.src = PLACEHOLDER; }} loading="eager" />
        </div>
        {secondary.map((src, i) => (
          <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
            <img src={imgSrc(src)} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = PLACEHOLDER; }} loading="lazy" />
          </div>
        ))}
      </div>
    </>
  );
}

function StickyAddToBag({ added, onClick, disabled }) {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface/95 backdrop-blur-md border-t border-outline-variant/20 px-4 py-3 safe-area-bottom">
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
 * One add-to-bag implementation for every layout.
 * `variant` is the customer's actual choice ("Finish: Rose Gold", "Size 6") and
 * is carried all the way through to the admin's order screen.
 */
function useAddToBag(product) {
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const { t } = useTranslation();
  const [added, setAdded] = useState(false);

  const inStock = typeof product.stock !== "number" || product.stock > 0;

  const addToBag = (variant) => {
    if (!inStock) {
      toast.error(t("pd_out_of_stock"));
      return false;
    }

    const result = addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || product.image,
        stock: product.stock,
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

  return { added, inStock, addToBag };
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

/* ─────────────────────────────────────────────
   Layout‑specific renderers
   ───────────────────────────────────────────── */

function WatchDetails({ product, related, onImageClick }) {
  // Real colours from the database. An empty list hides the swatch row
  // entirely rather than showing three invented ones.
  const colorCodes = product.colors || [];
  const [activeColor, setActiveColor] = useState(0);
  const images = product.images || [];
  const { added, inStock, addToBag } = useAddToBag(product);
  const { t } = useTranslation();

  const finish = colorCodes[activeColor]?.name || "";
  const handleAddToBag = () => addToBag(finish ? `${t("pd_finish")}: ${finish}` : null);

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
          <p className="text-lg md:text-headline-sm text-primary font-headline-sm">{formatDZD(product.price)}</p>
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>
          <StockNote stock={product.stock} />

          {colorCodes.length > 0 && (
            <div className="space-y-3">
              <p className="font-label-sm uppercase tracking-widest text-on-surface">
                {t("pd_finish")}{finish ? ` — ${finish}` : ""}
              </p>
              <div className="flex flex-wrap gap-3">
                {colorCodes.map((c, i) => (
                  <button key={i} type="button" aria-label={c.name || `Colour ${i + 1}`} title={c.name} onClick={() => setActiveColor(i)}
                    className={`w-10 h-10 rounded-full transition-shadow ${i === activeColor ? "ring-2 ring-primary ring-offset-2" : "hover:ring-2 hover:ring-outline-variant hover:ring-offset-2"}`}
                    style={{ backgroundColor: c.hex || "#E5E2E1" }}
                  />
                ))}
              </div>
            </div>
          )}

          <button type="button" onClick={handleAddToBag} disabled={!inStock}
            className="hidden md:flex w-full py-5 bg-primary-container text-on-primary-fixed font-label-md rounded-full soft-glow uppercase tracking-[0.2em] items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined">{!inStock ? "block" : added ? "check" : "shopping_bag"}</span>
            {!inStock ? t("pd_out_of_stock") : added ? t("pd_added") : t("pd_add_to_bag")}
          </button>
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!inStock} />

      {/* You may also like */}
      {related.length > 0 && (
        <section className="mt-section-gap">
          <h2 className="font-headline-md text-headline-md text-center mb-12">
            {t("pd_you_may_also_like")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {related.map((p) => (
              <ProductCard key={p.id} id={p.id} name={p.name} category={p.category} price={p.price} image={p.image} link={`/product/${p.id}`} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function BraceletDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const features = product.features || [];
  const { added, inStock, addToBag } = useAddToBag(product);
  // This layout has no colour or size selector, so there is no variant to record.
  const handleAddToBag = () => addToBag();
  const { t } = useTranslation();

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
          <p className="text-lg md:text-headline-sm text-primary font-headline-sm">{formatDZD(product.price)}</p>
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

          <div className="hidden md:flex gap-3">
            <button type="button" onClick={handleAddToBag} disabled={!inStock}
              className="flex-1 py-5 bg-primary-container text-on-primary-fixed font-label-md rounded-full soft-glow uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined">{!inStock ? "block" : added ? "check" : "shopping_bag"}</span>
              {!inStock ? t("pd_out_of_stock") : added ? t("pd_added") : t("pd_add_to_bag")}
            </button>
            <button type="button" aria-label="Add to wishlist"
              className="w-14 h-14 flex items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined">favorite</span>
            </button>
          </div>
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!inStock} />

      {/* Complete the look */}
      {related.length > 0 && (
        <section className="mt-section-gap">
          <h2 className="font-headline-md text-headline-md text-center mb-12">
            {t("pd_complete_the_look")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {related.map((p) => (
              <ProductCard key={p.id} id={p.id} name={p.name} category={p.category} price={p.price} image={p.image} link={`/product/${p.id}`} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function RingDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const specs = product.specs || [];
  // Real sizes from the database — no invented 4–8 range.
  const sizes = product.sizes || [];
  const [activeSize, setActiveSize] = useState(sizes[0]);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const { added, inStock, addToBag } = useAddToBag(product);
  const { t } = useTranslation();

  const handleAddToBag = () =>
    addToBag(activeSize ? `${t("pd_size")}: ${activeSize}` : null);

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

          <h1 className="text-2xl md:text-headline-md font-headline-md leading-tight">{product.name}</h1>
          <p className="text-lg md:text-headline-sm text-primary font-headline-sm">{formatDZD(product.price)}</p>
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
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} type="button" onClick={() => setActiveSize(s)}
                    className={`w-12 h-12 rounded-full font-label-md flex items-center justify-center transition-colors ${s === activeSize ? "border-primary text-primary bg-primary-container" : "border border-outline-variant/50 text-on-surface-variant hover:border-outline-variant"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="button" onClick={handleAddToBag} disabled={!inStock}
            className="hidden md:flex w-full py-5 bg-primary-container text-on-primary-container rounded-full shadow-lg font-label-md uppercase tracking-[0.2em] items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined">{!inStock ? "block" : added ? "check" : "shopping_bag"}</span>
            {!inStock ? t("pd_out_of_stock") : added ? t("pd_added") : t("pd_add_to_bag")}
          </button>
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!inStock} />

      {/* The Art of Stacking */}
      {related.length > 0 && (
        <section className="mt-section-gap">
          <h2 className="font-headline-md text-headline-md text-center mb-12">
            {t("pd_art_of_stacking")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {related.map((p) => (
              <ProductCard key={p.id} id={p.id} name={p.name} category={p.category} price={p.price} image={p.image} link={`/product/${p.id}`} />
            ))}
          </div>
        </section>
      )}

      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </>
  );
}

function NailsDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const specs = product.specs || [];
  const { added, inStock, addToBag } = useAddToBag(product);
  // This layout has no colour or size selector, so there is no variant to record.
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
          <p className="text-lg md:text-headline-sm text-primary font-headline-sm">{formatDZD(product.price)}</p>
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

          <button type="button" onClick={handleAddToBag} disabled={!inStock}
            className="hidden md:flex w-full bg-primary-container text-primary h-14 rounded-full font-label-md uppercase tracking-[0.2em] items-center justify-center gap-2 hover:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed">
            {!inStock ? t("pd_out_of_stock") : added ? t("pd_added") : t("pd_add_to_bag")}
            <span className="material-symbols-outlined">{!inStock ? "block" : added ? "check" : "arrow_forward"}</span>
          </button>
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!inStock} />

      {/* Application Ritual */}
      <section className="bg-surface-container-low py-section-gap mt-section-gap rounded-3xl">
        <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop">
          <h2 className="font-headline-md text-headline-md text-center mb-16">
            {t("pd_application_ritual")}
          </h2>
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
      {related.length > 0 && (
        <section className="mt-section-gap">
          <h2 className="font-headline-md text-headline-md text-center mb-12">
            {t("pd_complete_the_look")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {related.map((p) => (
              <ProductCard key={p.id} id={p.id} name={p.name} category={p.category} price={p.price} image={p.image} link={`/product/${p.id}`} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function GenericDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const { added, inStock, addToBag } = useAddToBag(product);
  // This layout has no colour or size selector, so there is no variant to record.
  const handleAddToBag = () => addToBag();
  const { t } = useTranslation();

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
          <p className="text-lg md:text-headline-sm text-primary font-headline-sm">{formatDZD(product.price)}</p>
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>
          <StockNote stock={product.stock} />

          <button type="button" onClick={handleAddToBag} disabled={!inStock}
            className="hidden md:flex w-full py-5 bg-primary-container text-on-primary-fixed font-label-md rounded-full soft-glow uppercase tracking-[0.2em] items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined">{!inStock ? "block" : added ? "check" : "shopping_bag"}</span>
            {!inStock ? t("pd_out_of_stock") : added ? t("pd_added") : t("pd_add_to_bag")}
          </button>
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} disabled={!inStock} />

      {related.length > 0 && (
        <section className="mt-section-gap">
          <h2 className="font-headline-md text-headline-md text-center mb-12">
            {t("pd_you_may_also_like")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {related.map((p) => (
              <ProductCard key={p.id} id={p.id} name={p.name} category={p.category} price={p.price} image={p.image} link={`/product/${p.id}`} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function LashesDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const specs = product.specs || [];
  const { added, inStock, addToBag } = useAddToBag(product);
  // This layout has no colour or size selector, so there is no variant to record.
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
          <p className="text-lg md:text-headline-sm text-primary font-headline-sm">{formatDZD(product.price)}</p>

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

          <button type="button" onClick={handleAddToBag} disabled={!inStock}
            className="hidden md:flex w-full bg-primary-container text-on-primary-fixed rounded-full py-5 font-label-md uppercase tracking-[0.2em] items-center justify-center gap-2 soft-glow hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined">{!inStock ? "block" : added ? "check" : "shopping_bag"}</span>
            {!inStock ? t("pd_out_of_stock") : added ? t("pd_added") : t("pd_add_to_bag")}
          </button>
        </div>
      </div>

      {/* Complete the Look */}
      {related.length > 0 && (
        <section className="mt-12 md:mt-section-gap">
          <h2 className="font-headline-md text-headline-md text-center mb-6 md:mb-12">{t("pd_complete_the_look")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-gutter">
            {related.map((p) => (
              <ProductCard key={p.id} id={p.id} name={p.name} category={p.category} price={p.price} image={p.image} link={`/product/${p.id}`} />
            ))}
          </div>
        </section>
      )}

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

      {product.category === "Watches" && <WatchDetails product={product} related={related} onImageClick={openZoom} />}
      {product.category === "Bracelets" && <BraceletDetails product={product} related={related} onImageClick={openZoom} />}
      {product.category === "Rings" && <RingDetails product={product} related={related} onImageClick={openZoom} />}
      {product.category === "Nails" && <NailsDetails product={product} related={related} onImageClick={openZoom} />}
      {product.category === "Lashes" && <LashesDetails product={product} related={related} onImageClick={openZoom} />}
      {!DETAIL_CATEGORIES.includes(product.category) && (
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
