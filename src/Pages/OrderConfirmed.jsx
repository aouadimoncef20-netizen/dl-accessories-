import { useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import SEO from "../Component/SEO";
import useTranslation from "../i18n/useTranslation";
import { formatDZD } from "../lib/currency";

function OrderConfirmed() {
  const location = useLocation();
  const { t } = useTranslation();

  // The checkout hands the order over in router state. A refresh (or coming
  // back from the tracking page) loses that state, so a copy is kept in this
  // tab — the customer should not be bounced home after a real order.
  const [order] = useState(() => {
    if (location.state) return location.state;
    try {
      const raw = sessionStorage.getItem("dl_last_order");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!order) {
    return <Navigate to="/" replace />;
  }

  const displayOrderId = order.orderId
    ? "DL-" + order.orderId.slice(0, 8).toUpperCase()
    : "DL-" + Date.now().toString(36).toUpperCase();

  // The order never reached the database. Saying "thank you, we got it" here
  // would be a lie the customer only discovers when nothing arrives.
  if (order.saved === false) {
    return (
      <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto text-center">
        <SEO title={t("order_not_saved_title")} description={t("order_not_saved_title")} />

        <div className="w-24 h-24 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-8">
          <span className="material-symbols-outlined text-5xl text-error" style={{ fontVariationSettings: '"FILL" 1' }}>
            cloud_off
          </span>
        </div>

        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-4">
          {t("order_not_saved_title")}
        </h1>
        <p className="font-body-lg text-secondary max-w-xl mx-auto mb-10">
          {t("order_not_saved_body")}
        </p>

        <div className="inline-block bg-surface-container-low rounded-2xl p-8 mb-6 soft-glow">
          <p className="font-label-sm text-secondary uppercase tracking-widest mb-2">
            {t("order_not_saved_reference")}
          </p>
          <p className="font-headline-md text-primary">{displayOrderId}</p>
        </div>

        <p className="text-body-md text-secondary max-w-lg mx-auto mb-12">
          {t("order_not_saved_next")}
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <Link
            to="/checkout"
            className="px-10 py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            {t("order_try_again")}
          </Link>
          <a
            href={`mailto:dl.accessoires@gmail.com?subject=${encodeURIComponent(`${displayOrderId} — order not saved`)}`}
            className="px-10 py-4 border border-outline-variant text-secondary rounded-full font-label-md uppercase tracking-widest hover:bg-surface-container-low transition-colors"
          >
            {t("order_email_us")}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto text-center">
      <SEO title={t("order_title")} description={t("order_thank")} />
      {/* Success icon */}
      <div className="w-24 h-24 rounded-full bg-primary-container/30 flex items-center justify-center mx-auto mb-8">
        <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>
          check_circle
        </span>
      </div>

      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-4">
        {t("order_title")}
      </h1>
      <p className="font-body-lg text-secondary max-w-lg mx-auto mb-4">
        {t("order_thank")}
      </p>

      {/* Order ID card */}
      <div className="inline-block bg-surface-container-low rounded-2xl p-8 mb-12 soft-glow">
        <p className="font-label-sm text-secondary uppercase tracking-widest mb-2">{t("order_number")}</p>
        <p className="font-headline-md text-primary">{displayOrderId}</p>

        {/* The courier's own number, shown only once the parcel is
            really booked. Printing an empty line would promise the
            customer something that doesn't exist yet. */}
        {order.tracking && (
          <p className="mt-4 pt-4 border-t border-outline-variant/30">
            <span className="block font-label-sm text-secondary uppercase tracking-widest mb-1">
              {t("order_tracking")}
            </span>
            <span className="font-headline-sm text-primary">{order.tracking}</span>
          </p>
        )}
      </div>

      {/* Order details */}
      <div className="max-w-lg mx-auto text-left bg-surface-container-low rounded-2xl p-8 soft-glow mb-12">
        <h2 className="font-headline-sm text-headline-sm mb-6">{t("order_delivery_details")}</h2>
        <div className="space-y-2 font-body-md text-secondary">
          <p>{order.form.fullName}</p>
          <p>{order.form.address}</p>
          <p>{order.form.commune ? `${order.form.commune}, ${order.form.state}` : order.form.state}</p>
          {order.deliveryType === "bureau" && (
            <p className="text-primary">{t("checkout_delivery_desk")}</p>
          )}
          <p className="pt-4">{order.form.phone}</p>
          {typeof order.total === "number" && (
            <p className="pt-2 flex items-center justify-between border-t border-outline-variant/30 mt-4">
              <span className="font-label-sm uppercase tracking-widest text-secondary">
                {t("checkout_total")}
              </span>
              <span className="font-headline-sm text-primary">
                {formatDZD(order.total)}
              </span>
            </p>
          )}
          <p className="pt-2 font-label-sm uppercase tracking-widest text-primary">
            {t("checkout_cash")}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-6">
        <Link
          to="/collections"
          className="px-10 py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          {t("order_continue")}
        </Link>
        <Link
          to="/track-order"
          className="px-10 py-4 border border-outline-variant text-secondary rounded-full font-label-md uppercase tracking-widest hover:bg-surface-container-low transition-colors"
        >
          {t("order_track")}
        </Link>
        <Link
          to="/"
          className="px-10 py-4 border border-outline-variant text-secondary rounded-full font-label-md uppercase tracking-widest hover:bg-surface-container-low transition-colors"
        >
          {t("order_home")}
        </Link>
      </div>
    </main>
  );
}

export default OrderConfirmed;
