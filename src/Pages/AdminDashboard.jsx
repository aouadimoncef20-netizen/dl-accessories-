import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import useProductStore from "../stores/productStore";
import ProductManager from "../Component/ProductManager";
import OrderManager from "../Component/OrderManager";
import { formatDZD } from "../lib/currency";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function AdminDashboard() {
  const { signOut, user } = useAuthStore();
  const { fetchAllOrders, fetchProducts, products } = useProductStore();
  const [tab, setTab] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAllOrders(), fetchProducts()]).then(([o]) => {
      setOrders(o);
      setLoading(false);
    });
  }, [fetchAllOrders, fetchProducts]);

  const tabs = [
    { key: "overview", label: "Overview", icon: "dashboard" },
    { key: "orders", label: "Orders", icon: "receipt_long" },
    { key: "products", label: "Products", icon: "inventory_2" },
  ];

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const shippedOrders = orders.filter((o) => o.status === "shipped");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const todayOrders = orders.filter((o) => {
    const d = new Date(o.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-outline-variant/20 p-6 fixed h-full">
        <Link to="/" className="font-display-lg text-[22px] text-primary mb-2">DL Admin</Link>
        <p className="font-label-sm text-secondary mb-10">Manage your store</p>

        <nav className="flex flex-col gap-1 flex-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-body-md text-left transition-all ${
                tab === t.key
                  ? "bg-primary-container/30 text-primary font-semibold shadow-sm"
                  : "text-secondary hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              {t.label}
              {t.key === "orders" && pendingOrders.length > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingOrders.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="space-y-2 pt-4 border-t border-outline-variant/20">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-body-md text-secondary hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">storefront</span>
            View Store
          </Link>
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px] text-primary">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-label-sm text-on-surface truncate">{user?.name || "Admin"}</p>
              <p className="text-[11px] text-secondary truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-body-md text-secondary hover:bg-surface-container transition-colors w-full"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-surface border-b border-outline-variant/20 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display-lg text-[20px] text-primary">DL Admin</span>
          <div className="flex items-center gap-2">
            <Link to="/" className="p-2 rounded-lg hover:bg-surface-container">
              <span className="material-symbols-outlined text-[20px] text-secondary">storefront</span>
            </Link>
            <button onClick={signOut} className="p-2 rounded-lg hover:bg-surface-container">
              <span className="material-symbols-outlined text-[20px] text-secondary">logout</span>
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                tab === t.key
                  ? "bg-primary text-on-primary font-semibold"
                  : "bg-surface-container text-secondary"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
              {t.label}
              {t.key === "orders" && pendingOrders.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center">
                  {pendingOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-28 md:pt-8">
        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        {tab === "overview" && (
          <div className="space-y-8">
            <div>
              <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-1">
                Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
              <p className="font-body-md text-secondary">Here's what's happening with your store today.</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[
                {
                  label: "Total Orders",
                  value: orders.length,
                  icon: "receipt_long",
                  gradient: "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30",
                  iconBg: "bg-rose-100 dark:bg-rose-900/50",
                  iconColor: "text-rose-600 dark:text-rose-400",
                },
                {
                  label: "Pending",
                  value: pendingOrders.length,
                  icon: "schedule",
                  gradient: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
                  iconBg: "bg-amber-100 dark:bg-amber-900/50",
                  iconColor: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Delivered",
                  value: deliveredOrders.length,
                  icon: "check_circle",
                  gradient: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30",
                  iconBg: "bg-green-100 dark:bg-green-900/50",
                  iconColor: "text-green-600 dark:text-green-400",
                },
                {
                  label: "Revenue",
                  value: formatDZD(totalRevenue),
                  icon: "payments",
                  gradient: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
                  iconBg: "bg-blue-100 dark:bg-blue-900/50",
                  iconColor: "text-blue-600 dark:text-blue-400",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-4 md:p-5 border border-outline-variant/10`}
                >
                  <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center mb-3`}>
                    <span className={`material-symbols-outlined text-xl ${s.iconColor}`}>{s.icon}</span>
                  </div>
                  <p className="font-display-lg text-[22px] md:text-[26px] text-on-surface leading-tight">{s.value}</p>
                  <p className="font-label-sm text-secondary uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quick actions + Recent orders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Quick Actions */}
              <div className="bg-surface rounded-2xl p-5 md:p-6 soft-glow">
                <h3 className="font-headline-sm text-headline-sm mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setTab("products")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary-container/30 flex items-center justify-center group-hover:bg-primary-container/50 transition-colors">
                      <span className="material-symbols-outlined text-[18px] text-primary">add_box</span>
                    </div>
                    <div>
                      <p className="font-label-md text-on-surface">Add Product</p>
                      <p className="text-[11px] text-secondary">Create a new listing</p>
                    </div>
                    <span className="material-symbols-outlined text-secondary ml-auto text-[18px]">chevron_right</span>
                  </button>

                  <button
                    onClick={() => setTab("orders")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/70 transition-colors">
                      <span className="material-symbols-outlined text-[18px] text-amber-600">pending_actions</span>
                    </div>
                    <div>
                      <p className="font-label-md text-on-surface">Review Orders</p>
                      <p className="text-[11px] text-secondary">{pendingOrders.length} pending</p>
                    </div>
                    <span className="material-symbols-outlined text-secondary ml-auto text-[18px]">chevron_right</span>
                  </button>

                  <Link
                    to="/collections"
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/70 transition-colors">
                      <span className="material-symbols-outlined text-[18px] text-green-600">storefront</span>
                    </div>
                    <div>
                      <p className="font-label-md text-on-surface">View Store</p>
                      <p className="text-[11px] text-secondary">See customer view</p>
                    </div>
                    <span className="material-symbols-outlined text-secondary ml-auto text-[18px]">chevron_right</span>
                  </Link>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="lg:col-span-2 bg-surface rounded-2xl p-5 md:p-6 soft-glow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                    Recent Orders
                  </h3>
                  <button
                    onClick={() => setTab("orders")}
                    className="font-label-sm text-primary hover:underline"
                  >
                    View all
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
                        <div className="w-10 h-10 rounded-lg bg-surface-container" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-surface-container rounded w-1/3" />
                          <div className="h-3 bg-surface-container rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-10 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline-variant mb-3 block">receipt_long</span>
                    <p className="font-body-md text-secondary mb-1">No orders yet</p>
                    <p className="text-xs text-outline-variant">Orders will appear here when customers place them.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
                        onClick={() => setTab("orders")}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-label-sm text-secondary uppercase">#{order.id?.slice(0, 8)}</p>
                            <span className="text-outline-variant text-xs">·</span>
                            <p className="font-body-md text-on-surface text-sm truncate">{order.customer_name}</p>
                          </div>
                          <p className="text-[11px] text-secondary">{formatDate(order.created_at)} · {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-label-md text-primary">{formatDZD(order.total)}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-label-sm mt-0.5 ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Store Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface rounded-2xl p-5 soft-glow flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-primary">inventory_2</span>
                </div>
                <div>
                  <p className="font-display-lg text-[22px] text-on-surface">{products.length}</p>
                  <p className="font-label-sm text-secondary uppercase tracking-wider">Products</p>
                </div>
              </div>
              <div className="bg-surface rounded-2xl p-5 soft-glow flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-purple-600">local_shipping</span>
                </div>
                <div>
                  <p className="font-display-lg text-[22px] text-on-surface">{shippedOrders.length}</p>
                  <p className="font-label-sm text-secondary uppercase tracking-wider">In Transit</p>
                </div>
              </div>
              <div className="bg-surface rounded-2xl p-5 soft-glow flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-amber-600">today</span>
                </div>
                <div>
                  <p className="font-display-lg text-[22px] text-on-surface">{todayOrders.length}</p>
                  <p className="font-label-sm text-secondary uppercase tracking-wider">Today's Orders</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && <OrderManager />}
        {tab === "products" && <ProductManager />}
      </main>
    </div>
  );
}

export default AdminDashboard;
