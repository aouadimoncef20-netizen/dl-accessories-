import { useEffect, useMemo, useState } from "react";
import useProductStore from "../stores/productStore";
import { formatDZD } from "../lib/currency";
import { formatShortDate } from "../lib/format";

/*
 * Customers are not a separate table — they are the people who placed the
 * orders. Grouping the order list by phone number answers the questions the
 * shop actually has: who orders often, who is new, and how to call them back.
 */

const phoneKey = (order) =>
  String(order.phone_digits || order.phone || "")
    .replace(/\D/g, "")
    .trim();

/** 0555 12 34 56 → wa.me/213555123456 */
function whatsappHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const international = digits.startsWith("0")
    ? `213${digits.slice(1)}`
    : digits.startsWith("213")
      ? digits
      : `213${digits}`;
  return `https://wa.me/${international}`;
}

function buildCustomers(orders) {
  const map = new Map();

  // Orders arrive newest first, so the first order seen for a phone is the
  // most recent one and supplies the customer's current name and address.
  for (const order of orders) {
    const key = phoneKey(order) || `name:${order.customer_name || "unknown"}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        name: order.customer_name || "—",
        phone: order.phone || "",
        address: order.address || "",
        state: order.state || "",
        commune: order.commune || "",
        orders: [order],
        total: Number(order.total) || 0,
        lastAt: order.created_at,
      });
      continue;
    }

    existing.orders.push(order);
    existing.total += Number(order.total) || 0;
    // Keep the newest address, but fill in a blank one from an older order.
    existing.address = existing.address || order.address || "";
    existing.state = existing.state || order.state || "";
    existing.commune = existing.commune || order.commune || "";
    existing.phone = existing.phone || order.phone || "";
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );
}

function CustomerManager() {
  const fetchAllOrders = useProductStore((s) => s.fetchAllOrders);
  const ordersFromCache = useProductStore((s) => s.ordersFromCache);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchAllOrders().then((data) => {
      if (!alive) return;
      setOrders(data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [fetchAllOrders]);

  const customers = useMemo(() => buildCustomers(orders), [orders]);

  const query = search.trim().toLowerCase();
  const filtered = customers.filter(
    (c) =>
      !query ||
      String(c.name).toLowerCase().includes(query) ||
      String(c.phone).toLowerCase().includes(query) ||
      String(c.address).toLowerCase().includes(query)
  );

  const repeat = customers.filter((c) => c.orders.length > 1).length;
  const lifetime = customers.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="space-y-6">
      {ordersFromCache && (
        <div
          role="status"
          className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 p-4 text-sm text-amber-900 dark:text-amber-200"
        >
          These customers come from the orders saved in this browser. Sign in
          with the store admin account and refresh to see everyone.
        </div>
      )}

      <div>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-1">
          Customers
        </h1>
        <p className="font-body-md text-secondary">
          Everyone who has ordered, newest first.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Customers", value: customers.length, icon: "group" },
          { label: "Repeat buyers", value: repeat, icon: "favorite" },
          { label: "Lifetime value", value: formatDZD(lifetime), icon: "payments" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-surface rounded-2xl p-5 soft-glow flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-primary-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px] text-primary">
                {s.icon}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-display-lg text-[22px] text-on-surface truncate">
                {s.value}
              </p>
              <p className="font-label-sm text-secondary uppercase tracking-wider">
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-2xl p-5 md:p-6 soft-glow">
        <div className="relative mb-5">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-11 pr-4 py-3 text-base w-full"
            placeholder="Search by name, phone or address"
            aria-label="Search customers"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-body-md text-secondary">Loading customers…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-3 block">
              group
            </span>
            <p className="font-body-md text-secondary">
              {customers.length === 0
                ? "No customers yet — they appear after the first order."
                : "No customers match your search."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((customer) => {
              const open = expanded === customer.key;
              const wa = whatsappHref(customer.phone);

              return (
                <div
                  key={customer.key}
                  className="rounded-2xl bg-surface-container-low border border-outline-variant/10 overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 md:p-4">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : customer.key)}
                      aria-expanded={open}
                      className="flex flex-1 items-center gap-3 text-start min-w-0"
                    >
                      <div className="w-11 h-11 rounded-full bg-primary-container/25 flex items-center justify-center flex-shrink-0">
                        <span className="font-label-md text-primary">
                          {String(customer.name || "?").trim().charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-label-md text-on-surface truncate">
                          {customer.name}
                        </p>
                        <p className="text-[11px] text-secondary truncate">
                          {customer.phone || "No phone"} ·{" "}
                          {customer.state || "—"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-label-md text-primary">
                          {formatDZD(customer.total)}
                        </p>
                        <p className="text-[11px] text-secondary">
                          {customer.orders.length} order
                          {customer.orders.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span
                        className={`material-symbols-outlined text-secondary transition-transform ${open ? "rotate-90" : ""}`}
                        aria-hidden="true"
                      >
                        chevron_right
                      </span>
                    </button>

                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 transition-colors flex-shrink-0"
                        aria-label={`Message ${customer.name} on WhatsApp`}
                        title="Message on WhatsApp"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          chat
                        </span>
                      </a>
                    )}
                  </div>

                  {open && (
                    <div className="px-3 pb-3 md:px-4 md:pb-4 pt-0 border-t border-outline-variant/10">
                      <div className="pt-3 space-y-2">
                        {customer.address && (
                          <p className="text-sm text-secondary">
                            <span className="text-on-surface-variant">
                              Address:
                            </span>{" "}
                            {customer.address}
                            {customer.commune ? `, ${customer.commune}` : ""}
                          </p>
                        )}
                        <div className="space-y-1.5 pt-1">
                          {customer.orders.map((order) => (
                            <div
                              key={order.id}
                              className="flex items-center gap-3 text-sm bg-surface-container rounded-xl p-2.5"
                            >
                              <span className="font-label-sm text-secondary uppercase">
                                #{String(order.id).slice(0, 8)}
                              </span>
                              <span className="text-[11px] text-secondary">
                                {formatShortDate(order.created_at)}
                              </span>
                              <span className="text-[11px] text-secondary">
                                {order.items?.length || 0} item
                                {(order.items?.length || 0) === 1 ? "" : "s"}
                              </span>
                              <span className="ms-auto font-label-sm text-primary">
                                {formatDZD(order.total)}
                              </span>
                            </div>
                          ))}
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

export default CustomerManager;
