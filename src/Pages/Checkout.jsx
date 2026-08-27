import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useCartStore from "../stores/cartStore";
import SEO from "../Component/SEO";
import { formatDZD } from "../lib/currency";

function Checkout() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    state: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.state.trim()) errs.state = "State is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSubmitting(false);
    clearCart();
    navigate("/order-confirmed", { state: { form } });
  };

  const shippingCost = 0;
  const total = subtotal + shippingCost;

  return (
    <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEO title="Checkout" description="Complete your purchase." />

      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-10">
        Checkout
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* Left: Form */}
          <div className="lg:col-span-7 space-y-8">
            {/* Contact Information */}
            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                Your Information
              </h2>
              <div className="space-y-4">
                <div>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    className={`w-full form-input font-body-md ${errors.fullName ? "border-error" : ""}`}
                    placeholder="Full Name"
                    type="text"
                  />
                  {errors.fullName && <p className="text-error text-sm mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className={`w-full form-input font-body-md ${errors.phone ? "border-error" : ""}`}
                    placeholder="Phone Number"
                    type="tel"
                  />
                  {errors.phone && <p className="text-error text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>
            </section>

            {/* Delivery Address */}
            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                Delivery Address
              </h2>
              <div className="space-y-4">
                <div>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className={`w-full form-input font-body-md ${errors.address ? "border-error" : ""}`}
                    placeholder="Street Address"
                    type="text"
                  />
                  {errors.address && <p className="text-error text-sm mt-1">{errors.address}</p>}
                </div>
                <div>
                  <input
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className={`w-full form-input font-body-md ${errors.state ? "border-error" : ""}`}
                    placeholder="State / Wilaya"
                    type="text"
                  />
                  {errors.state && <p className="text-error text-sm mt-1">{errors.state}</p>}
                </div>
              </div>
            </section>

            {/* Payment */}
            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                Payment
              </h2>
              <div className="flex items-center gap-4 p-5 border border-primary/30 bg-primary-container/10 rounded-xl">
                <span className="material-symbols-outlined text-primary text-[28px]">paid</span>
                <div>
                  <p className="font-label-md text-on-surface">Cash on Delivery</p>
                  <p className="text-sm text-secondary">Pay when you receive your order</p>
                </div>
              </div>
            </section>

            {/* Navigation buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
              <Link
                to="/cart"
                className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">chevron_left</span>
                Return to cart
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-container text-on-primary-container font-label-md uppercase tracking-widest py-4 px-12 rounded-full shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[220px]"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-on-primary-container border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Place Order"
                )}
              </button>
            </div>
          </div>

          {/* Right: Order Summary */}
          <aside className="lg:col-span-5 lg:sticky lg:top-32">
            <div className="glass-summary rounded-3xl p-8 border border-white/40 shadow-sm">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-8">
                Order Summary
              </h2>
              <div className="space-y-6 mb-8 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {items.length > 0 ? (
                  items.map((item) => (
                    <div key={item.id} className="flex items-center gap-6 group">
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-white overflow-hidden border border-outline-variant/30">
                          <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
                        </div>
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-secondary text-white text-[10px] flex items-center justify-center rounded-full">
                          {item.qty}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-label-md text-on-surface">{item.name}</h3>
                        {item.variant && <p className="font-label-sm text-secondary">{item.variant}</p>}
                      </div>
                      <span className="font-label-md text-primary">{formatDZD(item.price * item.qty)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-secondary text-center py-8">Your cart is empty.</p>
                )}
              </div>
              <div className="space-y-4 pt-8 border-t border-outline-variant/20">
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-secondary">Subtotal</span>
                  <span className="text-on-surface">{formatDZD(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-secondary">Shipping</span>
                  <span className="text-on-surface">Free</span>
                </div>
                <div className="flex justify-between items-center pt-6 mt-4 border-t border-outline-variant/50">
                  <span className="font-headline-sm text-headline-sm">Total</span>
                  <div className="text-right">
                    <span className="text-secondary text-sm block mb-1">DZD</span>
                    <span className="font-display-lg text-[32px] text-primary">{formatDZD(total)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-12 flex items-center justify-center gap-8 opacity-40">
                <span className="material-symbols-outlined text-[32px]">verified_user</span>
                <span className="material-symbols-outlined text-[32px]">local_shipping</span>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
}

export default Checkout;
