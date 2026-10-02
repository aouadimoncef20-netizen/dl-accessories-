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
