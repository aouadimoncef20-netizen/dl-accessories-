import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import useCartStore from "../stores/cartStore";
import useWishlistStore from "../stores/wishlistStore";
import { useToast } from "../Contexts/ToastContext";
import { formatDZD } from "../lib/currency";
import Breadcrumb from "../Component/Breadcrumb";
import ProductCard from "../Component/ProductCard";
import SizeGuideModal from "../Component/SizeGuideModal";
import ImageZoomModal from "../Component/ImageZoomModal";
import SEO from "../Component/SEO";
import useProductStore from "../stores/productStore";

const PLACEHOLDER = "/placeholder-product.png";

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

function StickyAddToBag({ added, onClick, label = "Add to Bag" }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface/95 backdrop-blur-md border-t border-outline-variant/20 px-4 py-3 safe-area-bottom">
      <button
        type="button"
        onClick={onClick}
        className="w-full py-4 bg-primary-container text-on-primary-fixed font-label-md rounded-full uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <span className="material-symbols-outlined text-xl">{added ? "check" : "shopping_bag"}</span>
        {added ? "Added!" : label}
      </button>
    </div>
  );
}

function Accordion({ title, openByDefault, children }) {
  const [open, setOpen] = useState(!!openByDefault);
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
  const [activeColor, setActiveColor] = useState(0);
  const [added, setAdded] = useState(false);
  const colorCodes = product.colors || ["#F6C8D5", "#E5E2E1", "#1C1B1B"];
  const images = product.images || [];
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const handleAddToBag = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image, variant: `Finish: Rose Gold` });
    setAdded(true);
    toast.success("Added to bag!");
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-gutter items-start">
        <div className="lg:col-span-7">
          <ProductGallery images={images} name={product.name} onImageClick={onImageClick} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-5 md:space-y-6 pb-24 md:pb-0">
          <div className="flex items-start justify-between">
            <span className="inline-block bg-primary-container/30 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
              New Collection
            </span>
            <button type="button" aria-label="Share" className="w-10 h-10 flex items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>

          <h1 className="text-2xl md:text-display-lg font-display-lg leading-tight">{product.name}</h1>
          <p className="text-lg md:text-headline-sm text-primary font-headline-sm">{formatDZD(product.price)}</p>
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>

          <div className="space-y-3">
            <p className="font-label-sm uppercase tracking-widest text-on-surface">Finish: Rose Gold</p>
            <div className="flex flex-wrap gap-3">
              {colorCodes.map((c, i) => (
                <button key={i} type="button" aria-label={`Color ${i + 1}`} onClick={() => setActiveColor(i)}
                  className={`w-10 h-10 rounded-full transition-shadow ${i === activeColor ? "ring-2 ring-primary ring-offset-2" : "hover:ring-2 hover:ring-outline-variant hover:ring-offset-2"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button type="button" onClick={handleAddToBag}
            className="hidden md:flex w-full py-5 bg-primary-container text-on-primary-fixed font-label-md rounded-full soft-glow uppercase tracking-[0.2em] items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined">{added ? "check" : "shopping_bag"}</span>
            {added ? "Added!" : "Add to Bag"}
          </button>
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} />

      {/* You may also like */}
      {related.length > 0 && (
        <section className="mt-section-gap">
          <h2 className="font-headline-md text-headline-md text-center mb-12">
            You may also like
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
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const [added, setAdded] = useState(false);

  const handleAddToBag = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image });
    setAdded(true);
    toast.success("Added to bag!");
    setTimeout(() => setAdded(false), 2000);
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
          <p className="text-lg md:text-headline-sm text-primary font-headline-sm">{formatDZD(product.price)}</p>
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>

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
            <button type="button" onClick={handleAddToBag}
              className="flex-1 py-5 bg-primary-container text-on-primary-fixed font-label-md rounded-full soft-glow uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined">{added ? "check" : "shopping_bag"}</span>
              {added ? "Added!" : "Add to Bag"}
            </button>
            <button type="button" aria-label="Add to wishlist"
              className="w-14 h-14 flex items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined">favorite</span>
            </button>
          </div>
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} />

      {/* Complete the look */}
      {related.length > 0 && (
        <section className="mt-section-gap">
          <h2 className="font-headline-md text-headline-md text-center mb-12">
            Complete the look
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
  const sizes = product.sizes || ["4", "5", "6", "7", "8"];
  const [activeSize, setActiveSize] = useState(sizes[0]);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const handleAddToBag = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image, variant: `Size ${activeSize}` });
    setAdded(true);
    toast.success("Added to bag!");
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-gutter">
        <div className="lg:col-span-7">
          <ProductGallery images={images} name={product.name} onImageClick={onImageClick} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-5 md:space-y-6 pb-24 md:pb-0">
          <span className="inline-block bg-primary-container/30 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
            Fine Jewelry
          </span>

          <h1 className="text-2xl md:text-headline-md font-headline-md leading-tight">{product.name}</h1>
          <p className="text-lg md:text-headline-sm text-primary font-headline-sm">{formatDZD(product.price)}</p>
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>

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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-label-sm uppercase tracking-widest text-on-surface">Select Size</p>
              <button type="button" onClick={() => setShowSizeGuide(true)}
                className="font-label-sm text-primary underline underline-offset-4 hover:opacity-80 transition-opacity">
                Sizing Guide
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

          <button type="button" onClick={handleAddToBag}
            className="hidden md:flex w-full py-5 bg-primary-container text-on-primary-container rounded-full shadow-lg font-label-md uppercase tracking-[0.2em] items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined">{added ? "check" : "shopping_bag"}</span>
            {added ? "Added!" : "Add to Bag"}
          </button>
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} />

      {/* The Art of Stacking */}
      {related.length > 0 && (
        <section className="mt-section-gap">
          <h2 className="font-headline-md text-headline-md text-center mb-12">
            The Art of Stacking
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
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const handleAddToBag = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image });
    setAdded(true);
    toast.success("Added to bag!");
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-gutter">
        <div className="lg:col-span-7">
          <ProductGallery images={images} name={product.name} onImageClick={onImageClick} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-5 md:space-y-6 pb-24 md:pb-0">
          <span className="inline-block opacity-70 bg-primary-container/30 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
            New Collection
          </span>

          <h1 className="text-2xl md:text-display-lg font-display-lg leading-tight">{product.name}</h1>
          <p className="text-lg md:text-headline-sm text-primary font-headline-sm">{formatDZD(product.price)}</p>
          <p className="text-sm md:text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>

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
            Reusable up to 5 times
          </p>

          <button type="button" onClick={handleAddToBag}
            className="hidden md:flex w-full bg-primary-container text-primary h-14 rounded-full font-label-md uppercase tracking-[0.2em] items-center justify-center gap-2 hover:shadow-lg transition-shadow">
            {added ? "Added!" : "Add to Bag"}
            <span className="material-symbols-outlined">{added ? "check" : "arrow_forward"}</span>
          </button>
        </div>
      </div>

      <StickyAddToBag added={added} onClick={handleAddToBag} />

      {/* Application Ritual */}
      <section className="bg-surface-container-low py-section-gap mt-section-gap rounded-3xl">
        <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop">
          <h2 className="font-headline-md text-headline-md text-center mb-16">
            Application Ritual
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {["Prep", "Select", "Apply"].map((step, i) => (
              <div key={i} className="text-center space-y-4">
                <span className="inline-flex w-16 h-16 items-center justify-center rounded-full bg-primary-container text-primary font-display-lg text-[28px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-headline-sm text-on-surface">{step}</h3>
                <p className="font-body-lg text-on-surface-variant">
                  {i === 0 &&
                    "Cleanse and buff your natural nails. Push back cuticles for a seamless fit."}
                  {i === 1 &&
                    "Choose the correct size for each nail. The number is printed on each tip."}
                  {i === 2 &&
                    "Apply a thin layer of glue, press firmly for 10 seconds. Avoid water for 1 hour."}
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
            Complete the Look
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

function LashesDetails({ product, related, onImageClick }) {
  const images = product.images || [];
  const specs = product.specs || [];
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const handleAddToBag = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image });
    setAdded(true);
    toast.success("Added to bag!");
    setTimeout(() => setAdded(false), 2000);
  };

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

          <Accordion title="Lash Care Guide">
            <ol className="space-y-3 text-sm md:text-body-lg text-on-surface-variant list-decimal list-inside">
              <li>Gently remove lashes from tray using tweezers, starting from the outer corner.</li>
              <li>Apply a thin, even line of lash adhesive along the band. Wait 30 seconds until tacky.</li>
              <li>Place the lash band as close to your natural lash line as possible. Press gently for 15 seconds.</li>
              <li>After wear, peel off carefully and remove residual adhesive. Store in original tray to maintain shape.</li>
            </ol>
          </Accordion>

          <button type="button" onClick={handleAddToBag}
            className="hidden md:flex w-full bg-primary-container text-on-primary-fixed rounded-full py-5 font-label-md uppercase tracking-[0.2em] items-center justify-center gap-2 soft-glow hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined">{added ? "check" : "shopping_bag"}</span>
            {added ? "Added!" : "Add to Bag"}
          </button>
        </div>
      </div>

      {/* Complete the Look */}
      {related.length > 0 && (
        <section className="mt-12 md:mt-section-gap">
          <h2 className="font-headline-md text-headline-md text-center mb-6 md:mb-12">Complete the Look</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-gutter">
            {related.map((p) => (
              <ProductCard key={p.id} id={p.id} name={p.name} category={p.category} price={p.price} image={p.image} link={`/product/${p.id}`} />
            ))}
          </div>
        </section>
      )}

      <StickyAddToBag added={added} onClick={handleAddToBag} />
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
        <p className="font-headline-md text-on-surface-variant">Product not found.</p>
      </main>
    );
  }

  const breadcrumbItems = [
    { label: "Shop", link: "/collections" },
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

      <ImageZoomModal
        isOpen={zoom.open}
        onClose={closeZoom}
        src={zoom.src}
        alt={zoom.alt}
      />
    </main>
  );
}
