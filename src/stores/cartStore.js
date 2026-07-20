import { create } from "zustand";
import { persist } from "zustand/middleware";

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      discount: null,

      addItem: (product) => {
        const { items } = get();
        const exists = items.find((i) => i.id === product.id);
        if (exists) {
          set({
            items: items.map((i) =>
              i.id === product.id ? { ...i, qty: i.qty + 1 } : i
            ),
          });
        } else {
          set({ items: [...items, { ...product, qty: 1 }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQty: (id, qty) => {
        if (qty < 1) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, qty } : i
          ),
        });
      },

      clearCart: () => set({ items: [], discount: null }),

      applyDiscount: (code, discount) => {
        set({ discount: { code, ...discount } });
      },

      removeDiscount: () => set({ discount: null }),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + (i.sale_price || i.price) * i.qty, 0),

      shippingCost: () => {
        const sub = get().subtotal();
        return sub >= 75 ? 0 : 12;
      },

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
        return (sub - disc) * 0.08;
      },

      total: () => {
        return (
          get().subtotal() -
          get().discountAmount() +
          get().shippingCost() +
          get().tax()
        );
      },

      itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: "dl-cart" }
  )
);

export default useCartStore;
