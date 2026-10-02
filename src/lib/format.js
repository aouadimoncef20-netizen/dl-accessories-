// ════════════════════════════════════════════════════════════
//  Small formatting helpers shared by the admin screens.
// ════════════════════════════════════════════════════════════

/** "12 Mar, 09:40" — the timestamp style used across the dashboard. */
export function formatShortDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Takings from every order that was not cancelled. */
export function totalRevenue(orders) {
  return (orders || [])
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total || 0), 0);
}
