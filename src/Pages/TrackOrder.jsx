import { useState } from "react";
import { Link } from "react-router-dom";
import useProductStore from "../stores/productStore";
import SEO from "../Component/SEO";
import { formatDZD } from "../lib/currency";
import useTranslation from "../i18n/useTranslation";

const SUPPORT_EMAIL = "dl.accessoires@gmail.com";
const STEPS = ["pending", "processing", "shipped", "delivered"];

const STEP_ICONS = {
  pending: "schedule",
  processing: "package_2",
  shipped: "local_shipping",
  delivered: "check_circle",
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function TrackOrder() {
  const lookupOrder = useProductStore((s) => s.lookupOrder);
  const { t } = useTranslation();

  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [errorKey, setErrorKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorKey("");
    setOrder(null);

    const result = await lookupOrder(reference, phone);

    setLoading(false);
    if (result.order) {
      setOrder(result.order);
    } else {
      setErrorKey(`track_${result.code}`);
    }
  };

  const reset = () => {
    setOrder(null);
    setErrorKey("");
    setReference("");
    setPhone("");
  };

  const status = order?.status || "pending";
  const statusLabel = t(`track_status_${status}`);
  const stepIndex = STEPS.indexOf(status);

  return (
    <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEO title={t("track_title")} description={t("track_subtitle")} />

      <div className="max-w-2xl mx-auto">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-center mb-4">
          {t("track_title")}
        </h1>
        <p className="font-body-lg text-secondary text-center mb-12">
          {t("track_subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="bg-surface-container-low rounded-3xl p-6 md:p-8 space-y-5 soft-glow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="track-reference" className="block font-label-sm text-secondary uppercase tracking-wider mb-1.5">
                {t("track_reference")}
              </label>
              <input
                id="track-reference"
                type="text"
                className="form-input w-full font-body-md"
                placeholder={t("track_reference_placeholder")}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                autoCapitalize="characters"
                spellCheck="false"
                required
              />
            </div>
            <div>
              <label htmlFor="track-phone" className="block font-label-sm text-secondary uppercase tracking-wider mb-1.5">
                {t("track_phone")}
              </label>
              <input
                id="track-phone"
                type="tel"
                className="form-input w-full font-body-md"
                placeholder="0X XX XX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                {t("track_searching")}
              </>
            ) : (
              t("track_submit")
            )}
          </button>

          <p className="text-center text-sm text-secondary">
            {t("track_help")}{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline underline-offset-4">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </form>

        {/* ── Result ── */}
        <div aria-live="polite">
          {errorKey && (
            <div role="alert" className="mt-8 rounded-2xl border border-error/40 bg-error/5 p-5 text-center">
              <p className="font-body-md text-error">{t(errorKey)}</p>
            </div>
          )}

          {order && (
            <section className="mt-8 space-y-6">
              {/* Header */}
              <div className="bg-surface-container-low rounded-3xl p-6 md:p-8 soft-glow">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                  <div>
                    <p className="font-label-sm text-secondary uppercase tracking-widest mb-1">
                      {t("track_reference")}
                    </p>
                    <p className="font-headline-sm text-primary">
                      DL-{String(order.id).slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-label-sm text-secondary uppercase tracking-widest mb-1">
                      {t("track_placed")}
                    </p>
                    <p className="font-body-md text-on-surface">{formatDate(order.created_at)}</p>
                  </div>
                </div>

                {status === "cancelled" ? (
                  <div className="flex items-start gap-3 rounded-2xl bg-error/5 border border-error/30 p-4">
                    <span className="material-symbols-outlined text-error">cancel</span>
                    <div>
                      <p className="font-label-md text-error">{statusLabel}</p>
                      <p className="text-sm text-secondary">{t("track_cancelled_note")}</p>
                    </div>
                  </div>
                ) : (
                  <ol className="grid grid-cols-4 gap-2">
                    {STEPS.map((step, i) => {
                      const done = i <= stepIndex;
                      return (
                        <li key={step} className="flex flex-col items-center text-center gap-2">
                          <span
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              done ? "bg-primary text-on-primary" : "bg-surface-container-high text-secondary"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {STEP_ICONS[step]}
                            </span>
                          </span>
                          <span className={`text-[11px] font-label-sm uppercase tracking-wider ${done ? "text-primary" : "text-secondary"}`}>
                            {t(`track_status_${step}`)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              {/* Items */}
              <div className="bg-surface-container-low rounded-3xl p-6 md:p-8 soft-glow">
                <h2 className="font-headline-sm text-headline-sm mb-6">{t("track_items")}</h2>
                <div className="space-y-4">
                  {(order.items || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-surface-container overflow-hidden flex-shrink-0 border border-outline-variant/20">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = "/placeholder-product.svg"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-secondary text-lg">image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body-md text-on-surface truncate">{item.name}</p>
                        {item.variant && <p className="text-[12px] text-primary">{item.variant}</p>}
                        <p className="text-[12px] text-secondary">×{item.qty}</p>
                      </div>
                      <span className="font-label-md text-primary whitespace-nowrap">
                        {formatDZD(item.price * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-6 mt-6 border-t border-outline-variant/30">
                  <span className="font-headline-sm text-headline-sm">{t("track_total")}</span>
                  <span className="font-headline-sm text-primary">{formatDZD(order.total)}</span>
                </div>
              </div>

              {/* Delivery */}
              <div className="bg-surface-container-low rounded-3xl p-6 md:p-8 soft-glow">
                <h2 className="font-headline-sm text-headline-sm mb-4">{t("track_delivery_to")}</h2>
                <div className="font-body-md text-secondary space-y-1">
                  <p className="text-on-surface">{order.customer_name}</p>
                  <p>{order.address}</p>
                  <p>{order.state}</p>
                  <p className="pt-3 text-primary font-label-sm uppercase tracking-widest">
                    {t("track_payment_cod")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={reset}
                  className="px-8 py-4 border border-outline-variant text-secondary rounded-full font-label-md uppercase tracking-widest hover:bg-surface-container-low transition-colors"
                >
                  {t("track_another")}
                </button>
                <Link
                  to="/collections"
                  className="px-8 py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  {t("order_continue")}
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export default TrackOrder;
