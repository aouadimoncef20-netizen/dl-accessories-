import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useWishlistStore from "../stores/wishlistStore";
import { formatDZD } from "../lib/currency";

const PLACEHOLDER = "/placeholder-product.svg";

function imgSrc(url) {
  if (!url) return PLACEHOLDER;
  try { return encodeURI(decodeURI(url)); } catch { return encodeURI(url); }
}

export default function ProductCard({
  id,
  name,
  category,
  price,
  salePrice,
  isPack,
  image,
  link,
}) {
  const navigate = useNavigate();
  const { isSaved, toggleItem } = useWishlistStore();
  const liked = isSaved(id);

  // A sale price only counts when it is actually lower — otherwise the card
  // would advertise a "discount" that costs the customer more.
  const onSale =
    typeof salePrice === "number" && salePrice > 0 && salePrice < price;
  const charged = onSale ? salePrice : price;
  const percentOff = onSale ? Math.round((1 - salePrice / price) * 100) : 0;

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
        <Link to={link || `/product/${id}`}>
          {image ? (
            <img
              src={imgSrc(image)}
              alt={name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              onError={(e) => { e.target.src = PLACEHOLDER; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl">image</span>
            </div>
          )}
        </Link>

        {/* The two things worth saying before a click: it's on sale, and it's
            a set rather than one piece. */}
        {(onSale || isPack) && (
          <div className="absolute top-4 left-4 flex flex-col items-start gap-2">
            {onSale && (
              <span className="bg-error text-white text-[10px] font-label-sm uppercase tracking-widest px-2.5 py-1 rounded-full">
                {percentOff > 0 ? `-${percentOff}%` : "Promo"}
              </span>
            )}
            {isPack && (
              <span className="bg-primary text-white text-[10px] font-label-sm uppercase tracking-widest px-2.5 py-1 rounded-full">
                Pack
              </span>
            )}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <motion.button
            type="button"
            onClick={() => navigate(link || `/product/${id}`)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 bg-white/90 backdrop-blur-md text-on-surface rounded-full font-label-md text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-colors soft-glow-shadow"
          >
            Quick View
          </motion.button>
        </div>

        <motion.button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleItem({ id, name, category, price: charged, image });
          }}
          whileTap={{ scale: 0.85 }}
          className={`absolute top-4 right-4 backdrop-blur-md p-2 rounded-full transition-colors ${
            liked
              ? "bg-primary text-white"
              : "bg-white/60 text-primary hover:bg-white"
          }`}
        >
          <span className="material-symbols-outlined">favorite</span>
        </motion.button>
      </div>

      <Link to={link || `/product/${id}`} className="space-y-1 block">
        <p className="text-label-sm text-secondary uppercase tracking-widest">
          {category}
        </p>
        <h3 className="font-headline-sm text-[20px] text-on-surface group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="font-label-md text-on-surface-variant flex items-center gap-2">
          <span className={onSale ? "text-error font-semibold" : ""}>
            {formatDZD(charged)}
          </span>
          {onSale && (
            <span className="line-through text-xs text-outline-variant">
              {formatDZD(price)}
            </span>
          )}
        </p>
      </Link>
    </motion.div>
  );
}
