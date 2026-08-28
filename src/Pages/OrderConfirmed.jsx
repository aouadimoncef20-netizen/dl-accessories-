import { useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import SEO from "../Component/SEO";
import useTranslation from "../i18n/useTranslation";

const orderNumber = () =>
  "DL-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

function OrderConfirmed() {
  const location = useLocation();
  const [orderId] = useState(orderNumber);
  const order = location.state;
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!order) {
    return <Navigate to="/" replace />;
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
        <p className="font-headline-md text-primary">{orderId}</p>
      </div>

      {/* Order details */}
      <div className="max-w-lg mx-auto text-left bg-surface-container-low rounded-2xl p-8 soft-glow mb-12">
        <h2 className="font-headline-sm text-headline-sm mb-6">{t("order_delivery_details")}</h2>
        <div className="space-y-2 font-body-md text-secondary">
          <p>{order.form.fullName}</p>
          <p>{order.form.address}</p>
          <p>{order.form.state}</p>
          <p className="pt-4">{order.form.phone}</p>
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
