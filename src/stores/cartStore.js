import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deliveryFor, taxFor } from "../lib/shipping";

/**
 * One line of the bag. Two bracelets in different colours are two lines, not
 * "2 × bracelet" — the packer needs to know which colour to put in the box.
 * Older saved carts have no `lineId`, so it is derived on the way in.
 */
export function lineKey(item) {
  return item?.lineId || `${item?.id}::${item?.variant || ""}`;
}

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      discount: null,
      // Gift wrapping is a free service here, but the request still has to
      // travel with the order — the packer is the one who acts on it. It lives
      // in the basket (not in the cart page's own state) so it survives the
      // walk to checkout and doesn't reset when the customer goes back.
      giftWrap: false,

      // Returns { ok } or { ok: false, reason, available } so the product
      // page can tell the customer why nothing happened.
      //
      // The stock check only runs when we actually know the number. Cards that
      // don't fetch stock (and items restored from an older saved cart) still
      // add normally rather than being blocked by a guess.
      //
      // `product.stock` is the number that applies to *this* choice: for a
      // product counted by colour and size, the product page passes the stock
      // of the combination the customer clicked, not the shop-wide total.
      addItem: (product, qty = 1) => {
        const { items } = get();
        const wanted = Math.max(1, Number(qty) || 1);
        const key = `${product.id}::${product.variant || ""}`;
        const exists = items.find((i) => lineKey(i) === key);

        // Prefer the stock on the incoming product, fall back to what the cart
        // already recorded for it.
        const known =
          typeof product.stock === "number" ? product.stock : exists?.stock;
        const limit = typeof known === "number" ? known : null;
        const inCart = exists?.qty || 0;

        if (limit !== null && inCart + wanted > limit) {
          return {
            ok: false,
            reason: limit === 0 ? "out_of_stock" : "not_enough",
            available: Math.max(0, limit - inCart),
          };
        }

        if (exists) {
          set({
            items: items.map((i) =>
              lineKey(i) === key
                ? { ...i, ...product, qty: i.qty + wanted }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...product, lineId: key, qty: wanted }] });
        }
        return { ok: true };
      },

      removeItem: (key) => {
        set({ items: get().items.filter((i) => lineKey(i) !== key) });
      },

      updateQty: (key, qty) => {
        if (qty < 1) {
          get().removeItem(key);
          return { ok: true };
        }
        const item = get().items.find((i) => lineKey(i) === key);
        const limit = typeof item?.stock === "number" ? item.stock : null;
        if (limit !== null && qty > limit) {
          return { ok: false, reason: "not_enough", available: limit };
        }
        set({
          items: get().items.map((i) =>
            lineKey(i) === key ? { ...i, qty } : i
          ),
        });
        return { ok: true };
      },

      clearCart: () => set({ items: [], discount: null, giftWrap: false }),

      setGiftWrap: (on) => set({ giftWrap: on === true }),

      // A coupon the checkout has checked. `discount_percent` and
      // `discount_amount` are the two shapes the summary understands; the
      // place_order() RPC checks the code again on the server.
      setDiscount: (discount) => set({ discount: discount || null }),
      clearDiscount: () => set({ discount: null }),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + (i.sale_price || i.price) * i.qty, 0),

      // Delivery and tax come from src/lib/shipping.js — one file sets both,
      // so the basket, the cart summary and the checkout can't disagree.
      //
      // The checkout now prices its three delivery modes with
      // `deliveryForCheckout` (also in shipping.js); this method is kept for
      // the older wilaya/point pair. Called with nothing (the basket page),
      // it returns null, which the summary shows as "calculated at checkout"
      // rather than pretending delivery is free.
      shippingCost: (wilayaCode, pointCode) =>
        deliveryFor(get().subtotal(), wilayaCode, pointCode),

      discountAmount: () => {
        const d = get().discount;
        if (!d) return 0;
        const sub = get().subtotal();
        // A code with a minimum spend stops being a discount the moment the
        // basket falls below that spend — place_order() refuses the order
        // outright in that case, so showing the discount here would promise a
        // price the server will not charge.
        if (Number(d.min_subtotal) > 0 && sub < Number(d.min_subtotal)) return 0;
        const raw = d.discount_percent
          ? sub * (d.discount_percent / 100)
          : d.discount_amount || 0;
        // A fixed-amount code can be worth more than the basket. place_order()
        // clamps the discount to the subtotal, so the number on screen must be
        // clamped the same way or the customer is shown a total the server
        // will never charge.
        return Math.min(Math.max(0, raw), Math.max(0, sub));
      },

      tax: () => {
        const sub = get().subtotal();
        const disc = get().discountAmount();
        return taxFor(Math.max(0, sub - disc));
      },

      total: (wilayaCode, pointCode) => {
        return (
          get().subtotal() -
          get().discountAmount() +
          (get().shippingCost(wilayaCode, pointCode) || 0) +
          get().tax()
        );
      },

      itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: "dl-cart" }
  )
);

export default useCartStore;
