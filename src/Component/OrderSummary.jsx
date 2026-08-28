import { Link } from "react-router-dom";
import { formatDZD } from "../lib/currency";
import useTranslation from "../i18n/useTranslation";

function OrderSummary({ subtotal, showCheckoutButton = true }) {
  const shipping = subtotal >= 75 ? 0 : 12.0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  const { t } = useTranslation();

  return (
    <div className="bg-white p-8 rounded-xl soft-glow border border-surface-container">
      <h2 className="font-headline-sm text-headline-sm mb-6">{t("summary_title")}</h2>
      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-on-surface-variant">
          <span className="font-body-md">{t("summary_subtotal")}</span>
          <span className="font-body-md">{formatDZD(subtotal)}</span>
        </div>
        <div className="flex justify-between text-on-surface-variant">
          <span className="font-body-md">{t("summary_shipping")}</span>
          <span className="font-body-md">{shipping === 0 ? t("checkout_free") : formatDZD(shipping)}</span>
        </div>
        <div className="flex justify-between text-on-surface-variant">
          <span className="font-body-md">{t("summary_taxes")}</span>
          <span className="font-body-md">{formatDZD(tax)}</span>
        </div>
      </div>
      <div className="pt-6 border-t border-outline-variant/20 mb-8 flex justify-between items-end">
        <span className="font-headline-sm text-headline-sm">{t("summary_total")}</span>
        <span className="font-display-lg text-display-lg-mobile text-primary">{formatDZD(total)}</span>
      </div>
      {showCheckoutButton && (
        <>
          <Link
            to="/checkout"
            className="w-full bg-primary-container text-on-background py-5 rounded-full font-label-md tracking-wider hover:opacity-90 transition-all active:scale-95 mb-4 uppercase flex items-center justify-center"
          >
            {t("summary_checkout")}
          </Link>
        </>
      )}
      <div className="space-y-4 pt-4 border-t border-outline-variant/10">
        {[
          { icon: "verified_user", text: t("summary_ssl") },
          { icon: "local_shipping", text: t("summary_shipping_free") },
          { icon: "published_with_changes", text: t("summary_returns") },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px] text-primary">{item.icon}</span>
            <span className="text-label-sm">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderSummary;
