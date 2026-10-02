import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import useProductStore from "../stores/productStore";
import SEO from "../Component/SEO";
import { formatDZD } from "../lib/currency";
import useTranslation from "../i18n/useTranslation";

const STATUS_STYLES = {
  delivered: "bg-green-100 text-green-800",
  shipped: "bg-blue-100 text-blue-800",
  cancelled: "bg-error-container text-error",
};

function MyOrders() {
  const { user } = useAuthStore();
  const { fetchUserOrders } = useProductStore();
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserOrders(user.id).then((data) => {
        setOrders(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, fetchUserOrders]);

  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEO title={t("mo_title")} description={t("mo_empty_body")} />

      <div className="flex items-center gap-4 mb-12">
        <Link to="/account" className="text-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined">chevron_left</span>
        </Link>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg">{t("mo_title")}</h1>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl p-8">
              <div className="h-6 bg-surface-container-low rounded w-1/3 mb-4" />
              <div className="h-4 bg-surface-container-low rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">receipt_long</span>
          <p className="font-headline-sm text-on-surface-variant mb-2">{t("mo_empty")}</p>
          <p className="font-body-md text-secondary mb-6">{t("mo_empty_body")}</p>
          <Link to="/collections" className="inline-block px-10 py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90">
            {t("order_continue")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-surface rounded-2xl p-6 md:p-8 soft-glow">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
                <div>
                  <p className="font-label-sm text-secondary uppercase tracking-widest mb-1">
                    {t("track_reference")} · {String(order.id).slice(0, 8)}
                  </p>
                  <p className="font-label-sm text-secondary">
                    {t("track_placed")} {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-4 py-1 rounded-full text-xs uppercase tracking-widest font-label-sm ${
                  STATUS_STYLES[order.status] || "bg-primary-container/30 text-primary"
                }`}>
                  {t(`track_status_${order.status}`)}
                </span>
              </div>

              {/* What was actually bought — sizes and finishes included. */}
              <div className="space-y-3 border-t border-outline-variant/20 pt-5">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-surface-container-low overflow-hidden flex-shrink-0 border border-outline-variant/20">
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
                    <span className="font-label-md text-on-surface whitespace-nowrap">
                      {formatDZD(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-outline-variant/20 mt-5 pt-4 flex flex-wrap justify-between items-center gap-4">
                <Link
                  to="/track-order"
                  className="font-label-sm text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                  {t("mo_track")}
                </Link>
                <span className="font-headline-sm text-primary">{formatDZD(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyOrders;
