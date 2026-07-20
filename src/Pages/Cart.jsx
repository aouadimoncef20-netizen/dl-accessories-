import { useState } from "react";
import { Link } from "react-router-dom";
import useCartStore from "../stores/cartStore";
import PageTransition from "../Component/PageTransition";
import CartItem from "../Component/CartItem";
import OrderSummary from "../Component/OrderSummary";

function Cart() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const subtotal = useCartStore((s) => s.subtotal());
  const [giftWrap, setGiftWrap] = useState(false);

  return (
    <PageTransition>
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="mb-12">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-2">Shopping Bag</h1>
        <p className="text-on-surface-variant font-body-md">
          {items.length} item{items.length !== 1 ? "s" : ""} in your cart.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">shopping_bag</span>
          <p className="font-headline-sm text-on-surface-variant mb-2">Your bag is empty</p>
          <Link to="/collections" className="inline-block mt-6 px-10 py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90">Shop Now</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-0">
              {items.map((item) => (
                <CartItem key={item.id} id={item.id} name={item.name} image={item.images?.[0] || item.image} price={item.sale_price || item.price} variant={item.variant} qty={item.qty} onUpdateQty={updateQty} onRemove={removeItem} />
              ))}
            </div>
            <div className="bg-primary-container/20 p-4 md:p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-primary-container/40">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-primary text-[28px] shrink-0">redeem</span>
                <div>
                  <p className="font-label-md text-primary">Add Gift Wrapping</p>
                  <p className="text-on-surface-variant text-label-sm">Complimentary silk ribbon and luxury box.</p>
                </div>
              </div>
              <button onClick={() => setGiftWrap(!giftWrap)} className={`px-4 py-2 rounded-full font-label-sm border transition-all active:scale-95 ${giftWrap ? "bg-primary text-white border-primary" : "bg-white border-outline-variant/20 hover:shadow-sm"}`}>{giftWrap ? "Added ✓" : "Add"}</button>
            </div>
          </div>
          <aside className="lg:col-span-4 space-y-6">
            <OrderSummary subtotal={subtotal} />
            <div className="bg-surface-container p-6 rounded-xl flex flex-col items-center text-center">
              <p className="font-label-md mb-2">Need help with your order?</p>
              <p className="text-on-surface-variant text-label-sm mb-4">Our concierge is available Mon-Fri, 9am-6pm PST.</p>
              <Link to="/contact" className="text-primary font-label-md underline underline-offset-4 decoration-primary-container hover:text-on-primary-container transition-colors">Contact Concierge</Link>
            </div>
          </aside>
        </div>
      )}
    </div>
    </PageTransition>
  );
}

export default Cart;
