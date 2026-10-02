/**
 * ── How an order is priced ───────────────────────────────────────────────
 * One place to change delivery and tax. The basket, the cart summary and the
 * checkout all read from here, so they can never disagree with each other.
 *
 * Delivery is priced BY WILAYA. Keeping 58 separate prices would be 58 things
 * to get wrong, so the wilayas are grouped into four bands — change a band's
 * `dzd` and every wilaya listed under it moves with it.
 *
 *        ▶  THE NUMBERS TO CHECK ARE THE `dzd` VALUES BELOW  ◀
 *
 * They are starting figures, not your courier's card, so read them off against
 * what you actually pay before going live. They are dinars, like every other
 * price in the shop — the number here is the number the customer pays.
 *
 * Decided 2 October 2026:
 *   • Four bands, priced per wilaya, delivering anywhere in the country.
 *   • No tax line. The price shown on the product is the price paid, which is
 *     how Algerian shops normally present it — nice and simple for a customer
 *     paying cash on the doorstep.
 *
 * To move a wilaya between bands, cut its code from one `wilayas` list and
 * paste it into another. The code for a name is in src/lib/wilayas.js. Every
 * wilaya from 01 to 58 must appear in exactly one band — a wilaya that is
 * missing from all four can be chosen at checkout but has no price, and the
 * order cannot be completed.
 */

/**
 * One entry per delivery band. `dzd` is what the customer pays; `wilayas`
 * holds the official codes of every wilaya in that band.
 */
export const DELIVERY_ZONES = [
  {
    key: "centre",
    dzd: 400,
    // Alger and the ring of wilayas a courier rides out to the same day.
    wilayas: ["09", "16", "35", "42"],
  },
  {
    key: "north",
    dzd: 600,
    // The northern belt — the coast and the plains behind it.
    wilayas: [
      "02", "04", "05", "06", "10", "12", "13", "14", "15", "18",
      "19", "21", "22", "23", "24", "25", "26", "27", "29", "31",
      "34", "36", "40", "41", "43", "44", "46", "48",
    ],
  },
  {
    key: "plateau",
    dzd: 800,
    // The high plateaux and the northern edge of the desert.
    wilayas: [
      "03", "07", "08", "17", "20", "28", "30", "32",
      "38", "39", "45", "47", "51", "55", "57", "58",
    ],
  },
  {
    key: "south",
    dzd: 1200,
    // The deep south — the long hauls.
    wilayas: ["01", "11", "33", "37", "49", "50", "52", "53", "54", "56"],
  },
];

/**
 * ── Places that always ship free ─────────────────────────────────────────
 * Delivery costs the customer nothing to these, whichever wilaya they sit in
 * — the shop covers the courier. UMMTO is in Tizi Ouzou and Koléa is in
 * Tipaza, so this can't be done with the wilaya prices above; it needs its
 * own list.
 *
 * The customer picks one at checkout, which is the point: a typed address
 * can't be trusted for this. "USTHB", "usthb" and "Bab Ezzouar" would
 * otherwise be one free delivery and two paid ones for the same campus.
 *
 * Add or remove a line and the checkout menu follows.
 */
export const FREE_DELIVERY_POINTS = [
  { code: "reghaia", name: "Réghaïa (ville)" },
  { code: "usthb", name: "USTHB" },
  { code: "ummto", name: "UMMTO" },
  { code: "unim", name: "UNIM" },
  { code: "inch", name: "INCH" },
  { code: "ingm", name: "INGM" },
  { code: "kolea", name: "Koléa" },
  { code: "alger1", name: "Alger 1" },
  { code: "alger2", name: "Alger 2" },
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
 * What delivery to this wilaya costs, in dinars — or null when we don't yet
 * know where the order is going, which is the normal state on the basket page.
 *
 * Null is deliberately not the same as 0. Zero means "this customer pays
 * nothing for delivery"; null means "nobody has told us the address", and the
 * screens must say so rather than quietly showing a free delivery.
 */
export function feeForWilaya(code) {
  if (!code) return null;
  const zone = DELIVERY_ZONES.find((z) => z.wilayas.includes(String(code)));
  return zone ? zone.dzd : null;
}

/**
 * What delivery costs for this basket, in dinars. Everything here is already
 * dinars — the basket, the bands, the threshold — so nothing is converted.
 */
export function deliveryFor(subtotal, wilayaCode, pointCode) {
  // A free delivery point settles it on its own — it doesn't matter which
  // wilaya the campus is in, so we don't even look at the price bands.
  if (freePointName(pointCode)) return 0;

  const fee = feeForWilaya(wilayaCode);
  if (fee === null) return null;

  // A band priced at 0 is a band that ships free.
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
