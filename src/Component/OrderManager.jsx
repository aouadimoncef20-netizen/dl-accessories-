import { useEffect, useState, useRef, useCallback } from "react";
import useProductStore from "../stores/productStore";
import { useToast } from "../Contexts/ToastContext";
import { formatDZD } from "../lib/currency";
import { formatShortDate, totalRevenue } from "../lib/format";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "processing", label: "Processing", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "shipped", label: "Shipped", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
];

// The dropdown, the filter chips and the counts all read this one list, so
// adding a status means editing a single line.
const STATUS_VALUES = ["all", ...STATUS_OPTIONS.map((s) => s.value)];

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

// Simple notification sound
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function OrderManager() {
  const { fetchAllOrders, updateOrderStatus } = useProductStore();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const lastOrderCountRef = useRef(0);
  const pollingRef = useRef(null);

  const load = useCallback(async (showNotification = false) => {
    const data = await fetchAllOrders();

    // Check for new orders
    if (showNotification && lastOrderCountRef.current > 0 && data.length > lastOrderCountRef.current) {
      const newCount = data.length - lastOrderCountRef.current;
      setNewOrderCount((prev) => prev + newCount);
      toast.success(`${newCount} new order${newCount > 1 ? "s" : ""} received!`);
      playNotificationSound();

      // Try browser notification
      if (Notification.permission === "granted") {
        new Notification("New Order!", {
          body: `${newCount} new order${newCount > 1 ? "s" : ""} received`,
          icon: "/logo dl accessories.jpg",
        });
      }
    }

    lastOrderCountRef.current = data.length;
    setOrders(data);
    setLoading(false);
  }, [fetchAllOrders, toast]);

  // Initial load + polling every 15 seconds
  useEffect(() => {
    load(false);

    pollingRef.current = setInterval(() => {
      load(true);
    }, 15000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [load]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const clearNewOrderCount = () => setNewOrderCount(0);

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.customer_name?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.id?.slice(0, 8).toLowerCase().includes(q) ||
        o.address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = STATUS_VALUES.reduce((acc, status) => {
    acc[status] =
      status === "all"
        ? orders.length
        : orders.filter((o) => o.status === status).length;
    return acc;
  }, {});

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Total Orders", value: orders.length, icon: "receipt_long", gradient: "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30", iconBg: "bg-rose-100 dark:bg-rose-900/50", iconColor: "text-rose-600" },
          { label: "Pending", value: counts.pending, icon: "pending", gradient: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30", iconBg: "bg-amber-100 dark:bg-amber-900/50", iconColor: "text-amber-600" },
          { label: "Shipped", value: counts.shipped, icon: "local_shipping", gradient: "from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30", iconBg: "bg-purple-100 dark:bg-purple-900/50", iconColor: "text-purple-600" },
          { label: "Revenue", value: formatDZD(totalRevenue(orders)), icon: "payments", gradient: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30", iconBg: "bg-green-100 dark:bg-green-900/50", iconColor: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-4 md:p-5 border border-outline-variant/10`}>
            <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center mb-2`}>
              <span className={`material-symbols-outlined text-lg ${s.iconColor}`}>{s.icon}</span>
            </div>
            <p className="font-display-lg text-[20px] md:text-[24px] text-on-surface leading-tight">{s.value}</p>
            <p className="font-label-sm text-secondary uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-surface rounded-2xl p-5 md:p-6 soft-glow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              Orders
            </h2>
            {newOrderCount > 0 && (
              <button
                onClick={clearNewOrderCount}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold animate-pulse"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                {newOrderCount} new
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
                search
              </span>
              <input
                type="text"
                className="form-input pl-9 pr-4 py-2.5 text-sm w-full sm:w-64"
                placeholder="Search name, phone, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => load(false)}
              className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
              title="Refresh orders"
            >
              <span className="material-symbols-outlined text-[20px] text-secondary">refresh</span>
            </button>
          </div>
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
          {STATUS_VALUES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-full font-label-sm uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                statusFilter === s
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container text-secondary hover:bg-surface-container-high"
              }`}
            >
              {s === "all" ? "All" : s}
              {counts[s] > 0 && (
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  statusFilter === s ? "bg-white/20" : "bg-outline-variant/20"
                }`}>
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
            <p className="font-body-md text-secondary">Loading orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-3 block">
              {search || statusFilter !== "all" ? "search_off" : "receipt_long"}
            </span>
            <p className="font-body-md text-secondary mb-1">
              {search || statusFilter !== "all"
                ? "No orders match your filters"
                : "No orders yet"}
            </p>
            <p className="text-xs text-outline-variant">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Orders will appear here automatically when customers place them"}
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
                    className="flex items-center gap-3 md:p-4 p-3 cursor-pointer hover:bg-surface-container transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : order.id)}
                  >
                    <span className={`material-symbols-outlined text-secondary text-xl transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                      chevron_right
                    </span>

                    <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-label-sm text-secondary uppercase">#{order.id?.slice(0, 8)}</p>
                        <span className="text-outline-variant text-xs hidden sm:inline">·</span>
                        <p className="font-body-md text-on-surface truncate hidden sm:block">{order.customer_name}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-secondary">
                        <span>{formatShortDate(order.created_at)}</span>
                        <span>·</span>
                        <span>{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}</span>
                        {order.phone && (
                          <>
                            <span className="hidden sm:inline">·</span>
                            <a
                              href={`tel:${order.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hidden sm:inline text-primary hover:underline"
                            >
                              {order.phone}
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <span className="font-headline-sm text-primary hidden sm:block">
                      {formatDZD(order.total)}
                    </span>

                    <span className={`px-3 py-1 rounded-full font-label-sm uppercase tracking-wider ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-outline-variant/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        {/* Customer details */}
                        <div className="space-y-3">
                          <h4 className="font-label-sm text-secondary uppercase tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            Customer Details
                          </h4>
                          <div className="bg-surface-container rounded-xl p-4 space-y-2.5 font-body-md text-sm">
                            <div className="flex justify-between">
                              <span className="text-secondary">Name</span>
                              <span className="text-on-surface font-medium">{order.customer_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Phone</span>
                              {order.phone ? (
                                <a href={`tel:${order.phone}`} className="text-primary hover:underline font-medium">{order.phone}</a>
                              ) : (
                                <span className="text-on-surface">—</span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Address</span>
                              <span className="text-on-surface text-right max-w-[220px] font-medium">{order.address || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">State</span>
                              <span className="text-on-surface font-medium">{order.state || "—"}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-outline-variant/20">
                              <span className="text-secondary">Order Total</span>
                              <span className="text-primary font-semibold">{formatDZD(order.total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Items + status control */}
                        <div className="space-y-3">
                          <h4 className="font-label-sm text-secondary uppercase tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">shopping_bag</span>
                            Order Items
                          </h4>
                          <div className="space-y-2">
                            {(order.items || []).map((item, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm bg-surface-container rounded-xl p-3">
                                <div className="w-10 h-10 rounded-lg bg-surface-container-low overflow-hidden flex-shrink-0 border border-outline-variant/10">
                                  {item.image ? (
                                    <img src={item.image} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = "/placeholder-product.svg"; }} />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="material-symbols-outlined text-secondary text-xs">image</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-on-surface truncate font-medium">{item.name}</p>
                                  {/* The customer's actual choice — ring size, watch finish.
                                      Without this the packer has to guess. */}
                                  {item.variant && (
                                    <p className="text-[11px] text-primary truncate">{item.variant}</p>
                                  )}
                                  <p className="text-[11px] text-secondary">Qty: {item.qty}</p>
                                </div>
                                <span className="text-primary font-semibold text-sm">{formatDZD(item.price * item.qty)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Status update */}
                          <div className="bg-surface-container rounded-xl p-4">
                            <label className="block font-label-sm text-secondary uppercase tracking-wider mb-2.5">
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
                                  className={`px-3 py-1.5 rounded-lg font-label-sm transition-all flex items-center gap-1 ${
                                    order.status === s.value
                                      ? `${s.color} ring-2 ring-offset-1 ring-current/20`
                                      : "bg-surface-container-low text-secondary hover:bg-surface-container-high"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">
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
