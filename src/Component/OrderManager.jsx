import { useEffect, useState } from "react";
import useProductStore from "../stores/productStore";
import { useToast } from "../Contexts/ToastContext";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "processing", label: "Processing", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "shipped", label: "Shipped", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
];

const STATUS_ICONS = {
  pending: "schedule",
  processing: "autorenew",
  shipped: "local_shipping",
  delivered: "check_circle",
  cancelled: "cancel",
};

function statusMeta(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OrderManager() {
  const { fetchAllOrders, updateOrderStatus } = useProductStore();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchAllOrders();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.customer_name?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.id?.slice(0, 8).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const handleStatus = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    toast.success(`Order marked as ${newStatus}`);
  };

  return (
    <div className="space-y-6">
      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders.length, icon: "receipt_long", color: "text-primary" },
          { label: "Pending", value: counts.pending, icon: "pending", color: "text-amber-600" },
          { label: "Shipped", value: counts.shipped, icon: "local_shipping", color: "text-purple-600" },
          { label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: "payments", color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-surface rounded-2xl p-5 soft-glow">
            <span className={`material-symbols-outlined text-2xl ${s.color} mb-2`}>{s.icon}</span>
            <p className="font-display-lg text-[24px] text-on-surface">{s.value}</p>
            <p className="font-label-sm text-secondary uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-surface rounded-3xl p-6 soft-glow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            Orders
          </h2>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
              search
            </span>
            <input
              type="text"
              className="form-input pl-9 pr-4 py-2.5 text-sm w-full sm:w-64"
              placeholder="Search name, phone, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
          {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-full font-label-sm uppercase tracking-wider whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-secondary hover:bg-surface-container-high"
              }`}
            >
              {s === "all" ? "All" : s}
              {counts[s] > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-[10px]">
                  {counts[s]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Order list */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-body-md text-secondary">Loading orders…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-3 block">
              {search || statusFilter !== "all" ? "search_off" : "receipt_long"}
            </span>
            <p className="font-body-md text-secondary">
              {search || statusFilter !== "all"
                ? "No orders match your filters"
                : "No orders yet. They'll appear here when customers place them."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const meta = statusMeta(order.status);
              const isExpanded = expanded === order.id;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl bg-surface-container-low border border-outline-variant/10 overflow-hidden transition-all"
                >
                  {/* Order row */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-surface-container transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : order.id)}
                  >
                    {/* Expand icon */}
                    <span className={`material-symbols-outlined text-secondary text-xl transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                      chevron_right
                    </span>

                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-label-sm text-secondary uppercase">
                          #{order.id?.slice(0, 8)}
                        </p>
                        <span className="text-outline-variant text-xs">•</span>
                        <p className="font-body-md text-on-surface truncate">
                          {order.customer_name}
                        </p>
                      </div>
                      <p className="font-label-sm text-secondary">
                        {formatDate(order.created_at)} · {order.items?.length || 0} item{(order.items?.length || 0) !== 1 && "s"}
                      </p>
                    </div>

                    {/* Price */}
                    <span className="font-headline-sm text-primary hidden sm:block">
                      ${order.total?.toFixed(2)}
                    </span>

                    {/* Status badge */}
                    <span className={`px-3 py-1 rounded-full font-label-sm uppercase tracking-wider ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-outline-variant/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        {/* Customer details */}
                        <div>
                          <h4 className="font-label-sm text-secondary uppercase tracking-wider mb-3">
                            Customer Details
                          </h4>
                          <div className="space-y-2 font-body-md">
                            <div className="flex justify-between">
                              <span className="text-secondary">Name</span>
                              <span className="text-on-surface">{order.customer_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Phone</span>
                              <span className="text-on-surface">{order.phone || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Address</span>
                              <span className="text-on-surface text-right max-w-[200px]">{order.address || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">State</span>
                              <span className="text-on-surface">{order.state || "—"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Items + status control */}
                        <div>
                          <h4 className="font-label-sm text-secondary uppercase tracking-wider mb-3">
                            Order Items
                          </h4>
                          <div className="space-y-2 mb-4">
                            {(order.items || []).map((item, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                                  {item.image ? (
                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="material-symbols-outlined text-secondary text-xs">image</span>
                                    </div>
                                  )}
                                </div>
                                <span className="flex-1 text-on-surface truncate">{item.name}</span>
                                <span className="text-secondary">×{item.qty}</span>
                                <span className="text-primary font-medium">${(item.price * item.qty).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Status update */}
                          <div className="bg-surface-container-low rounded-xl p-4">
                            <label className="block font-label-sm text-secondary uppercase tracking-wider mb-2">
                              Update Status
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {STATUS_OPTIONS.map((s) => (
                                <button
                                  key={s.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatus(order.id, s.value);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg font-label-sm transition-all ${
                                    order.status === s.value
                                      ? `${s.color} ring-2 ring-offset-1 ring-current/20`
                                      : "bg-surface-container text-secondary hover:bg-surface-container-high"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                                    {STATUS_ICONS[s.value]}
                                  </span>
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderManager;
