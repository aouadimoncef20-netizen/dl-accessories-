/**
 * ── How an order is priced ───────────────────────────────────────────────
 * One place to change delivery and tax. The basket, the cart summary and the
 * checkout all read from here, so they can never disagree with each other.
 *
 * Delivery is priced BY WILAYA, from the courier's own price card — one number
 * per wilaya, not four rough bands. The 58 numbers below are that card,
 * photographed at the DHD desk. They are dinars, like every other price in the
 * shop: the number here is the number the customer pays.
 *
 * Two ways to receive a parcel, two prices:
 *   • to the door   → `WILAYA_HOME_PRICES`, straight off the card
 *   • stop desk     → the same card, plus the shop's stop-desk surcharge
 *
 * ──  THE ADMIN EDITS THESE IN THE DASHBOARD, NOT HERE  ──
 * The live prices are rows in `delivery_zones` (Admin → Delivery). This table
 * is the fallback for the first paint, for a database that hasn't had
 * SUPABASE_UPGRADE.sql run yet, and for an offline visitor. place_order()
 * prices the order from the same table, so the server never has to trust a
 * number the browser worked out.
 */

/**
 * What the courier charges to bring a parcel to the customer's door, by wilaya
 * code (the official two-digit number — see src/lib/wilayas.js for the names).
 */
export const WILAYA_HOME_PRICES = {
  "01": 1100, "02": 700, "03": 900, "04": 800, "05": 800,
  "06": 700, "07": 900, "08": 1100, "09": 500, "10": 650,
  "11": 1300, "12": 800, "13": 800, "14": 800, "15": 650,
  "16": 400, "17": 900, "18": 700, "19": 700, "20": 800,
  "21": 700, "22": 700, "23": 800, "24": 800, "25": 700,
  "26": 700, "27": 700, "28": 800, "29": 700, "30": 1000,
  "31": 700, "32": 1000, "33": 1300, "34": 700, "35": 600,
  "36": 800, "37": 1300, "38": 800, "39": 900, "40": 800,
  "41": 800, "42": 600, "43": 700, "44": 700, "45": 1000,
  "46": 700, "47": 1000, "48": 700, "49": 1300, "50": 900,
  "51": 1300, "52": 1300, "53": 1300, "54": 900, "55": 900,
  "56": 900, "57": 1000, "58": 1000,
};

/**
 * Collecting a parcel from the courier's desk costs less to run than a door
 * drop, so the shop adds a flat amount on top of the card price instead of
 * reprinting 58 numbers.
 *
 * Blida, Boumerdès and Tipaza are the shop's own doorstep — the driver is
 * already going there — so their desk parcels carry the larger surcharge.
 */
export const STOP_DESK_EXTRA_DZD = 100;
export const STOP_DESK_EXTRA_LOCAL_DZD = 150;
export const STOP_DESK_LOCAL_WILAYAS = ["09", "35", "42"];

/**
 * ── The shop's own deliveries ────────────────────────────────────────────
 * Two kinds of order never go through DHD: university campuses and Réghaïa.
 * The shop delivers those itself, so they are their own checkout modes with
 * their own prices instead of a wilaya band.
 */

/**
 * The campuses we deliver to ourselves, free of charge.
 *
 * `name` is what the customer picks and what lands on the order; `city` is
 * the extra line that helps the driver find it. Add or remove a line and the
 * checkout menu follows — this list is the only place to edit it.
 */
export const UNIVERSITY_CAMPUSES = [
  { code: "usthb", name: "USTHB", city: "Bab Ezzouar, Alger" },
  { code: "ummto", name: "UMMTO", city: "Tizi Ouzou" },
  { code: "unim", name: "UNIM", city: "" },
  { code: "inch", name: "INCH", city: "" },
  { code: "ingm", name: "INGM", city: "" },
  { code: "kolea", name: "Koléa", city: "Tipaza" },
  { code: "alger1", name: "Université d'Alger 1", city: "Alger" },
  { code: "alger2", name: "Université d'Alger 2", city: "Alger" },
];

/** What a delivery outside Réghaïa town costs, in dinars. */
export const REGHAIA_OUTSKIRTS_DZD = 200;

/** The campus behind a code, or undefined if the code isn't one. */
export function findUniversity(code) {
  return UNIVERSITY_CAMPUSES.find((c) => c.code === code);
}

/**
 * The three ways an order can reach a customer. The checkout asks for one of
 * these first, then shows only the fields that mode needs — a campus order
 * has no wilaya, a Réghaïa order has no commune.
 */
export const DELIVERY_MODES = {
  UNIVERSITY: "university",
  REGHAIA: "reghaia",
  WILAYA: "wilaya",
};

/**
 * What delivery costs for the chosen checkout mode, in dinars, or null while
 * the answer still depends on a missing field.
 *
 *   University → free (the shop delivers)
 *   Réghaïa    → free in town, 200 DZD in the outskirts
 *   Wilaya     → the band price for that wilaya
 */
export function deliveryForCheckout({
  mode,
  wilayaCode,
  reghaiaZone,
  deliveryType = "domicile",
} = {}) {
  if (mode === DELIVERY_MODES.UNIVERSITY) return 0;
  if (mode === DELIVERY_MODES.REGHAIA) {
    return reghaiaZone === "outskirts" ? REGHAIA_OUTSKIRTS_DZD : 0;
  }
  if (mode === DELIVERY_MODES.WILAYA) return feeForWilaya(wilayaCode, deliveryType);
  return null;
}

/**
 * Kept for the older basket code paths that still pass a "free point".
 * The checkout now reads UNIVERSITY_CAMPUSES directly.
 */
export const FREE_DELIVERY_POINTS = [
  { code: "reghaia", name: "Réghaïa (ville)" },
  ...UNIVERSITY_CAMPUSES.map((c) => ({ code: c.code, name: c.name })),
];

/** The name of a free-delivery point, or "" if that code isn't one. */
export function freePointName(code) {
  const point = FREE_DELIVERY_POINTS.find((p) => p.code === code);
  return point ? point.name : "";
}

/** Baskets of at least this many DZD get free delivery. 0 = no threshold. */
export const FREE_DELIVERY_OVER_DZD = 0;

/** Percentage added to the order. 0 = no tax line is shown at all. 19 = TVA. */
export const TAX_PERCENT = 0;

/**
 * The two-digit wilaya code, however it arrived ("16", " 16 ", 16).
 * An unknown code comes back as "" — which is never mistaken for a price.
 */
export function normalizeWilayaCode(code) {
  return String(code ?? "").replace(/\D/g, "").slice(0, 2).padStart(2, "0");
}

/**
 * What the card says for a door delivery in this wilaya, in dinars — or null
 * when we have no such wilaya.
 */
export function homePriceFor(code) {
  const key = normalizeWilayaCode(code);
  if (!key || key === "00") return null;
  const price = WILAYA_HOME_PRICES[key];
  return typeof price === "number" ? price : null;
}

/** How much the shop adds for a desk collection in this wilaya. */
export function stopDeskExtraFor(code) {
  return STOP_DESK_LOCAL_WILAYAS.includes(normalizeWilayaCode(code))
    ? STOP_DESK_EXTRA_LOCAL_DZD
    : STOP_DESK_EXTRA_DZD;
}

/** What a stop-desk delivery to this wilaya costs, in dinars. */
export function stopDeskPriceFor(code) {
  const home = homePriceFor(code);
  if (home === null) return null;
  return home + stopDeskExtraFor(code);
}

/**
 * What delivery to this wilaya costs, in dinars — or null when we don't yet
 * know where the order is going, which is the normal state on the basket page.
 *
 * Null is deliberately not the same as 0. Zero means "this customer pays
 * nothing for delivery"; null means "nobody has told us the address", and the
 * screens must say so rather than quietly showing a free delivery.
 *
 * `deliveryType` is 'domicile' (to the door, the default) or 'bureau' (the
 * customer collects it from the courier's desk).
 */
export function feeForWilaya(code, deliveryType = "domicile") {
  if (!code) return null;
  return deliveryType === "bureau" ? stopDeskPriceFor(code) : homePriceFor(code);
}

/**
 * What delivery costs for this basket, in dinars. Everything here is already
 * dinars — the basket, the card, the threshold — so nothing is converted.
 */
export function deliveryFor(subtotal, wilayaCode, pointCode, deliveryType = "domicile") {
  // A free delivery point settles it on its own — it doesn't matter which
  // wilaya the campus is in, so we don't even look at the price card.
  if (freePointName(pointCode)) return 0;

  const fee = feeForWilaya(wilayaCode, deliveryType);
  if (fee === null) return null;

  // A wilaya priced at 0 is a wilaya that ships free.
  if (fee <= 0) return 0;

  if (FREE_DELIVERY_OVER_DZD > 0 && subtotal >= FREE_DELIVERY_OVER_DZD) return 0;
  return fee;
}

/** What tax is added on top of this amount. */
export function taxFor(amount) {
  if (TAX_PERCENT <= 0) return 0;
  return Number(amount) * (TAX_PERCENT / 100);
}

/** True when the customer should see a tax row in their order summary. */
export const SHOW_TAX_LINE = TAX_PERCENT > 0;
