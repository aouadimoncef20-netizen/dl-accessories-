import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useWishlistStore from "../stores/wishlistStore";
import { formatDZD } from "../lib/currency";

function imgSrc(url) {
  if (!url) return "";
  try { return encodeURI(decodeURI(url)); } catch { return encodeURI(url); }
}

export default function HomeProductCard({ product, link }) {
  const navigate = useNavigate();
  const { isSaved, toggleItem } = useWishlistStore();
  const liked = isSaved(product.id);
  const [imgError, setImgError] = useState(false);

  const productLink = link || `/product/${product.id}`;
  const hasDiscount = product.discount > 0;
  const displayPrice = product.sale_price || product.price;

  // Helper to get the primary image
  const primaryImage = product.image;

  return (
    <motion.div
      className="group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative aspect-[4/5] bg-surface-container-low rounded-xl overflow-hidden mb-6">
        <Link to={productLink}>
          {imgError ? (
            <div className="w-full h-full flex items-center justify-center bg-surface-container-low text-secondary">
              <span className="material-symbols-outlined text-3xl">image</span>
            </div>
          ) : (
            <img
              src={imgSrc(primaryImage)}
              alt={product.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
          )}
        </Link>

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-error text-on-error text-[10px] font-label-sm uppercase tracking-widest px-2 py-1 rounded-full">
            -{product.discount}%
          </span>
        )}

        {/* Quick View */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <motion.button
            type="button"
            onClick={() => navigate(productLink)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 bg-white/90 backdrop-blur-md text-on-surface rounded-full font-label-md text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-colors soft-glow-shadow"
          >
            Quick View
          </motion.button>
        </div>

        {/* Favorite */}
        <motion.button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleItem({
              id: product.id,
              name: product.name,
              category: product.category,
              price: displayPrice,
              image: primaryImage,
            });
          }}
          whileTap={{ scale: 0.85 }}
          className={`absolute top-3 right-3 backdrop-blur-md p-2 rounded-full transition-colors ${
            liked
              ? "bg-primary text-white"
              : "bg-white/60 text-primary hover:bg-white"
          }`}
        >
          <span className="material-symbols-outlined text-sm">favorite</span>
        </motion.button>
      </div>

      <Link to={productLink} className="space-y-1 block">
        <p className="text-label-sm text-secondary uppercase tracking-widest">
          {product.category || product.brand || "Accessories"}
        </p>
        <h3 className="font-headline-sm text-[20px] text-on-surface group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          {hasDiscount ? (
            <>
              <p className="font-label-md text-primary">
                {formatDZD(displayPrice)}
              </p>
              <p className="font-label-sm text-secondary line-through">
                {formatDZD(product.price)}
              </p>
            </>
          ) : (
            <p className="font-label-md text-on-surface-variant">
              {formatDZD(displayPrice)}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
