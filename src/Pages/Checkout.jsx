import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useCartStore from "../stores/cartStore";

function Checkout() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    shipping: "standard",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.city.trim()) errs.city = "City is required";
    if (!form.state.trim()) errs.state = "State is required";
    if (!form.zip.trim()) errs.zip = "ZIP code is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      clearCart();
      navigate("/order-confirmed", {
        state: {
          form,
          shipping: form.shipping === "express" ? 15 : 0,
        },
      });
    }
  };

  const shippingCost = form.shipping === "express" ? 15 : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  return (
    <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      {/* Progress Breadcrumbs */}
      <nav className="flex items-center justify-start space-x-6 mb-12 overflow-x-auto whitespace-nowrap">
        {[
          { num: 1, label: "Information" },
          { num: 2, label: "Shipping" },
          { num: 3, label: "Payment" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-3">
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md ${
                step >= s.num
                  ? "bg-primary-container text-on-primary-container"
                  : "border border-outline-variant text-secondary"
              }`}
            >
              {step > s.num ? (
                <span className="material-symbols-outlined text-sm">check</span>
              ) : (
                s.num
              )}
            </span>
            <span
              className={`font-label-md uppercase tracking-wider ${
                step >= s.num ? "text-primary" : "text-secondary"
              }`}
            >
              {s.label}
            </span>
            {s.num < 3 && <div className="w-12 h-px bg-outline-variant" />}
          </div>
        ))}
      </nav>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* Left: Form */}
          <div className="lg:col-span-7 space-y-12">
            {step === 1 && (
              <>
                {/* Contact Information */}
                <section>
                  <div className="flex justify-between items-baseline mb-6">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      Contact Information
                    </h2>
                  </div>
                  <div className="space-y-4">
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className={`w-full form-input font-body-md ${
                        errors.phone ? "border-error focus:border-error focus:ring-error/20" : ""
                      }`}
                      placeholder="Phone Number"
                      type="tel"
                    />
                    {errors.phone && (
                      <p className="text-error text-label-sm mt-1">{errors.phone}</p>
                    )}
                  </div>
                </section>

                {/* Shipping Address */}
                <section>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                    Shipping Address
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <input
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        className={`form-input font-body-md w-full ${
                          errors.firstName ? "border-error" : ""
                        }`}
                        placeholder="First name"
                        type="text"
                      />
                      {errors.firstName && (
                        <p className="text-error text-label-sm mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <input
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        className={`form-input font-body-md w-full ${
                          errors.lastName ? "border-error" : ""
                        }`}
                        placeholder="Last name"
                        type="text"
                      />
                      {errors.lastName && (
                        <p className="text-error text-label-sm mt-1">{errors.lastName}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <input
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        className={`form-input font-body-md w-full ${
                          errors.address ? "border-error" : ""
                        }`}
                        placeholder="Address"
                        type="text"
                      />
                      {errors.address && (
                        <p className="text-error text-label-sm mt-1">{errors.address}</p>
                      )}
                    </div>
                    <div>
                      <input
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        className={`form-input font-body-md w-full ${
                          errors.city ? "border-error" : ""
                        }`}
                        placeholder="City"
                        type="text"
                      />
                      {errors.city && (
                        <p className="text-error text-label-sm mt-1">{errors.city}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <input
                          name="state"
                          value={form.state}
                          onChange={handleChange}
                          className={`form-input font-body-md w-full ${
                            errors.state ? "border-error" : ""
                          }`}
                          placeholder="State"
                          type="text"
                        />
                        {errors.state && (
                          <p className="text-error text-label-sm mt-1">{errors.state}</p>
                        )}
                      </div>
                      <div>
                        <input
                          name="zip"
                          value={form.zip}
                          onChange={handleChange}
                          className={`form-input font-body-md w-full ${
                            errors.zip ? "border-error" : ""
                          }`}
                          placeholder="ZIP Code"
                          type="text"
                        />
                        {errors.zip && (
                          <p className="text-error text-label-sm mt-1">{errors.zip}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {step === 2 && (
              <section>
                <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                  Shipping Method
                </h2>
                <div className="space-y-3">
                  <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${
                    form.shipping === "standard"
                      ? "border-primary/30 bg-primary-container/10"
                      : "border-outline-variant/30 hover:border-primary/20"
                  }`}>
                    <input
                      type="radio"
                      name="shipping"
                      value="standard"
                      checked={form.shipping === "standard"}
                      onChange={handleChange}
                      className="accent-primary"
                    />
                    <div className="flex-grow">
                      <p className="font-label-md text-on-surface">Standard Shipping</p>
                      <p className="text-label-sm text-secondary">5-7 business days • Free</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${
                    form.shipping === "express"
                      ? "border-primary/30 bg-primary-container/10"
                      : "border-outline-variant/30 hover:border-primary/20"
                  }`}>
                    <input
                      type="radio"
                      name="shipping"
                      value="express"
                      checked={form.shipping === "express"}
                      onChange={handleChange}
                      className="accent-primary"
                    />
                    <div className="flex-grow">
                      <p className="font-label-md text-on-surface">Express Shipping</p>
                      <p className="text-label-sm text-secondary">2-3 business days • $15.00</p>
                    </div>
                  </label>
                </div>
              </section>
            )}

            {step === 3 && (
              <section>
                <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                  Payment
                </h2>
                <div className="border border-outline-variant/30 rounded-xl p-6 bg-surface-container-low">
                  <p className="font-body-md text-secondary mb-4">
                    This is a demo checkout. Click "Complete Purchase" to simulate payment.
                  </p>
                  <div className="space-y-4">
                    <input
                      className="w-full form-input font-body-md"
                      placeholder="Card number"
                      type="text"
                      defaultValue="4242 4242 4242 4242"
                      readOnly
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        className="form-input font-body-md"
                        placeholder="MM/YY"
                        type="text"
                        defaultValue="12/28"
                        readOnly
                      />
                      <input
                        className="form-input font-body-md"
                        placeholder="CVC"
                        type="text"
                        defaultValue="123"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Navigation buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                  Back
                </button>
              ) : (
                <Link
                  to="/cart"
                  className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                  Return to cart
                </Link>
              )}
              <button
                type="submit"
                className="bg-primary-container text-on-primary-container font-label-md uppercase tracking-widest py-4 px-12 rounded-full shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all"
              >
                {step === 3 ? "Complete Purchase" : "Continue"}
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
                      <span className="font-label-md text-primary">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-secondary text-center py-8">Your cart is empty.</p>
                )}
              </div>
              <div className="space-y-4 pt-8 border-t border-outline-variant/20">
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-secondary">Subtotal</span>
                  <span className="text-on-surface">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-secondary">Shipping</span>
                  <span className="text-on-surface">{shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between items-center pt-6 mt-4 border-t border-outline-variant/50">
                  <span className="font-headline-sm text-headline-sm">Total</span>
                  <div className="text-right">
                    <span className="text-secondary text-sm block mb-1">USD</span>
                    <span className="font-display-lg text-[32px] text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-12 flex items-center justify-center gap-8 opacity-40">
                <span className="material-symbols-outlined text-[32px]">verified_user</span>
                <span className="material-symbols-outlined text-[32px]">security</span>
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
