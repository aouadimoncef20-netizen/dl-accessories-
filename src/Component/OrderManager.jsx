import { useEffect, useState, useRef, useCallback } from "react";
import useProductStore from "../stores/productStore";
import { useToast } from "../Contexts/ToastContext";
import { formatDZD } from "../lib/currency";
import { formatShortDate, totalRevenue } from "../lib/format";
import { bookParcel, fetchLabel } from "../lib/dhd";
import { chargedPrice } from "../lib/productOptions";
import { WILAYAS, wilayaLabel } from "../lib/wilayas";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "confirmed", label: "Confirmed", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
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
  confirmed: "verified",
  processing: "autorenew",
  shipped: "local_shipping",
  delivered: "check_circle",
  cancelled: "cancel",
};

function statusMeta(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

/** How this order is getting to the customer. */
function deliveryLabel(order) {
  if (order.delivery_type === "universite" || order.state === "Université") {
    return "University campus";
  }
  if (
    order.delivery_type === "reghaia" ||
    String(order.state || "").startsWith("Réghaïa")
  ) {
    return "Réghaïa (shop delivery)";
  }
  if (order.delivery_type === "bureau") return "Office pickup";
  return "To the door";
}

/** Campus and Réghaïa orders are delivered by the shop, not DHD. */
function isLocalDelivery(order) {
  return (
    order.delivery_type === "universite" ||
    order.delivery_type === "reghaia" ||
    // Older rows may have lost `delivery_type` but kept the state label.
    order.state === "Université" ||
    String(order.state || "").startsWith("Réghaïa")
  );
}

/**
 * Which of the three checkout modes an order came from. `delivery_type` is
 * what the checkout writes; `state` is the fallback for older rows that
 * predate that column.
 */
function deliveryGroup(order) {
  if (order.delivery_type === "universite" || order.state === "Université") {
    return "universite";
  }
  if (
    order.delivery_type === "reghaia" ||
    String(order.state || "").startsWith("Réghaïa")
  ) {
    return "reghaia";
  }
  return "wilaya";
}

// One entry per filter button. `hint` explains the mode in the button itself,
// so the admin doesn't have to remember which one is free or goes by DHD.
const DELIVERY_FILTERS = [
  {
    value: "all",
    label: "All orders",
    short: "All",
    hint: "Every delivery type",
    icon: "apps",
    iconClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    value: "universite",
    label: "Université",
    short: "Université",
    hint: "Free · shop delivers",
    icon: "school",
    iconClass: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
  {
    value: "reghaia",
    label: "Réghaïa",
    short: "Réghaïa",
    hint: "Town free · 200 DZD outskirts",
    icon: "storefront",
    iconClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  },
  {
    value: "wilaya",
    label: "Wilaya (DHD)",
    short: "Wilaya",
    hint: "Priced by wilaya",
    icon: "local_shipping",
    iconClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
];

function deliveryMeta(order) {
  return (
    DELIVERY_FILTERS.find((f) => f.value === deliveryGroup(order)) ||
    DELIVERY_FILTERS[0]
  );
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

/** Customer text going into a printable page — never raw HTML. */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A blank order for the "take an order by phone" form. */
const EMPTY_NEW_ORDER = {
  name: "",
  phone: "",
  address: "",
  state: "",
  commune: "",
  mode: "wilaya",
  deliveryType: "domicile",
  zone: "ville",
  notes: "",
  lines: [],
};

function OrderManager() {
  const {
    fetchAllOrders,
    updateOrderStatus,
    updateOrder,
    deleteOrder,
    createOrder,
    fetchAllProducts,
    products,
    ordersFromCache,
  } = useProductStore();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const lastOrderCountRef = useRef(0);
  const pollingRef = useRef(null);

  // The edit sheet. `editForm` holds a copy, so closing without saving
  // leaves the order in the list untouched.
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editBusy, setEditBusy] = useState(false);

  // Taking an order by phone. The shop gets a lot of these, and typing one
  // into the customer checkout would lose the customer's account details.
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState(EMPTY_NEW_ORDER);
  const [pickerId, setPickerId] = useState("");
  const [pickerColor, setPickerColor] = useState("");
  const [pickerSize, setPickerSize] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (showNotification = false) => {
    const data = await fetchAllOrders();

    // Check for new orders
    if (showNotification && lastOrderCountRef.current > 0 && data.length > lastOrderCountRef.current) {
      const newCount = data.length - lastOrderCountRef.current;
      setNewOrderCount((prev) => prev + newCount);
      toast.success(`${newCount} new order${newCount > 1 ? "s" : ""} received!`);
      playNotificationSound();

      // Try browser notification. Safari on iOS has no Notification object,
      // so check before touching it — otherwise a new order would crash the
      // whole dashboard with the error screen.
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
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

  const [busyOrderId, setBusyOrderId] = useState(null);

  // Hand one order to the courier by hand. Orders are booked
  // automatically at checkout, so this is the retry path — an order
  // taken while DHD was down, or one placed before this was wired up.
  const handleBook = async (order) => {
    if (!order.commune || !order.wilaya_code) {
      toast.error(
        "DHD needs a commune and a wilaya code. Edit the order and fill them in first."
      );
      return;
    }
    setBusyOrderId(order.id);
    const result = await bookParcel(order.id);
    setBusyOrderId(null);
    if (result.ok) {
      toast.success(result.alreadySent ? "Already booked with DHD" : `DHD booked it — ${result.tracking}`);
    } else {
      toast.error(`DHD refused it: ${result.error}`);
    }
    await load(false);
  };

  const handleLabel = async (tracking) => {
    // Open the tab BEFORE awaiting the label. A window opened after an
    // await is treated as a pop-up and blocked in most browsers.
    const tab = window.open("", "_blank");
    try {
      const { blobUrl, url } = await fetchLabel(tracking);
      const target = blobUrl || url;
      if (!target) throw new Error("DHD did not return a label.");

      if (tab) {
        tab.location.href = target;
      } else {
        // The browser blocked the blank tab anyway — navigate this one.
        window.open(target, "_blank");
      }
      if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      if (tab) tab.close();
      toast.error(`Couldn't get the label: ${String(err?.message || err)}`);
    }
  };

  const hasActiveFilters =
    deliveryFilter !== "all" ||
    statusFilter !== "all" ||
    search.trim() !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const clearFilters = () => {
    setDeliveryFilter("all");
    setStatusFilter("all");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Coerce every field to text: an older or imported row can hold a number
  // in `phone` or `tracking_number`, and calling `.toLowerCase()` on it would
  // take the whole dashboard down with the error screen.
  const query = search.trim().toLowerCase();
  const asText = (value) => String(value ?? "").toLowerCase();

  // A date filter compares days, not timestamps: "to 20/10" must include
  // everything that happened on the 20th.
  const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

  const filtered = orders.filter((o) => {
    if (deliveryFilter !== "all" && deliveryGroup(o) !== deliveryFilter) {
      return false;
    }
    if (statusFilter !== "all" && o.status !== statusFilter) return false;

    if (fromTime || toTime) {
      const created = new Date(o.created_at).getTime();
      if (!Number.isFinite(created)) return false;
      if (fromTime && created < fromTime) return false;
      if (toTime && created > toTime) return false;
    }

    if (query) {
      return (
        asText(o.customer_name).includes(query) ||
        asText(o.phone).includes(query) ||
        asText(o.id).slice(0, 8).includes(query) ||
        asText(o.address).includes(query) ||
        asText(o.tracking_number).includes(query)
      );
    }
    return true;
  });

  // Twenty at a time: a shop that has been running for a year should not
  // render every order it has ever taken.
  const PAGE_SIZE = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // A new search or filter starts again at page one.
  useEffect(() => {
    setPage(1);
  }, [deliveryFilter, statusFilter, search, dateFrom, dateTo]);

  // How many orders are in each delivery group, shown on the big buttons.
  const deliveryCounts = orders.reduce(
    (acc, o) => {
      acc.all += 1;
      acc[deliveryGroup(o)] += 1;
      return acc;
    },
    { all: 0, universite: 0, reghaia: 0, wilaya: 0 }
  );

  const counts = STATUS_VALUES.reduce((acc, status) => {
    acc[status] =
      status === "all"
        ? orders.length
        : orders.filter((o) => o.status === status).length;
    return acc;
  }, {});

  // The status chips count inside the chosen delivery type, so after picking
  // "Université" the admin sees how many campus orders are pending rather
  // than a national total that includes every other mode.
  const statusScoped =
    deliveryFilter === "all"
      ? orders
      : orders.filter((o) => deliveryGroup(o) === deliveryFilter);

  const statusCounts = STATUS_VALUES.reduce((acc, status) => {
    acc[status] =
      status === "all"
        ? statusScoped.length
        : statusScoped.filter((o) => o.status === status).length;
    return acc;
  }, {});

  const handleStatus = async (orderId, newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result?.error) {
      // Say it failed. A green toast on a write that never happened means the
      // parcel never goes out and nobody notices.
      toast.error(
        result.message
          ? `Status not saved: ${result.message}`
          : "Status not saved. Sign in as the admin and try again."
      );
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    toast.success(`Order marked as ${statusMeta(newStatus).label.toLowerCase()}`);
  };

  const openEdit = (order) => {
    setEditing(order);
    setEditForm({
      customer_name: order.customer_name || "",
      phone: order.phone || "",
      address: order.address || "",
      state: order.state || "",
      commune: order.commune || "",
      wilaya_code: order.wilaya_code || "",
      delivery_type: order.delivery_type || "",
      notes: order.notes || "",
      // Read-only: the customer's own message is a record, not something the
      // shop should be able to rewrite.
      customer_note: order.customer_note || "",
    });
  };

  const closeEdit = () => {
    if (editBusy) return;
    setEditing(null);
    setEditForm(null);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing || !editForm) return;

    setEditBusy(true);
    const result = await updateOrder(editing.id, {
      customer_name: editForm.customer_name.trim(),
      phone: editForm.phone.trim(),
      address: editForm.address.trim(),
      state: editForm.state.trim(),
      commune: editForm.commune.trim() || null,
      wilaya_code: editForm.wilaya_code.trim() || null,
      delivery_type: editForm.delivery_type || null,
      notes: editForm.notes.trim() || null,
    });
    setEditBusy(false);

    if (result?.error) {
      toast.error(
        result.message
          ? `Couldn't save: ${result.message}`
          : "Couldn't save the order. Sign in as the admin and try again."
      );
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === editing.id
          ? { ...o, ...editForm, phone_digits: editForm.phone.replace(/\D/g, "") }
          : o
      )
    );
    toast.success("Order updated");
    closeEdit();
  };

  const handleDelete = async (order) => {
    const ref = `#${String(order.id).slice(0, 8)}`;
    if (!window.confirm(`Delete order ${ref}? This cannot be undone.`)) return;

    const result = await deleteOrder(order.id);
    if (result?.error) {
      toast.error(
        result.message
          ? `Couldn't delete: ${result.message}`
          : "Couldn't delete the order."
      );
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    setExpanded(null);
    toast.success(`Order ${ref} deleted`);
  };

  // ── Taking an order by phone ───────────────────────────────────────────
  const openNewOrder = () => {
    setNewOrder(EMPTY_NEW_ORDER);
    setPickerId("");
    setNewOrderOpen(true);
    // The list is usually already loaded by the dashboard; ask again only if
    // it came back empty (a fresh sign-in, or the first tab visited). It has
    // to be the whole catalogue, or a product past the first page can't be
    // put on a phone order at all.
    if (products.length === 0) fetchAllProducts();
  };

  const closeNewOrder = () => {
    if (creating) return;
    setNewOrderOpen(false);
  };

  const addLine = () => {
    const product = products.find((p) => String(p.id) === String(pickerId));
    if (!product) return;

    // A product counted by colour and size is ordered as one combination.
    // Without it the shop cannot pack the parcel, and the stock comes off a
    // row nobody bought.
    const variants = product.variants || [];
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
    if ((colors.length && !pickerColor) || (sizes.length && !pickerSize)) return;

    const color = pickerColor;
    const size = pickerSize;
    const lineKey = `${product.id}::${color}|${size}`;

    setNewOrder((prev) => {
      const existing = prev.lines.find((l) => l.lineKey === lineKey);
      if (existing) {
        return {
          ...prev,
          lines: prev.lines.map((l) =>
            l.lineKey === lineKey ? { ...l, qty: l.qty + 1 } : l
          ),
        };
      }
      return {
        ...prev,
        lines: [
          ...prev.lines,
          {
            lineKey,
            id: product.id,
            name: product.name,
            // What the shop charges today — the database re-prices anyway.
            price: chargedPrice(product),
            qty: 1,
            color,
            size,
          },
        ],
      };
    });
    setPickerId("");
    setPickerColor("");
    setPickerSize("");
  };

  const setLineQty = (lineKey, qty) =>
    setNewOrder((prev) => ({
      ...prev,
      lines: prev.lines.map((l) =>
        l.lineKey === lineKey
          ? { ...l, qty: Math.max(1, Math.min(99, Number(qty) || 1)) }
          : l
      ),
    }));

  const removeLine = (lineKey) =>
    setNewOrder((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.lineKey !== lineKey),
    }));

  // The combinations the picked product is actually sold in, so the shop can
  // record which one the customer asked for.
  const pickedProduct = products.find((p) => String(p.id) === String(pickerId)) || null;
  const pickedVariants = pickedProduct?.variants || [];
  const pickedColors = [...new Set(pickedVariants.map((v) => v.color).filter(Boolean))];
  const pickedSizes = [...new Set(pickedVariants.map((v) => v.size).filter(Boolean))];
  const pickedChoiceMissing =
    (pickedColors.length > 0 && !pickerColor) || (pickedSizes.length > 0 && !pickerSize);

  const manualTotal = newOrder.lines.reduce(
    (sum, l) => sum + l.price * l.qty,
    0
  );

  const manualOrderError = (result) => {
    switch (result?.code) {
      case "out_of_stock":
        return `Not enough stock${result.errorName ? ` of ${result.errorName}` : ""}.`;
      case "no_delivery_price":
        return "No delivery price for that wilaya — set one in the Delivery tab.";
      case "product_not_found":
        return "One of the products is no longer in the catalogue.";
      case "cart_empty":
        return "Add at least one product.";
      case "name_required":
        return "Enter the customer's name.";
      case "coupon_invalid":
        return "That promo code is not valid.";
      default:
        return "The database refused the order. Nothing was saved.";
    }
  };

  const createManualOrder = async (e) => {
    e.preventDefault();
    if (creating) return;

    if (!newOrder.name.trim()) {
      toast.error("Enter the customer's name");
      return;
    }
    if (newOrder.lines.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    if (newOrder.mode === "wilaya" && !newOrder.state) {
      toast.error("Choose a wilaya");
      return;
    }

    // The same shape the checkout sends, so the same server function prices
    // it, checks the stock and applies the delivery rules. The admin does not
    // type a total — the database works it out.
    const delivery =
      newOrder.mode === "universite"
        ? {
            address: newOrder.address.trim(),
            state: "Université",
            commune: null,
            wilaya_code: null,
            delivery_type: "universite",
          }
        : newOrder.mode === "reghaia"
          ? {
              address: newOrder.address.trim(),
              state:
                newOrder.zone === "outskirts"
                  ? "Réghaïa (périphérie)"
                  : "Réghaïa (ville)",
              commune: null,
              wilaya_code: null,
              delivery_type: "reghaia",
            }
          : {
              address: newOrder.address.trim(),
              state: wilayaLabel(newOrder.state),
              commune: newOrder.commune.trim() || null,
              wilaya_code: newOrder.state,
              delivery_type: newOrder.deliveryType,
            };

    setCreating(true);
    const result = await createOrder({
      customer_name: newOrder.name.trim(),
      phone: newOrder.phone.trim(),
      ...delivery,
      mode: newOrder.mode === "universite" ? "university" : newOrder.mode,
      reghaia_zone: newOrder.mode === "reghaia" ? newOrder.zone : null,
      coupon_code: null,
      items: newOrder.lines.map((l) => ({
        id: l.id,
        name: l.name,
        price: l.price,
        qty: l.qty,
        ...(l.color ? { color: l.color } : {}),
        ...(l.size ? { size: l.size } : {}),
      })),
      total: manualTotal,
      status: "pending",
    });
    setCreating(false);

    if (result?.saved === false) {
      toast.error(manualOrderError(result));
      return;
    }

    // place_order() writes the order; the internal note is shop-only, so it
    // is attached afterwards rather than being part of the customer's order.
    if (newOrder.notes.trim() && result?.id) {
      const noteResult = await updateOrder(result.id, {
        notes: newOrder.notes.trim(),
      });
      if (noteResult?.error) {
        toast.info("Order created, but the internal note wasn't saved.");
      }
    }

    toast.success(
      `Order created${result?.total ? ` — ${formatDZD(result.total)}` : ""}`
    );
    setNewOrderOpen(false);
    setNewOrder(EMPTY_NEW_ORDER);
    await load(false);
  };

  /** One row per order, with the customer's number as text so Excel keeps it. */
  const exportCsv = () => {
    const header = [
      "Reference",
      "Date",
      "Customer",
      "Phone",
      "Address",
      "State",
      "Commune",
      "Delivery",
      "Status",
      "Total DZD",
      "Tracking",
    ];

    const cell = (value) => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const rows = filtered.map((o) =>
      [
        `DL-${String(o.id).slice(0, 8).toUpperCase()}`,
        o.created_at ? new Date(o.created_at).toISOString() : "",
        o.customer_name,
        o.phone,
        o.address,
        o.state,
        o.commune,
        deliveryLabel(o),
        o.status,
        o.total,
        o.tracking_number,
      ]
        .map(cell)
        .join(",")
    );

    const csv = [header.join(","), ...rows].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  /** A printable slip for the parcel. */
  const printInvoice = (order) => {
    const tab = window.open("", "_blank");
    if (!tab) {
      toast.error("Allow pop-ups to print the invoice.");
      return;
    }

    const rows = (order.items || [])
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.name)}${item.variant ? ` — ${escapeHtml(item.variant)}` : ""}</td>` +
          `<td style="text-align:center">${item.qty}</td>` +
          `<td style="text-align:right">${formatDZD(item.price * item.qty)}</td></tr>`
      )
      .join("");

    tab.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>DL-${String(order.id).slice(0, 8).toUpperCase()}</title>
<style>
  body { font-family: Arial, sans-serif; color: #111; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #666; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { padding: 8px 4px; border-bottom: 1px solid #ddd; font-size: 13px; text-align: left; }
  .total { font-size: 18px; font-weight: bold; margin-top: 16px; text-align: right; }
</style></head><body>
  <h1>DL Accessories</h1>
  <p class="muted">Order DL-${String(order.id).slice(0, 8).toUpperCase()} · ${escapeHtml(
      order.created_at ? new Date(order.created_at).toLocaleString() : ""
    )}</p>
  <p><strong>${escapeHtml(order.customer_name)}</strong><br>${escapeHtml(
      order.phone || ""
    )}<br>${escapeHtml(order.address || "")}<br>${escapeHtml(
      order.commune ? `${order.commune}, ` : ""
    )}${escapeHtml(order.state || "")}</p>
  <p class="muted">${escapeHtml(deliveryLabel(order))}${
      order.tracking_number ? ` · Tracking ${escapeHtml(order.tracking_number)}` : ""
    }</p>
  <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <p class="total">${formatDZD(order.total)}</p>
  <p class="muted">Cash on delivery.</p>
  <script>window.onload = function () { window.print(); };</script>
</body></html>`);
    tab.document.close();
  };

  return (
    <div className="space-y-6">
      {/* The dashboard is showing this browser's leftover copy, not the real
          orders table — usually because the session isn't the admin account
          the database policies expect. Saying so beats silent emptiness. */}
      {ordersFromCache && (
        <div
          role="status"
          className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 p-4 flex items-start gap-3"
        >
          <span className="material-symbols-outlined text-[20px] text-amber-700 dark:text-amber-400" aria-hidden="true">
            cloud_off
          </span>
          <div className="text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Showing orders saved in this browser only
            </p>
            <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              The database refused the read. Sign in with the store admin
              account (zaki1@dlaccessories.com), then press Refresh.
            </p>
          </div>
        </div>
      )}

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
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
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 lg:flex-none">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-[20px]">
                search
              </span>
              <input
                type="text"
                className="form-input pl-11 pr-4 py-3 text-base w-full lg:w-80"
                placeholder="Search name, phone, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search orders"
              />
            </div>
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="h-12 px-4 flex items-center justify-center gap-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download these orders as a spreadsheet"
            >
              <span className="material-symbols-outlined text-[22px] text-secondary">download</span>
              <span className="hidden sm:inline text-sm font-semibold text-secondary">CSV</span>
            </button>
            <button
              onClick={() => load(false)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex-shrink-0"
              title="Refresh orders"
              aria-label="Refresh orders"
            >
              <span className="material-symbols-outlined text-[22px] text-secondary">refresh</span>
            </button>
            <button
              onClick={openNewOrder}
              className="h-12 px-4 flex items-center justify-center gap-2 rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity flex-shrink-0"
              title="Take an order by phone"
            >
              <span className="material-symbols-outlined text-[22px]">add</span>
              <span className="hidden sm:inline text-sm font-semibold">New order</span>
            </button>
          </div>
        </div>

        {/* Delivery type — the three checkout modes, plus everything */}
        <div className="mb-6">
          <h3 className="font-label-sm text-secondary uppercase tracking-wider mb-3">
            Delivery type
          </h3>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3"
            role="group"
            aria-label="Filter by delivery type"
          >
            {DELIVERY_FILTERS.map((f) => {
              const selected = deliveryFilter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setDeliveryFilter(f.value)}
                  aria-pressed={selected}
                  className={`flex items-center gap-3 p-3 md:p-4 min-h-[72px] rounded-xl border-2 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-outline-variant/25 bg-surface-container-low hover:border-primary/40 hover:bg-surface-container"
                  }`}
                >
                  <span
                    className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${f.iconClass}`}
                  >
                    <span className="material-symbols-outlined text-[20px] md:text-[22px]">
                      {f.icon}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-label-md text-on-surface text-sm md:text-base font-semibold truncate">
                      {f.label}
                    </span>
                    <span className="block text-[11px] md:text-xs text-secondary truncate">
                      {f.hint}
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold flex-shrink-0 ${
                      selected
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-secondary"
                    }`}
                  >
                    {deliveryCounts[f.value]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Order status */}
        <div className="mb-5">
          <h3 className="font-label-sm text-secondary uppercase tracking-wider mb-3">
            Order status
          </h3>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by order status"
          >
            {STATUS_VALUES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
                className={`px-4 py-2.5 min-h-[44px] rounded-full font-label-sm text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  statusFilter === s
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container text-secondary hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {s === "all" ? "list_alt" : STATUS_ICONS[s]}
                </span>
                {s === "all" ? "All statuses" : statusMeta(s).label}
                {statusCounts[s] > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold ${
                      statusFilter === s ? "bg-white/20" : "bg-outline-variant/20"
                    }`}
                  >
                    {statusCounts[s]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Date range — "what came in this week?" is the question the admin
            actually asks; a search box can't answer it. */}
        <div className="mb-5">
          <h3 className="font-label-sm text-secondary uppercase tracking-wider mb-3">
            Order date
          </h3>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <label className="flex-1">
              <span className="sr-only">From date</span>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="form-input w-full min-h-[44px] font-body-md"
              />
            </label>
            <span className="hidden sm:flex items-center text-secondary" aria-hidden="true">
              →
            </span>
            <label className="flex-1">
              <span className="sr-only">To date</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="form-input w-full min-h-[44px] font-body-md"
              />
            </label>
          </div>
        </div>

        {/* Result count and a way back out of the filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-3 border-t border-outline-variant/10">
          <p className="font-body-md text-sm text-secondary">
            Showing{" "}
            <span className="font-semibold text-on-surface">
              {filtered.length === 0 ? 0 : pageStart + 1}–{pageStart + visible.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-on-surface">{filtered.length}</span>{" "}
            {filtered.length === orders.length ? "orders" : `matching orders (${orders.length} total)`}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              Clear filters
            </button>
          )}
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
              {hasActiveFilters ? "search_off" : "receipt_long"}
            </span>
            <p className="font-body-md text-secondary mb-1">
              {hasActiveFilters
                ? "No orders match your filters"
                : "No orders yet"}
            </p>
            <p className="text-xs text-outline-variant">
              {hasActiveFilters
                ? "Try another delivery type, status or search"
                : "Orders will appear here automatically when customers place them"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((order) => {
              const meta = statusMeta(order.status);
              const dMeta = deliveryMeta(order);
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

                    <span
                      className={`hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-[10px] uppercase tracking-wider flex-shrink-0 ${dMeta.badgeClass}`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {dMeta.icon}
                      </span>
                      {dMeta.short}
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
                            <div className="flex justify-between">
                              <span className="text-secondary">Commune</span>
                              <span className="text-on-surface font-medium">{order.commune || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Delivery</span>
                              <span className="text-on-surface font-medium">
                                {deliveryLabel(order)}
                              </span>
                            </div>
                            {order.customer_note && (
                              <div className="rounded-lg bg-primary-container/15 border border-primary/20 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wider text-secondary mb-0.5">
                                  Customer's comment
                                </p>
                                <p className="text-sm text-on-surface whitespace-pre-wrap">
                                  {order.customer_note}
                                </p>
                              </div>
                            )}
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
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-outline-variant/20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  printInvoice(order);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high font-label-sm transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">print</span>
                                Invoice
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(order);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high font-label-sm transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(order);
                                }}
                                className="px-3 py-1.5 rounded-lg text-error bg-error/5 hover:bg-error/10 font-label-sm transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── The courier ──
                          Campus and Réghaïa orders are delivered by the
                          shop, so they have no DHD parcel and no tracking
                          number. Wilaya orders are booked automatically at
                          checkout; this is normally just a readout, and a
                          fix-it panel when the booking failed. */}
                      <div className="mt-6 pt-6 border-t border-outline-variant/10">
                        <h4 className="font-label-sm text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-3">
                          <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                          {isLocalDelivery(order) ? "Shop delivery" : "DHD Delivery"}
                        </h4>
                        {isLocalDelivery(order) ? (
                          <div className="bg-surface-container rounded-xl p-4">
                            <p className="text-sm text-secondary">
                              Delivered by the shop — no DHD parcel is created for this order.
                            </p>
                          </div>
                        ) : (
                        <div className="bg-surface-container rounded-xl p-4 flex flex-wrap items-center gap-3">
                          {order.tracking_number ? (
                            <>
                              <div className="flex-1 min-w-[180px]">
                                <p className="text-[11px] text-secondary uppercase tracking-wider">Tracking</p>
                                <p className="font-headline-sm text-primary">{order.tracking_number}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleLabel(order.tracking_number); }}
                                className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high font-label-sm transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[16px]">print</span>
                                Label
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 min-w-[180px]">
                                {order.dhd_status === "failed" ? (
                                  <p className="text-sm text-error">
                                    DHD refused this order
                                    {order.dhd_error ? `: ${order.dhd_error}` : "."}
                                  </p>
                                ) : (
                                  <p className="text-sm text-secondary">Not booked with DHD yet.</p>
                                )}
                                {/* Both are required by the courier's API —
                                    without them the button cannot work. */}
                                {(!order.commune || !order.wilaya_code) && (
                                  <p className="text-[11px] text-secondary mt-1">
                                    This order has no commune or wilaya code, which DHD requires.
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleBook(order); }}
                                disabled={busyOrderId === order.id || !order.commune || !order.wilaya_code}
                                title={
                                  !order.commune || !order.wilaya_code
                                    ? "Edit the order and add the commune and wilaya code first"
                                    : undefined
                                }
                                className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 font-label-sm transition-opacity flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="material-symbols-outlined text-[16px]">send</span>
                                {busyOrderId === order.id ? "Sending…" : "Send to DHD"}
                              </button>
                            </>
                          )}
                        </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pageCount > 1 && (
          <div className="flex items-center justify-between gap-3 pt-5 mt-2 border-t border-outline-variant/10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl font-label-sm text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              Previous
            </button>
            <span className="font-label-sm text-secondary">
              Page {currentPage} of {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage === pageCount}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl font-label-sm text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Edit an order ──────────────────────────────────────────────
          Most edits are the customer's address or a missing commune that
          DHD needs. The total and the items are not editable here: those
          came from the shop's own prices, and changing them in a form
          would break the numbers the customer was shown. */}
      {editing && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-order-title"
            className="w-full sm:max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/20 sticky top-0 bg-surface z-10">
              <h2 id="edit-order-title" className="font-headline-sm text-headline-sm">
                Edit order #{String(editing.id).slice(0, 8)}
              </h2>
              <button
                type="button"
                onClick={closeEdit}
                disabled={editBusy}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={saveEdit} className="p-5 space-y-4">
              <label className="block">
                <span className="block font-label-sm text-secondary mb-1">Customer name</span>
                <input
                  type="text"
                  required
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, customer_name: e.target.value }))}
                  className="form-input w-full font-body-md"
                />
              </label>

              <label className="block">
                <span className="block font-label-sm text-secondary mb-1">Phone</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="form-input w-full font-body-md"
                />
              </label>

              <label className="block">
                <span className="block font-label-sm text-secondary mb-1">Address</span>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="form-input w-full font-body-md resize-none"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block font-label-sm text-secondary mb-1">Wilaya</span>
                  <select
                    value={editForm.wilaya_code || ""}
                    onChange={(e) => {
                      const code = e.target.value;
                      const wilaya = WILAYAS.find((w) => w.code === code);
                      setEditForm((f) => ({
                        ...f,
                        wilaya_code: code,
                        // Keep the human label in step with the code the
                        // courier actually uses.
                        state: wilaya ? `${wilaya.code} - ${wilaya.name}` : f.state,
                      }));
                    }}
                    className="form-input w-full font-body-md"
                  >
                    <option value="">—</option>
                    {WILAYAS.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block font-label-sm text-secondary mb-1">Commune</span>
                  <input
                    type="text"
                    value={editForm.commune}
                    onChange={(e) => setEditForm((f) => ({ ...f, commune: e.target.value }))}
                    className="form-input w-full font-body-md"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block font-label-sm text-secondary mb-1">Delivery</span>
                <select
                  value={editForm.delivery_type || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, delivery_type: e.target.value }))}
                  className="form-input w-full font-body-md"
                >
                  <option value="">—</option>
                  <option value="domicile">To the door (DHD)</option>
                  <option value="bureau">Office pickup (DHD)</option>
                  <option value="reghaia">Réghaïa (shop)</option>
                  <option value="universite">University (shop)</option>
                </select>
              </label>

              {editForm.customer_note ? (
                <div className="rounded-xl bg-primary-container/15 border border-primary/20 p-4">
                  <p className="font-label-sm text-secondary mb-1">
                    What the customer wrote
                  </p>
                  <p className="text-sm text-on-surface whitespace-pre-wrap">
                    {editForm.customer_note}
                  </p>
                </div>
              ) : null}

              <label className="block">
                <span className="block font-label-sm text-secondary mb-1">
                  Internal note
                </span>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  className="form-input w-full font-body-md resize-none"
                  placeholder="Only the shop sees this"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={editBusy}
                  className="flex-1 py-3 rounded-xl border border-outline-variant/50 font-label-md text-secondary hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editBusy}
                  className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-label-md hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {editBusy && (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {editBusy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Take an order by phone ─────────────────────────────────────
          Same three delivery modes as the checkout, and the same server
          function: place_order() prices it, checks the stock and takes it,
          so a hand-typed order can never disagree with a web one. */}
      {newOrderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={closeNewOrder}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-order-title"
            className="w-full sm:max-w-2xl bg-surface rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/20 sticky top-0 bg-surface z-10">
              <h2 id="new-order-title" className="font-headline-sm text-headline-sm">
                New order
              </h2>
              <button
                type="button"
                onClick={closeNewOrder}
                disabled={creating}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={createManualOrder} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block font-label-sm text-secondary mb-1">Customer name</span>
                  <input
                    type="text"
                    required
                    value={newOrder.name}
                    onChange={(e) => setNewOrder((n) => ({ ...n, name: e.target.value }))}
                    className="form-input w-full font-body-md"
                  />
                </label>
                <label className="block">
                  <span className="block font-label-sm text-secondary mb-1">Phone</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={newOrder.phone}
                    onChange={(e) => setNewOrder((n) => ({ ...n, phone: e.target.value }))}
                    className="form-input w-full font-body-md"
                    placeholder="0555 12 34 56"
                  />
                </label>
              </div>

              {/* Delivery mode */}
              <fieldset>
                <legend className="block font-label-sm text-secondary mb-2">Delivery</legend>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "universite", label: "Université" },
                    { value: "reghaia", label: "Réghaïa" },
                    { value: "wilaya", label: "Wilaya" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={newOrder.mode === option.value}
                      onClick={() => setNewOrder((n) => ({ ...n, mode: option.value }))}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors min-h-[44px] ${
                        newOrder.mode === option.value
                          ? "border-primary bg-primary-container/10 text-primary"
                          : "border-outline-variant/30 text-secondary hover:bg-surface-container"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="block font-label-sm text-secondary mb-1">Address</span>
                <input
                  type="text"
                  value={newOrder.address}
                  onChange={(e) => setNewOrder((n) => ({ ...n, address: e.target.value }))}
                  className="form-input w-full font-body-md"
                  placeholder={
                    newOrder.mode === "universite"
                      ? "Campus, faculty…"
                      : "Street, quartier, building…"
                  }
                />
              </label>

              {newOrder.mode === "reghaia" && (
                <label className="block">
                  <span className="block font-label-sm text-secondary mb-1">Zone</span>
                  <select
                    value={newOrder.zone}
                    onChange={(e) => setNewOrder((n) => ({ ...n, zone: e.target.value }))}
                    className="form-input w-full font-body-md"
                  >
                    <option value="ville">Réghaïa ville (free)</option>
                    <option value="outskirts">Périphérie</option>
                  </select>
                </label>
              )}

              {newOrder.mode === "wilaya" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block font-label-sm text-secondary mb-1">Wilaya</span>
                    <select
                      required
                      value={newOrder.state}
                      onChange={(e) => setNewOrder((n) => ({ ...n, state: e.target.value }))}
                      className="form-input w-full font-body-md"
                    >
                      <option value="">—</option>
                      {WILAYAS.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.code} - {w.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block font-label-sm text-secondary mb-1">Commune</span>
                    <input
                      type="text"
                      value={newOrder.commune}
                      onChange={(e) => setNewOrder((n) => ({ ...n, commune: e.target.value }))}
                      className="form-input w-full font-body-md"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="block font-label-sm text-secondary mb-1">Drop-off</span>
                    <select
                      value={newOrder.deliveryType}
                      onChange={(e) => setNewOrder((n) => ({ ...n, deliveryType: e.target.value }))}
                      className="form-input w-full font-body-md"
                    >
                      <option value="domicile">To the door (DHD)</option>
                      <option value="bureau">Office pickup (DHD)</option>
                    </select>
                  </label>
                </div>
              )}

              {/* Products */}
              <div className="rounded-xl bg-surface-container-low p-3 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={pickerId}
                    onChange={(e) => {
                      setPickerId(e.target.value);
                      setPickerColor("");
                      setPickerSize("");
                    }}
                    className="form-input flex-1 font-body-md"
                    aria-label="Product to add"
                  >
                    <option value="">Add a product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatDZD(p.price)}
                        {typeof p.stock === "number" ? ` (${p.stock} left)` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addLine}
                    disabled={!pickerId || pickedChoiceMissing}
                    className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>

                {(pickedColors.length > 0 || pickedSizes.length > 0) && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {pickedColors.length > 0 && (
                      <label className="block flex-1">
                        <span className="block font-label-sm text-secondary mb-1">Colour</span>
                        <select
                          value={pickerColor}
                          onChange={(e) => setPickerColor(e.target.value)}
                          className="form-input w-full font-body-md"
                        >
                          <option value="">Choose…</option>
                          {pickedColors.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {pickedSizes.length > 0 && (
                      <label className="block flex-1">
                        <span className="block font-label-sm text-secondary mb-1">Size</span>
                        <select
                          value={pickerSize}
                          onChange={(e) => setPickerSize(e.target.value)}
                          className="form-input w-full font-body-md"
                        >
                          <option value="">Choose…</option>
                          {pickedSizes.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}

                {newOrder.lines.length === 0 ? (
                  <p className="text-sm text-secondary text-center py-3">
                    No products added yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {newOrder.lines.map((line) => (
                      <div
                        key={line.lineKey || line.id}
                        className="flex items-center gap-3 bg-surface rounded-lg px-3 py-2"
                      >
                        <span className="flex-1 text-sm text-on-surface truncate">
                          {line.name}
                          {(line.color || line.size) && (
                            <span className="text-secondary">
                              {" — "}
                              {[line.color, line.size].filter(Boolean).join(" / ")}
                            </span>
                          )}
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={line.qty}
                          onChange={(e) => setLineQty(line.lineKey, e.target.value)}
                          className="w-16 form-input py-1 text-sm text-center"
                          aria-label={`Quantity of ${line.name}`}
                        />
                        <span className="w-24 text-sm text-primary text-right">
                          {formatDZD(line.price * line.qty)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLine(line.lineKey)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-error hover:bg-error/10"
                          aria-label={`Remove ${line.name}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-outline-variant/20 text-sm">
                      <span className="text-secondary">Items</span>
                      <span className="font-semibold text-on-surface">
                        {formatDZD(manualTotal)}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary">
                      Delivery and any discount are worked out by the database when
                      the order is saved.
                    </p>
                  </div>
                )}
              </div>

              <label className="block">
                <span className="block font-label-sm text-secondary mb-1">
                  Internal note
                </span>
                <textarea
                  rows={2}
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder((n) => ({ ...n, notes: e.target.value }))}
                  className="form-input w-full font-body-md resize-none"
                  placeholder="Only the shop sees this"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeNewOrder}
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl border border-outline-variant/50 font-label-md text-secondary hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-label-md hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creating && (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {creating ? "Creating…" : "Create order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderManager;
