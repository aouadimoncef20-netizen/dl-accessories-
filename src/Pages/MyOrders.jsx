import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import useProductStore from "../stores/productStore";

function MyOrders() {
  const { user } = useAuthStore();
  const { fetchUserOrders } = useProductStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserOrders(user.id).then((data) => {
        setOrders(data);
        setLoading(false);
      });
    }
  }, [user, fetchUserOrders]);

  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="flex items-center gap-4 mb-12">
        <Link to="/account" className="text-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined">chevron_left</span>
        </Link>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg">My Orders</h1>
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
          <p className="font-headline-sm text-on-surface-variant mb-2">No orders yet</p>
          <p className="font-body-md text-secondary mb-6">Your purchase history will appear here.</p>
          <Link to="/collections" className="inline-block px-10 py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-surface rounded-2xl p-6 md:p-8 soft-glow">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div>
                  <p className="font-label-sm text-secondary uppercase tracking-widest mb-1">Order #{order.id.slice(0, 8)}</p>
                  <p className="font-label-sm text-secondary">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-4 py-1 rounded-full text-xs uppercase tracking-widest font-label-sm ${
                  order.status === "delivered" ? "bg-green-100 text-green-800" :
                  order.status === "shipped" ? "bg-blue-100 text-blue-800" :
                  order.status === "cancelled" ? "bg-error-container text-error" :
                  "bg-primary-container/30 text-primary"
                }`}>
                  {order.status}
                </span>
              </div>
              <div className="border-t border-outline-variant/20 pt-4 flex justify-between items-end">
                <span className="text-secondary font-body-md">{order.items?.length || 0} item(s)</span>
                <span className="font-headline-sm text-primary">${order.total?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyOrders;
