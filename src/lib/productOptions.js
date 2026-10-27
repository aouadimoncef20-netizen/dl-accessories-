// ════════════════════════════════════════════════════════════
//  Product options — colours and sizes
// ════════════════════════════════════════════════════════════
//  The `colors` and `sizes` columns are JSON arrays. To keep
//  them easy to type into the admin form (and readable in the
//  Supabase table editor) they are stored as simple strings:
//
//    colors: ["Rose Gold:#B76E79", "Midnight Black:#1C1B1B"]
//    sizes:  ["4", "5", "6", "7", "8"]
//
//  A colour may also be just a hex ("#1C1B1B") or just a name
//  ("Rose Gold"). These helpers accept all of those shapes, so
//  older rows and hand-edited rows keep working.
// ════════════════════════════════════════════════════════════

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** At or below this, both the shop and the admin flag the product as low. */
export const LOW_STOCK = 5;

/** Normalise the stored `colors` value into [{ name, hex }]. */
export function parseColors(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, i) => {
      if (typeof entry === "string") {
        const value = entry.trim();
        if (!value) return null;
        // "Name:#hex" or "Name=#hex"
        const split = value.match(/^(.*?)\s*[:=]\s*(#[0-9a-f]{3,8})$/i);
        if (split) {
          return { name: split[1].trim() || `Colour ${i + 1}`, hex: split[2] };
        }
        // bare hex with no name — name it so the order line is still readable
        if (HEX.test(value)) return { name: `Colour ${i + 1}`, hex: value };
        return { name: value, hex: "" };
      }
      if (entry && typeof entry === "object") {
        const name = entry.name || entry.label || `Colour ${i + 1}`;
        const hex = entry.hex || entry.color || entry.value || "";
        return { name, hex };
      }
      return null;
    })
    .filter(Boolean);
}

/** Normalise the stored `sizes` value into ["4", "5", …]. */
export function parseSizes(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (entry && typeof entry === "object") return String(entry.name || entry.label || "").trim();
        if (typeof entry === "number") return String(entry);
        return "";
      })
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Turn whatever came out of the admin form into the stored array shape. */
export function serializeColors(input) {
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);
  if (typeof input !== "string") return [];
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeSizes(input) {
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);
  if (typeof input !== "string") return [];
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** For the admin form: stored array → the single text field the owner edits. */
export function colorsToField(raw) {
  return parseColors(raw)
    .map((c) => (c.hex ? `${c.name}:${c.hex}` : c.name))
    .join(", ");
}

export function sizesToField(raw) {
  return parseSizes(raw).join(", ");
}

/** Digits only — used to match an order when the customer types their phone. */
export function phoneDigits(phone) {
  return String(phone || "").replace(/\D/g, "");
}

/* ════════════════════════════════════════════════════════════
 *  Variants — how many of each colour and size are on the shelf
 * ════════════════════════════════════════════════════════════
 *  A bracelet in red and green, sizes 14, 15 and 16, is not "nine
 *  in stock": it is "red 15: 9, red 14: 1, red 16: 0…". The shop has
 *  to know which one just sold out, and the customer has to see it
 *  before they order.
 *
 *  Stored as `products.variants`:
 *
 *    [ { "color": "Red", "size": "15", "stock": 9 },
 *      { "color": "Red", "size": "14", "stock": 1 } ]
 *
 *  One entry per combination the shop actually sells. A combination
 *  with no entry is not sold at all. `products.stock` stays as the
 *  total, so every screen that only wants "is there any left?" keeps
 *  working without knowing about variants.
 * ════════════════════════════════════════════════════════════ */

const clean = (value) => String(value ?? "").trim();
const lower = (value) => clean(value).toLowerCase();

/** The identity of one combination — "red|15". Case- and space-insensitive. */
export function variantKey(color, size) {
  return `${lower(color)}|${clean(size)}`;
}

/** Normalise the stored `variants` value into [{ color, size, stock }]. */
export function parseVariants(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const color = clean(entry.color ?? entry.name ?? entry.colour);
      const size = clean(entry.size ?? entry.taille ?? entry.length);
      const rawStock = entry.stock;
      const stock =
        rawStock === null || rawStock === undefined || rawStock === ""
          ? null
          : Math.max(0, Number(rawStock) || 0);
      if (!color && !size) return null;
      return { color, size, stock };
    })
    .filter(Boolean);
}

/** The reverse: the admin's rows → the array that goes into the column. */
export function serializeVariants(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const color = clean(entry.color);
      const size = clean(entry.size);
      if (!color && !size) return null;
      const stock =
        entry.stock === null || entry.stock === undefined || entry.stock === ""
          ? null
          : Math.max(0, Number(entry.stock) || 0);
      return { color, size, stock };
    })
    .filter(Boolean);
}

/**
 * How many of this exact colour and size are left.
 *
 *   • no variants at all → the plain `stock` figure (or null when unknown)
 *   • variants, this combination listed → its own number (null if unset)
 *   • variants, this combination not listed → 0: the shop doesn't sell it
 */
export function stockForVariant(product, color, size) {
  const variants = product?.variants || [];
  if (!variants.length) {
    return typeof product?.stock === "number" ? product.stock : null;
  }

  // Nothing chosen at all — a product counted by colour whose page shows no
  // selector, say. The honest answer is the whole shelf, not "sold out":
  // zero is a fact about one combination, not about the product.
  if (!clean(color) && !clean(size)) return variantsTotalStock(variants);

  const wanted = variantKey(color, size);
  // A product with only colours (or only sizes) is chosen on one axis, so a
  // blank on the other must still match its rows.
  const match =
    variants.find((v) => variantKey(v.color, v.size) === wanted) ||
    (!clean(size) ? variants.find((v) => variantKey(v.color, "") === variantKey(color, "")) : null) ||
    (!clean(color) ? variants.find((v) => variantKey("", v.size) === variantKey("", size)) : null);

  if (!match) return 0;
  return typeof match.stock === "number" ? match.stock : null;
}

/* ════════════════════════════════════════════════════════════
 *  Price — list price and promo price
 * ════════════════════════════════════════════════════════════
 *  A promo is a second number, not a replacement: `price` keeps
 *  saying what the piece normally costs (so it can be shown struck
 *  through) and `sale_price` says what is charged today.
 *
 *  It only counts when it is set and actually lower. Anything else —
 *  a blank, a zero, a "sale" price above the list price — is ignored,
 *  so a mistyped figure can never raise the price at the till.
 * ════════════════════════════════════════════════════════════ */

/** True when the product is really on promotion. */
export function isOnSale(product) {
  const list = Number(product?.price);
  const sale = Number(product?.sale_price);
  return Number.isFinite(sale) && sale > 0 && Number.isFinite(list) && sale < list;
}

/** What the customer actually pays for one — the promo price when there is one. */
export function chargedPrice(product) {
  return isOnSale(product) ? Number(product.sale_price) : Number(product?.price) || 0;
}

/** Whole-percent saving, for the "-20%" badge. 0 when not on promotion. */
export function percentOff(product) {
  if (!isOnSale(product)) return 0;
  return Math.round((1 - Number(product.sale_price) / Number(product.price)) * 100);
}

/**
 * The sum of every combination — what `products.stock` should say.
 */
export function variantsTotalStock(variants) {
  return (variants || []).reduce(
    (sum, v) => sum + (typeof v.stock === "number" ? v.stock : 0),
    0
  );
}

/**
 * The combinations a product offers, in the order the admin typed them:
 * every colour crossed with every size. A product with only colours (or only
 * sizes) gets a single column or row, and a product with neither gets none.
 */
export function buildVariantGrid(colors, sizes) {
  const colorList = (colors || []).map((c) => clean(c?.name ?? c)).filter(Boolean);
  const sizeList = (sizes || []).map((s) => clean(s)).filter(Boolean);

  if (!colorList.length && !sizeList.length) return { colorList, sizeList, combos: [] };

  const rows = colorList.length ? colorList : [""];
  const cols = sizeList.length ? sizeList : [""];
  const combos = [];
  for (const color of rows) for (const size of cols) combos.push({ color, size });
  return { colorList, sizeList, combos };
}
