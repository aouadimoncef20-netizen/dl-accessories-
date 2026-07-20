import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useCartStore from "../stores/cartStore";
import useWishlistStore from "../stores/wishlistStore";
import Breadcrumb from "../Component/Breadcrumb";
import ProductCard from "../Component/ProductCard";
import Newsletter from "../Component/Newsletter";
import SizeGuideModal from "../Component/SizeGuideModal";
import products from "../Data/products";

/* ─────────────────────────────────────────────
   Cross‑sell product pools per category
   ───────────────────────────────────────────── */
const crossSell = {
  Watches: [
    {
      id: "cross-watch-1",
      name: "Solace Chain Bracelet",
      category: "Jewelry",
      price: 120.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD-LauwMQ0Y32VpVswrt6hJJtUuYbJYpVEYYhuxe66FpASAnP_LsKNvohgUeEP97pNPiAF-CFx6RzZ1T6Mz99rn6SResPXhzMFwiVhoCQBy6jhkY5oBB09nlXdN-d2D0lK4c3rAtcXlSbK-6v6H7LzzEu-YevHB6gTMeqqgcPhOnQWYYt-0gNBa0H4HG0XvVQptsubOGHMVB9ie5mXxTSpD7umGUs1XFWrGBLTVGvRRLxwO9xEmWZcf",
    },
    {
      id: "cross-watch-2",
      name: "Aura Hoops",
      category: "Jewelry",
      price: 85.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCrNEqu8iRIMc_4IVnXOqYqoBUUAdrvumYV60xeWgE_ZPZbQEFXy08HNyxz7WB5w3c4BKs_W_J4inOYmRbWHUl9nutxkLKMZIImNXG9HPPyQaLs57oDkQL0UiFj5qYz7KIT5AqXZNmFzpDGf0522XkvLstj46DLf5x_070JCVH0i8rVaDaB9brTVLGDLzORsjYRDHsOJRvxLAwK7ch9sqjCnIj5CisoBEGEqKM2PASQy2i6rTSWg4A-",
    },
    {
      id: "cross-watch-3",
      name: "Petite Muse Bag",
      category: "Collections",
      price: 490.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBlWWnEBmhY07XLxWgnYg-O4sstnA2kD63pshQ0A3k4ppztGQk6lFJ4Z7K0Rs83kkX1aP3OiHhVkrkj7DaE-5ftUgrxXua43KJVcYDptH3AuyIJNN5QSWA4nueYjzxhqhC_38iQmHxZxMDqXDfEXMHrGSBVdgXSixanUPz1Vmh3r_L17FYKFZp5QnACaG84UqdqpIPHCtBjgT5LaKxdMBLPSXzFk_X4enn_PunpfqgzqcukrPSmHRYg",
    },
    {
      id: "cross-watch-4",
      name: "Aurelia Hoops",
      category: "Jewelry",
      price: 88.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBUzB1KeWpQsMcyyCVOGXH6erISiMOlDNPdqwUx_gO0ZNr9XWn-8JGY2QFiupmhQH-PLu_WX2wS9VkWxUFZpqIFbpVqMsfg_4Zg8y-v4DaAwh9IKbPGeuX6InSKkU5oox_UF-wHIE5ypxO8SF4VVM4dffqODn4N1rzNyxzzfS7XDOkkip0Om6qjVLd-PiT1RMJjZQo6ngj9Wp9rd0cnaR7XJO0g5iclCn0YVXN2IOE3rgD1FG5BOuKp",
    },
  ],
  Bracelets: [
    {
      id: "cross-bracelet-1",
      name: "Solace Chain Bracelet",
      category: "Jewelry",
      price: 120.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD-LauwMQ0Y32VpVswrt6hJJtUuYbJYpVEYYhuxe66FpASAnP_LsKNvohgUeEP97pNPiAF-CFx6RzZ1T6Mz99rn6SResPXhzMFwiVhoCQBy6jhkY5oBB09nlXdN-d2D0lK4c3rAtcXlSbK-6v6H7LzzEu-YevHB6gTMeqqgcPhOnQWYYt-0gNBa0H4HG0XvVQptsubOGHMVB9ie5mXxTSpD7umGUs1XFWrGBLTVGvRRLxwO9xEmWZcf",
    },
    {
      id: "cross-bracelet-2",
      name: "Aurelia Hoops",
      category: "Jewelry",
      price: 88.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBUzB1KeWpQsMcyyCVOGXH6erISiMOlDNPdqwUx_gO0ZNr9XWn-8JGY2QFiupmhQH-PLu_WX2wS9VkWxUFZpqIFbpVqMsfg_4Zg8y-v4DaAwh9IKbPGeuX6InSKkU5oox_UF-wHIE5ypxO8SF4VVM4dffqODn4N1rzNyxzzfS7XDOkkip0Om6qjVLd-PiT1RMJjZQo6ngj9Wp9rd0cnaR7XJO0g5iclCn0YVXN2IOE3rgD1FG5BOuKp",
    },
    {
      id: "cross-bracelet-3",
      name: "Ethereal Gold Stacker",
      category: "Rings",
      price: 120.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBCMzPIhCUEHPBOoMKXgl50IfCXQu7fcx1XRN51PAWkfzAgh0JELhu0XS3V_1AIvitKEprtOlxI_Cwguwoc1oxQi0tOyJIt3R1au1N35TJxXBKjd5XKkOT6E91bmCC7oj1BE6YEDMYUwr8bNGipyeFMV1CIIH-y0u_KdZMjW6w8w2OJau0-L2cH8b9-77uUjhTx90ujIFFDmjUztsn32Zme6YHPXGClQX-jvyEOwT5lITFYPheA1555",
    },
    {
      id: "cross-bracelet-4",
      name: "Cloud Silk Lashes",
      category: "Lashes",
      price: 28.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCYIG6gVJKDb3ipN7uh6-kOzf8u9uIAU_Urg6XoggDOW5eyF0uhjqzBjiT6W7y6NJzRaEKjUPXVmJf4RnBZLsTYE53Q4XnrOVE5WcBI78suXMUzuRODnjin_fvfmh7IMKkFsG-G2mrHCGvkoG95YVCLAqPE089JbHozOWrFCV1UCRCMALGduST1KqFtMnVAcTY6gTJy0EPi3EvOhQSBtKSS49iEVJ0PebUoVtb1z_19HHgC1UuRawH1",
    },
  ],
  Rings: [
    {
      id: "cross-ring-1",
      name: "Ethereal Gold Stacker",
      category: "Rings",
      price: 120.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBCMzPIhCUEHPBOoMKXgl50IfCXQu7fcx1XRN51PAWkfzAgh0JELhu0XS3V_1AIvitKEprtOlxI_Cwguwoc1oxQi0tOyJIt3R1au1N35TJxXBKjd5XKkOT6E91bmCC7oj1BE6YEDMYUwr8bNGipyeFMV1CIIH-y0u_KdZMjW6w8w2OJau0-L2cH8b9-77uUjhTx90ujIFFDmjUztsn32Zme6YHPXGClQX-jvyEOwT5lITFYPheA1555",
    },
    {
      id: "cross-ring-2",
      name: "Solace Chain Bracelet",
      category: "Jewelry",
      price: 120.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD-LauwMQ0Y32VpVswrt6hJJtUuYbJYpVEYYhuxe66FpASAnP_LsKNvohgUeEP97pNPiAF-CFx6RzZ1T6Mz99rn6SResPXhzMFwiVhoCQBy6jhkY5oBB09nlXdN-d2D0lK4c3rAtcXlSbK-6v6H7LzzEu-YevHB6gTMeqqgcPhOnQWYYt-0gNBa0H4HG0XvVQptsubOGHMVB9ie5mXxTSpD7umGUs1XFWrGBLTVGvRRLxwO9xEmWZcf",
    },
    {
      id: "cross-ring-3",
      name: "Aura Hoops",
      category: "Jewelry",
      price: 85.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCrNEqu8iRIMc_4IVnXOqYqoBUUAdrvumYV60xeWgE_ZPZbQEFXy08HNyxz7WB5w3c4BKs_W_J4inOYmRbWHUl9nutxkLKMZIImNXG9HPPyQaLs57oDkQL0UiFj5qYz7KIT5AqXZNmFzpDGf0522XkvLstj46DLf5x_070JCVH0i8rVaDaB9brTVLGDLzORsjYRDHsOJRvxLAwK7ch9sqjCnIj5CisoBEGEqKM2PASQy2i6rTSWg4A-",
    },
  ],
  Nails: [
    {
      id: "cross-nails-1",
      name: "Cloud Silk Lashes",
      category: "Lashes",
      price: 28.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCYIG6gVJKDb3ipN7uh6-kOzf8u9uIAU_Urg6XoggDOW5eyF0uhjqzBjiT6W7y6NJzRaEKjUPXVmJf4RnBZLsTYE53Q4XnrOVE5WcBI78suXMUzuRODnjin_fvfmh7IMKkFsG-G2mrHCGvkoG95YVCLAqPE089JbHozOWrFCV1UCRCMALGduST1KqFtMnVAcTY6gTJy0EPi3EvOhQSBtKSS49iEVJ0PebUoVtb1z_19HHgC1UuRawH1",
    },
    {
      id: "cross-nails-2",
      name: "Aurelia Hoops",
      category: "Jewelry",
      price: 88.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBUzB1KeWpQsMcyyCVOGXH6erISiMOlDNPdqwUx_gO0ZNr9XWn-8JGY2QFiupmhQH-PLu_WX2wS9VkWxUFZpqIFbpVqMsfg_4Zg8y-v4DaAwh9IKbPGeuX6InSKkU5oox_UF-wHIE5ypxO8SF4VVM4dffqODn4N1rzNyxzzfS7XDOkkip0Om6qjVLd-PiT1RMJjZQo6ngj9Wp9rd0cnaR7XJO0g5iclCn0YVXN2IOE3rgD1FG5BOuKp",
    },
    {
      id: "cross-nails-3",
      name: "Petite Muse Bag",
      category: "Collections",
      price: 490.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBlWWnEBmhY07XLxWgnYg-O4sstnA2kD63pshQ0A3k4ppztGQk6lFJ4Z7K0Rs83kkX1aP3OiHhVkrkj7DaE-5ftUgrxXua43KJVcYDptH3AuyIJNN5QSWA4nueYjzxhqhC_38iQmHxZxMDqXDfEXMHrGSBVdgXSixanUPz1Vmh3r_L17FYKFZp5QnACaG84UqdqpIPHCtBjgT5LaKxdMBLPSXzFk_X4enn_PunpfqgzqcukrPSmHRYg",
    },
  ],
  Lashes: [
    {
      id: "cross-lashes-1",
      name: "Cloud Silk Lashes",
      category: "Lashes",
      price: 28.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCYIG6gVJKDb3ipN7uh6-kOzf8u9uIAU_Urg6XoggDOW5eyF0uhjqzBjiT6W7y6NJzRaEKjUPXVmJf4RnBZLsTYE53Q4XnrOVE5WcBI78suXMUzuRODnjin_fvfmh7IMKkFsG-G2mrHCGvkoG95YVCLAqPE089JbHozOWrFCV1UCRCMALGduST1KqFtMnVAcTY6gTJy0EPi3EvOhQSBtKSS49iEVJ0PebUoVtb1z_19HHgC1UuRawH1",
    },
    {
      id: "cross-lashes-2",
      name: "Aurelia Hoops",
      category: "Jewelry",
      price: 88.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBUzB1KeWpQsMcyyCVOGXH6erISiMOlDNPdqwUx_gO0ZNr9XWn-8JGY2QFiupmhQH-PLu_WX2wS9VkWxUFZpqIFbpVqMsfg_4Zg8y-v4DaAwh9IKbPGeuX6InSKkU5oox_UF-wHIE5ypxO8SF4VVM4dffqODn4N1rzNyxzzfS7XDOkkip0Om6qjVLd-PiT1RMJjZQo6ngj9Wp9rd0cnaR7XJO0g5iclCn0YVXN2IOE3rgD1FG5BOuKp",
    },
    {
      id: "cross-lashes-3",
      name: "Solace Chain Bracelet",
      category: "Jewelry",
      price: 120.0,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD-LauwMQ0Y32VpVswrt6hJJtUuYbJYpVEYYhuxe66FpASAnP_LsKNvohgUeEP97pNPiAF-CFx6RzZ1T6Mz99rn6SResPXhzMFwiVhoCQBy6jhkY5oBB09nlXdN-d2D0lK4c3rAtcXlSbK-6v6H7LzzEu-YevHB6gTMeqqgcPhOnQWYYt-0gNBa0H4HG0XvVQptsubOGHMVB9ie5mXxTSpD7umGUs1XFWrGBLTVGvRRLxwO9xEmWZcf",
    },
  ],
};

/* ─────────────────────────────────────────────
   Reusable sub‑components
   ───────────────────────────────────────────── */

function Accordion({ title, openByDefault, children }) {
  const [open, setOpen] = useState(!!openByDefault);
  return (
    <div className="border-b border-outline-variant/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-5 text-left font-label-md uppercase tracking-widest text-on-surface"
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
          open ? "max-h-96 pb-5" : "max-h-0"
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

function WatchDetails({ product }) {
  const [activeColor, setActiveColor] = useState(0);
  const colorCodes = product.colors || ["#F6C8D5", "#E5E2E1", "#1C1B1B"];
  const images = product.images || [];
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* ── LEFT – Bento gallery ── */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2 aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[1] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[2] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* ── RIGHT – Product info ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-6">
          <div className="flex items-start justify-between">
            <span className="inline-block bg-primary-container/30 text-primary px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
              New Collection
            </span>
            <button
              type="button"
              aria-label="Share"
              className="w-10 h-10 flex items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>

          <h1 className="font-display-lg">{product.name}</h1>
          <p className="font-headline-sm text-headline-sm text-primary">
            ${product.price.toFixed(2)}
          </p>
          <p className="font-body-lg text-on-surface-variant leading-relaxed">
            {product.description}
          </p>

          {/* Color / Finish selector */}
          <div className="space-y-3">
            <p className="font-label-sm uppercase tracking-widest text-on-surface">
              Finish: Rose Gold
            </p>
            <div className="flex flex-wrap gap-3">
              {colorCodes.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Color ${i + 1}`}
                  onClick={() => setActiveColor(i)}
                  className={`w-8 h-8 rounded-full transition-shadow ${
                    i === activeColor
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:ring-2 hover:ring-outline-variant hover:ring-offset-2"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Add to Bag */}
          <button
            type="button"
            onClick={() => {
              addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image, variant: `Finish: Rose Gold` });
              navigate("/cart");
            }}
            className="w-full py-5 bg-primary-container text-on-primary-fixed font-label-md rounded-full soft-glow uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            Add to Bag
          </button>

          <p className="text-center font-label-sm text-secondary tracking-widest uppercase">
            <span className="material-symbols-outlined text-[16px] align-middle mr-1">
              local_shipping
            </span>
            Complimentary shipping
          </p>

          {/* Accordion sections */}
          <Accordion title="Materials & Origin">
            <ul className="space-y-2 font-body-lg text-on-surface-variant list-disc list-inside">
              {(product.details || []).map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </Accordion>
          <Accordion title="Care Instructions">
            <p className="font-body-lg text-on-surface-variant italic">
              Gently wipe with the included microfiber cloth after each wear.
              Avoid contact with water and perfumes. Store in a cool, dry place
              to preserve the finish and luster.
            </p>
          </Accordion>
        </div>
      </div>

      {/* You may also like */}
      <section className="mt-section-gap">
        <h2 className="font-headline-md text-headline-md text-center mb-12">
          You may also like
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {crossSell.Watches.map((p) => (
            <ProductCard key={p.id} {...p} link={`/product/${p.id}`} />
          ))}
        </div>
      </section>
    </>
  );
}

function BraceletDetails({ product }) {
  const images = product.images || [];
  const features = product.features || [];
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* ── LEFT – Bento gallery ── */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2 aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[1] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[2] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* ── RIGHT – Product info ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-6">
          {product.badge && (
            <span className="inline-block bg-primary-container/30 text-primary px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
              {product.badge}
            </span>
          )}

          <h1 className="font-display-lg">{product.name}</h1>
          <p className="font-headline-sm text-primary">
            ${product.price.toFixed(2)}
          </p>
          <p className="font-body-lg text-on-surface-variant leading-relaxed">
            {product.description}
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-3">
            {features.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container rounded-full border border-outline-variant/30 font-label-sm text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {f.icon}
                </span>
                {f.label}
              </span>
            ))}
          </div>

          {/* Buttons row */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image });
                navigate("/cart");
              }}
              className="flex-1 py-5 bg-primary-container text-on-primary-fixed font-label-md rounded-full soft-glow uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined">shopping_bag</span>
              Add to Bag
            </button>
            <button
              type="button"
              aria-label="Add to wishlist"
              className="w-16 h-16 flex items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined">favorite</span>
            </button>
          </div>

          <p className="text-center font-label-sm text-secondary tracking-widest uppercase">
            <span className="material-symbols-outlined text-[16px] align-middle mr-1">
              local_shipping
            </span>
            Free Shipping
          </p>

          {/* Collapsible details */}
          <Accordion title="Materials & Origin" openByDefault>
            <p className="font-body-lg text-on-surface-variant leading-relaxed">
              {product.materials}
            </p>
          </Accordion>
          <Accordion title="Shipping & Care">
            <p className="font-body-lg text-on-surface-variant leading-relaxed">
              {product.shipping}
            </p>
          </Accordion>
        </div>
      </div>

      {/* Complete the look */}
      <section className="mt-section-gap">
        <h2 className="font-headline-md text-headline-md text-center mb-12">
          Complete the look
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {crossSell.Bracelets.map((p) => (
            <ProductCard key={p.id} {...p} link={`/product/${p.id}`} />
          ))}
        </div>
      </section>
    </>
  );
}

function RingDetails({ product }) {
  const images = product.images || [];
  const specs = product.specs || [];
  const sizes = product.sizes || ["4", "5", "6", "7", "8"];
  const [activeSize, setActiveSize] = useState(sizes[0]);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* ── LEFT – Bento gallery ── */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2 aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[1] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[2] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* ── RIGHT – Product info ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-6">
          <span className="inline-block bg-primary-container/30 text-primary px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
            Fine Jewelry
          </span>

          <h1 className="font-headline-md">{product.name}</h1>
          <p className="font-headline-sm text-primary">
            ${product.price.toFixed(2)}
          </p>
          <p className="font-body-lg text-on-surface-variant leading-relaxed">
            {product.description}
          </p>

          {/* Specs grid */}
          <div className="grid grid-cols-1 gap-3 py-6 border-y border-outline-variant/30">
            {specs.map((s, i) => (
              <div
                key={i}
                className="flex justify-between font-body-lg"
              >
                <span className="text-on-surface-variant">{s.label}</span>
                <span className="text-on-surface font-medium">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Size selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-label-sm uppercase tracking-widest text-on-surface">
                Select Size
              </p>
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="font-label-sm text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                Sizing Guide
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveSize(s)}
                  className={`w-12 h-12 rounded-full font-label-md flex items-center justify-center transition-colors ${
                    s === activeSize
                      ? "border-primary text-primary bg-primary-container"
                      : "border border-outline-variant/50 text-on-surface-variant hover:border-outline-variant"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Add to Bag */}
          <button
            type="button"
            onClick={() => {
              addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image, variant: `Size ${activeSize}` });
              navigate("/cart");
            }}
            className="w-full py-5 bg-primary-container text-on-primary-container rounded-full shadow-lg font-label-md uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            Add to Bag
          </button>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-8 pt-2">
            <span className="flex items-center gap-1.5 font-label-sm text-on-surface-variant uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px] text-primary">
                verified
              </span>
              Lifetime Warranty
            </span>
            <span className="flex items-center gap-1.5 font-label-sm text-on-surface-variant uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px] text-primary">
                rocket_launch
              </span>
              Free Express Shipping
            </span>
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <Newsletter />

      {/* The Art of Stacking */}
      <section className="mt-section-gap">
        <h2 className="font-headline-md text-headline-md text-center mb-12">
          The Art of Stacking
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {crossSell.Rings.map((p) => (
            <ProductCard key={p.id} {...p} link={`/product/${p.id}`} />
          ))}
        </div>
      </section>

      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </>
  );
}

function NailsDetails({ product }) {
  const images = product.images || [];
  const specs = product.specs || [];
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* ── LEFT – Asymmetric bento gallery ── */}
        <div className="lg:col-span-7 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-8 aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="col-span-6 md:col-span-4 aspect-[1/1.2] mt-0 md:mt-12 rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[1] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="col-span-6 md:col-span-4 aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[2] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="col-span-12 md:col-span-8 aspect-[16/9] rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[3] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* ── RIGHT – Product info ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-6">
          <span className="inline-block opacity-70 bg-primary-container/30 text-primary px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-label-sm">
            New Collection
          </span>

          <h1 className="font-display-lg">{product.name}</h1>
          <p className="font-headline-sm text-primary">
            ${product.price.toFixed(2)}
          </p>
          <p className="font-body-lg text-on-surface-variant leading-relaxed">
            {product.description}
          </p>

          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-4 py-6 border-y border-outline-variant/30">
            {specs.map((s, i) =>
              s.fullWidth ? (
                <div key={i} className="col-span-2">
                  <p className="font-label-sm text-on-surface-variant uppercase tracking-widest mb-1">
                    {s.label}
                  </p>
                  <p className="font-body-lg text-on-surface">{s.value}</p>
                </div>
              ) : (
                <div key={i}>
                  <p className="font-label-sm text-on-surface-variant uppercase tracking-widest mb-1">
                    {s.label}
                  </p>
                  <p className="font-body-lg text-on-surface">{s.value}</p>
                </div>
              )
            )}
          </div>

          {/* Add to Bag */}
          <button
            type="button"
            onClick={() => {
              addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image });
              navigate("/cart");
            }}
            className="w-full bg-primary-container text-primary h-14 rounded-full font-label-md uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:shadow-lg transition-shadow"
          >
            Add to Bag
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          {/* Size Guide */}
          <button
            type="button"
            className="w-full bg-white border border-outline-variant text-secondary h-14 rounded-full font-label-md uppercase tracking-widest hover:bg-surface-container-low transition-colors"
          >
            Size Guide
          </button>

          {/* Benefits */}
          <div className="space-y-3 pt-2">
            <p className="flex items-center gap-2 font-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-[18px]">
                replay
              </span>
              Reusable up to 5 times
            </p>
            <p className="flex items-center gap-2 font-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-[18px]">
                local_shipping
              </span>
              Complimentary shipping over $75
            </p>
          </div>
        </div>
      </div>

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
      <section className="mt-section-gap">
        <h2 className="font-headline-md text-headline-md text-center mb-12">
          Complete the Look
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {crossSell.Nails.map((p) => (
            <ProductCard key={p.id} {...p} link={`/product/${p.id}`} />
          ))}
        </div>
      </section>
    </>
  );
}

function LashesDetails({ product }) {
  const images = product.images || [];
  const specs = product.specs || [];
  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const navigate = useNavigate();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* ── LEFT – Bento gallery ── */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
          <div className="col-span-2 aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container-low relative">
            <img
              src={images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm text-on-surface px-3 py-1 rounded-full font-label-sm text-[11px] uppercase tracking-widest">
              Editorial Look 01
            </span>
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[1] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
            <img
              src={images[2] || images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* ── RIGHT – Product info ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-6">
          <h1 className="font-display-lg">{product.name}</h1>
          <p className="font-headline-sm text-primary">
            ${product.price.toFixed(2)}
          </p>

          {/* Specs bar */}
          <div className="flex gap-8 border-y border-outline-variant/30 py-6">
            {specs.map((s, i) => (
              <div key={i} className="flex flex-col">
                <span className="font-label-sm text-on-surface-variant uppercase tracking-widest">
                  {s.label}
                </span>
                <span className="font-headline-sm text-on-surface">
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          <p className="font-body-lg text-on-surface-variant leading-relaxed">
            {product.description}
          </p>

          {/* Add to Bag */}
          <button
            type="button"
            onClick={() => {
              addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image });
              navigate("/cart");
            }}
            className="w-full bg-primary-container text-on-primary-fixed rounded-full py-5 font-label-md uppercase tracking-[0.2em] flex items-center justify-center gap-2 soft-glow hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            Add to Bag
          </button>

          {/* Wishlist */}
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            className="w-full bg-white border border-outline-variant text-secondary rounded-full py-5 font-label-md uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined">favorite</span>
            Add to Wishlist
          </button>

          {/* Accordion: Lash Care Guide */}
          <Accordion title="Lash Care Guide">
            <ol className="space-y-3 font-body-lg text-on-surface-variant list-decimal list-inside">
              <li>
                Gently remove lashes from tray using tweezers, starting from
                the outer corner.
              </li>
              <li>
                Apply a thin, even line of lash adhesive along the band. Wait
                30 seconds until tacky.
              </li>
              <li>
                Place the lash band as close to your natural lash line as
                possible. Press gently for 15 seconds.
              </li>
              <li>
                After wear, peel off carefully and remove residual adhesive.
                Store in original tray to maintain shape.
              </li>
            </ol>
          </Accordion>

          <Accordion title="Shipping & Returns">
            <p className="font-body-lg text-on-surface-variant">
              Standard shipping takes 3-5 business days. Express shipping
              available at checkout. Returns accepted within 30 days for
              unopened products in original packaging.
            </p>
          </Accordion>
        </div>
      </div>

      {/* Complete the Look */}
      <section className="mt-section-gap">
        <h2 className="font-headline-md text-headline-md text-center mb-12">
          Complete the Look
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {crossSell.Lashes.map((p) => (
            <div key={p.id}>
              <ProductCard {...p} link={`/product/${p.id}`} />
              <button
                type="button"
                className="mt-4 w-full py-3 bg-white border border-outline-variant rounded-full font-label-sm uppercase tracking-widest text-secondary hover:bg-surface-container-low transition-colors"
              >
                Add Bundle +
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────
   Router / entry point
   ───────────────────────────────────────────── */

export default function ProductDetails() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto text-center">
        <p className="font-headline-md text-on-surface-variant">
          Product not found.
        </p>
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
      <Breadcrumb items={breadcrumbItems} />

      {product.category === "Watches" && <WatchDetails product={product} />}
      {product.category === "Bracelets" && <BraceletDetails product={product} />}
      {product.category === "Rings" && <RingDetails product={product} />}
      {product.category === "Nails" && <NailsDetails product={product} />}
      {product.category === "Lashes" && <LashesDetails product={product} />}
    </main>
  );
}
