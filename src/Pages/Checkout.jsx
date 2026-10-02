import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useCartStore from "../stores/cartStore";
import useProductStore from "../stores/productStore";
import useAuthStore from "../stores/authStore";
import SEO from "../Component/SEO";
import { formatDZD } from "../lib/currency";
import { SHOW_TAX_LINE } from "../lib/shipping";
import { WILAYAS, wilayaLabel } from "../lib/wilayas";
import { FREE_DELIVERY_POINTS, freePointName } from "../lib/shipping";
import useTranslation from "../i18n/useTranslation";

function Checkout() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const tax = useCartStore((s) => s.tax());
  const clearCart = useCartStore((s) => s.clearCart);
  const createOrder = useProductStore((s) => s.createOrder);
  const decrementStock = useProductStore((s) => s.decrementStock);
  const checkStock = useProductStore((s) => s.checkStock);
  const user = useAuthStore((s) => s.user);
  const [errors, setErrors] = useState({});
  const [stockProblems, setStockProblems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    state: "",
    deliveryPoint: "",
  });

  // Delivery is priced from the form above, so the fee and the total change
  // the moment the customer picks a wilaya or a free delivery point. Until
  // one of those is chosen `shippingCost` is null, and the summary says so
  // rather than showing it as free.
  const shippingCost = useCartStore((s) => s.shippingCost(form.state, form.deliveryPoint));
  const total = useCartStore((s) => s.total(form.state, form.deliveryPoint));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = t("checkout_full_name") + " required";
    if (!form.phone.trim()) errs.phone = t("checkout_phone") + " required";
    if (!form.address.trim()) errs.address = t("checkout_street") + " required";
    if (!form.state.trim()) errs.state = t("checkout_state") + " required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setStockProblems([]);

    // Ask the database what is actually left before we promise anything.
    const stock = await checkStock(items);
    if (!stock.ok) {
      setStockProblems(stock.problems);
      setSubmitting(false);
      return;
    }

    // A free delivery point is part of where the parcel goes, so it leads the
    // address: "USTHB — Bâtiment C, chambre 12" tells the courier everything,
    // and the admin sees the campus without having to open the order.
    const pointName = freePointName(form.deliveryPoint);

    const order = await createOrder({
      user_id: user?.id || null,
      customer_name: form.fullName,
      phone: form.phone,
      address: pointName ? `${pointName} — ${form.address}` : form.address,
      // Stored as "16 - Alger", not "16": the code alone means nothing to
      // whoever packs the parcel, and the name alone is ambiguous in a list.
      state: wilayaLabel(form.state),
      // `variant` (ring size / watch finish) is what the customer chose —
      // it has to reach the order or the admin cannot pack the right thing.
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        image: i.image,
        ...(i.variant ? { variant: i.variant } : {}),
      })),
      total: total,
      status: "pending",
    });

    const saved = order.saved !== false;

    // Only touch stock for an order that really landed in the database.
    if (saved) {
      await decrementStock(items.map((i) => ({ id: i.id, qty: i.qty })));
    }

    setSubmitting(false);

    if (!saved) {
      // Keep the basket intact so the customer can try again, and send them
      // to an honest "we couldn't save this" screen instead of a fake
      // confirmation.
      navigate("/order-confirmed", {
        state: { saved: false, form, orderId: order.id, itemCount: items.length },
      });
      return;
    }

    clearCart();
    navigate("/order-confirmed", {
      state: { saved: true, form, orderId: order.id },
    });
  };

  return (
    <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEO title={t("checkout_title")} description={t("checkout_title")} />
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-10">{t("checkout_title")}</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          <div className="lg:col-span-7 space-y-8">
            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">{t("checkout_your_info")}</h2>
              <div className="space-y-4">
                <div>
                  <input name="fullName" value={form.fullName} onChange={handleChange}
                    className={`w-full form-input font-body-md ${errors.fullName ? "border-error" : ""}`}
                    placeholder={t("checkout_full_name")} type="text" />
                  {errors.fullName && <p className="text-error text-sm mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <input name="phone" value={form.phone} onChange={handleChange}
                    className={`w-full form-input font-body-md ${errors.phone ? "border-error" : ""}`}
                    placeholder={t("checkout_phone")} type="tel" />
                  {errors.phone && <p className="text-error text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">{t("checkout_delivery")}</h2>
              <div className="space-y-4">
                <div>
                  <input name="address" value={form.address} onChange={handleChange}
                    className={`w-full form-input font-body-md ${errors.address ? "border-error" : ""}`}
                    placeholder={t("checkout_street")} type="text" />
                  {errors.address && <p className="text-error text-sm mt-1">{errors.address}</p>}
                </div>
                <div>
                  {/* A list, not a text box: the delivery price is looked up
                      from the wilaya code, and a hand-typed wilaya can't be
                      looked up at all. */}
                  <select name="state" value={form.state} onChange={handleChange}
                    className={`w-full form-input font-body-md ${errors.state ? "border-error" : ""}`}>
                    <option value="">{t("checkout_state")}</option>
                    {WILAYAS.map((w) => (
                      <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                    ))}
                  </select>
                  {errors.state && <p className="text-error text-sm mt-1">{errors.state}</p>}
                </div>
                <div>
                  {/* Chosen, not guessed. Free delivery applies to these
                      places wherever they are, so it can't ride on the
                      wilaya — UMMTO is in Tizi Ouzou and Koléa in Tipaza. */}
                  <label htmlFor="deliveryPoint" className="block font-label-md text-secondary mb-2">
                    {t("checkout_point_label")}
                  </label>
                  <select id="deliveryPoint" name="deliveryPoint" value={form.deliveryPoint}
                    onChange={handleChange} className="w-full form-input font-body-md">
                    <option value="">{t("checkout_point_none")}</option>
                    {FREE_DELIVERY_POINTS.map((point) => (
                      <option key={point.code} value={point.code}>{point.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">{t("checkout_payment")}</h2>
              <div className="flex items-center gap-4 p-5 border border-primary/30 bg-primary-container/10 rounded-xl">
                <span className="material-symbols-outlined text-primary text-[28px]">paid</span>
                <div>
                  <p className="font-label-md text-on-surface">{t("checkout_cash")}</p>
                  <p className="text-sm text-secondary">{t("checkout_cash_desc")}</p>
                </div>
              </div>
            </section>

            {stockProblems.length > 0 && (
              <div role="alert" className="rounded-2xl border border-error/40 bg-error/5 p-5">
                <p className="font-label-md text-error mb-2">{t("checkout_stock_changed")}</p>
                <ul className="space-y-1 text-sm text-on-surface-variant list-disc list-inside">
                  {stockProblems.map((p, i) => (
                    <li key={i}>
                      {p.available > 0
                        ? `${p.name} — ${t("checkout_only_left").replace("{n}", p.available)}`
                        : `${p.name} — ${t("checkout_out_of_stock")}`}
                    </li>
                  ))}
                </ul>
                <Link to="/cart" className="inline-block mt-3 font-label-sm text-primary underline underline-offset-4">
                  {t("checkout_return_cart")}
                </Link>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
              <Link to="/cart" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                <span className="material-symbols-outlined">chevron_left</span>
                {t("checkout_return_cart")}
              </Link>
              <button type="submit" disabled={submitting}
                className="bg-primary-container text-on-primary-container font-label-md uppercase tracking-widest py-4 px-12 rounded-full shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[220px]">
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-on-primary-container border-t-transparent rounded-full animate-spin" />
                    {t("checkout_processing")}
                  </>
                ) : t("checkout_place_order")}
              </button>
            </div>
          </div>

          <aside className="lg:col-span-5 lg:sticky lg:top-32">
            <div className="glass-summary rounded-3xl p-8 border border-white/40 shadow-sm">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-8">{t("checkout_order_summary")}</h2>
              <div className="space-y-6 mb-8 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {items.length > 0 ? (
                  items.map((item) => (
                    <div key={item.id} className="flex items-center gap-6 group">
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-surface-container-low overflow-hidden border border-outline-variant/30">
                          <img className="w-full h-full object-cover" src={item.image || "/placeholder-product.svg"} alt={item.name} onError={(e) => { e.target.src = "/placeholder-product.svg"; }} />
                        </div>
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-secondary text-white text-[10px] flex items-center justify-center rounded-full">{item.qty}</span>
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-label-md text-on-surface">{item.name}</h3>
                        {item.variant && <p className="font-label-sm text-secondary">{item.variant}</p>}
                      </div>
                      <span className="font-label-md text-primary">{formatDZD(item.price * item.qty)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-secondary text-center py-8">{t("checkout_cart_empty")}</p>
                )}
              </div>
              <div className="space-y-4 pt-8 border-t border-outline-variant/20">
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-secondary">{t("checkout_subtotal")}</span>
                  <span className="text-on-surface">{formatDZD(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-secondary">{t("checkout_shipping")}</span>
                  <span className="text-on-surface">
                    {shippingCost === null
                      ? t("checkout_shipping_pick")
                      : shippingCost === 0
                        ? t("checkout_free")
                        : formatDZD(shippingCost)}
                  </span>
                </div>
                {SHOW_TAX_LINE && (
                  <div className="flex justify-between items-center text-body-md">
                    <span className="text-secondary">{t("summary_taxes")}</span>
                    <span className="text-on-surface">{formatDZD(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-6 mt-4 border-t border-outline-variant/50">
                  <span className="font-headline-sm text-headline-sm">{t("checkout_total")}</span>
                  {/* formatDZD already ends in "DZD" — a second label above it
                      printed the currency twice. */}
                  <span className="font-display-lg text-[32px] text-primary">{formatDZD(total)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
}

export default Checkout;
