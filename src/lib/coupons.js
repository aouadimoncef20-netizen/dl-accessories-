import supabase from "./supabase";

/*
 * Promo codes.
 *
 * The checkout checks a code before showing a discount so the total on screen
 * is the total the customer will pay. The check is a convenience only — the
 * place_order() function checks the same code again on the server, because a
 * browser can always lie about what it sent.
 */

export function normalizeCouponCode(code) {
  return String(code || "").trim().toUpperCase();
}

/** The shape the cart summary understands, from a `coupons` row. */
export function toDiscount(row) {
  if (!row) return null;
  const percent =
    row.percent === null || row.percent === undefined
      ? null
      : Number(row.percent);
  const amount =
    row.amount_dzd === null || row.amount_dzd === undefined
      ? null
      : Number(row.amount_dzd);

  if (percent === null && amount === null) return null;

  return {
    code: row.code,
    percent,
    amount_dzd: amount,
    min_subtotal: Number(row.min_subtotal) || 0,
    // The cart store reads these two names.
    discount_percent: percent,
    discount_amount: amount,
  };
}

/**
 * Returns { ok: true, discount } or { ok: false, reason }.
 * `reason` is one of: empty, invalid, min_subtotal, offline.
 */
export async function validateCoupon(rawCode, subtotal) {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { ok: false, reason: "empty" };

  // Preferred path: a function that answers for exactly the code supplied.
  // The coupons table has no public read policy, so the publishable key
  // cannot be used to list every promo code.
  try {
    const rpc = await supabase.rpc("check_coupon", {
      p_code: code,
      p_subtotal: Number(subtotal) || 0,
    });

    if (!rpc.error) {
      const row = rpc.data;
      if (!row) return { ok: false, reason: "invalid" };
      if (row.error === "COUPON_MIN_SUBTOTAL") {
        return { ok: false, reason: "min_subtotal" };
      }

      const discount = toDiscount(row);
      return discount
        ? { ok: true, discount }
        : { ok: false, reason: "invalid" };
    }

    // Older database without check_coupon() — read the one row we need.
    // That only works while the table still has a public read policy, which
    // SUPABASE_UPGRADE.sql removes, so this is a migration-window fallback.
    if (rpc.error.code !== "PGRST202" && !/could not find the function/i.test(rpc.error.message || "")) {
      throw rpc.error;
    }
  } catch (err) {
    console.warn("[validateCoupon] could not check the code:", err?.message || err);
    return { ok: false, reason: "offline" };
  }

  try {
    const { data, error } = await supabase
      .from("coupons")
      .select("code, percent, amount_dzd, min_subtotal, active, expires_at")
      .ilike("code", code)
      .maybeSingle();

    if (error) throw error;
    if (!data || data.active === false) return { ok: false, reason: "invalid" };

    if (data.expires_at) {
      const expires = new Date(data.expires_at).getTime();
      if (Number.isFinite(expires) && expires < Date.now()) {
        return { ok: false, reason: "invalid" };
      }
    }

    const discount = toDiscount(data);
    if (!discount) return { ok: false, reason: "invalid" };

    if (discount.min_subtotal > 0 && Number(subtotal) < discount.min_subtotal) {
      return {
        ok: false,
        reason: "min_subtotal",
        min: discount.min_subtotal,
      };
    }

    return { ok: true, discount };
  } catch (err) {
    // The coupons table may not exist yet (SUPABASE_UPGRADE.sql not run), or
    // the network may be down. Either way we cannot promise a discount, so we
    // say so instead of silently showing one.
    console.warn("[validateCoupon] could not check the code:", err?.message || err);
    return { ok: false, reason: "offline" };
  }
}
