import { Link } from "react-router-dom";
import { formatDZD } from "../lib/currency";

function OrderSummary({ subtotal, showCheckoutButton = true }) {
  const shipping = subtotal >= 75 ? 0 : 12.0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <div className="bg-white p-8 rounded-xl soft-glow border border-surface-container">
      <h2 className="font-headline-sm text-headline-sm mb-6">Order Summary</h2>
      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-on-surface-variant">
          <span className="font-body-md">Subtotal</span>
          <span className="font-body-md">{formatDZD(subtotal)}</span>
        </div>
        <div className="flex justify-between text-on-surface-variant">
          <span className="font-body-md">Estimated Shipping</span>
          <span className="font-body-md">{shipping === 0 ? "Free" : formatDZD(shipping)}</span>
        </div>
        <div className="flex justify-between text-on-surface-variant">
          <span className="font-body-md">Estimated Taxes</span>
          <span className="font-body-md">{formatDZD(tax)}</span>
        </div>
      </div>
      <div className="pt-6 border-t border-outline-variant/20 mb-8 flex justify-between items-end">
        <span className="font-headline-sm text-headline-sm">Total</span>
        <span className="font-display-lg text-display-lg-mobile text-primary">{formatDZD(total)}</span>
      </div>
      {showCheckoutButton && (
        <>
          <Link
            to="/checkout"
            className="w-full bg-primary-container text-on-background py-5 rounded-full font-label-md tracking-wider hover:opacity-90 transition-all active:scale-95 mb-4 uppercase flex items-center justify-center"
          >
            Checkout Securely
          </Link>
          <button className="w-full bg-white text-on-surface border border-outline-variant/30 py-4 rounded-full font-label-md hover:bg-surface transition-all mb-8 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            Apple Pay
          </button>
        </>
      )}
      {/* Trust signals */}
      <div className="space-y-4 pt-4 border-t border-outline-variant/10">
        {[
          { icon: "verified_user", text: "Secure 256-bit SSL encrypted checkout" },
          { icon: "local_shipping", text: "Free carbon-neutral shipping on all orders" },
          { icon: "published_with_changes", text: "Easy 30-day returns and exchanges" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px] text-primary">{item.icon}</span>
            <span className="text-label-sm">{item.text}</span>
          </div>
        ))}
      </div>
      {showCheckoutButton && (
        <div className="mt-8 flex justify-center gap-4 grayscale opacity-40">
          <span className="material-symbols-outlined">payments</span>
          <span className="material-symbols-outlined">credit_card</span>
          <span className="material-symbols-outlined">account_balance</span>
        </div>
      )}
    </div>
  );
}

export default OrderSummary;
