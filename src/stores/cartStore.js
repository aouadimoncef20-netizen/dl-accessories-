import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deliveryFor, taxFor } from "../lib/shipping";

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      discount: null,

      // Returns { ok } or { ok: false, reason, available } so the product
      // page can tell the customer why nothing happened.
      //
      // The stock check only runs when we actually know the number. Cards that
      // don't fetch stock (and items restored from an older saved cart) still
      // add normally rather than being blocked by a guess.
      addItem: (product, qty = 1) => {
        const { items } = get();
        const wanted = Math.max(1, Number(qty) || 1);
        const exists = items.find((i) => i.id === product.id);

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
              i.id === product.id
                ? { ...i, ...product, qty: i.qty + wanted }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...product, qty: wanted }] });
        }
        return { ok: true };
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQty: (id, qty) => {
        if (qty < 1) {
          get().removeItem(id);
          return { ok: true };
        }
        const item = get().items.find((i) => i.id === id);
        const limit = typeof item?.stock === "number" ? item.stock : null;
        if (limit !== null && qty > limit) {
          return { ok: false, reason: "not_enough", available: limit };
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, qty } : i
          ),
        });
        return { ok: true };
      },

      clearCart: () => set({ items: [], discount: null }),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + (i.sale_price || i.price) * i.qty, 0),

      // Delivery and tax come from src/lib/shipping.js — one file sets both,
      // so the basket, the cart summary and the checkout can't disagree.
      //
      // Delivery is priced by wilaya, so the checkout's wilaya code is passed
      // in. The basket page has no address yet and passes nothing, which
      // makes this null — the summary says "calculated at checkout" rather
      // than pretending the customer gets delivery for nothing.
      // `pointCode` is a free-delivery point (a campus, Réghaïa) — see
      // FREE_DELIVERY_POINTS in the same file. Either way, the checkout form
      // is where both values come from.
      shippingCost: (wilayaCode, pointCode) =>
        deliveryFor(get().subtotal(), wilayaCode, pointCode),

      discountAmount: () => {
        const d = get().discount;
        if (!d) return 0;
        const sub = get().subtotal();
        if (d.discount_percent) return sub * (d.discount_percent / 100);
        return d.discount_amount || 0;
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
