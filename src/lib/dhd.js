// ════════════════════════════════════════════════════════════
//  Talking to the courier
// ════════════════════════════════════════════════════════════
//  Two different conversations happen here, and they are not the
//  same kind of request:
//
//   • Reading which wilayas and communes DHD serves comes
//     straight from our own database (filled by `npm run
//     dhd:sync`). It costs DHD nothing and it still answers when
//     their API is down — which matters, because this runs while
//     a customer is trying to pay.
//
//   • Booking a parcel goes through the `dhd` Edge Function. The
//     DHD token lives only over there, never in this file, so
//     nothing here can be read out of the page source.
//
//  Every function here fails soft. A courier problem must never
//  stop the shop taking an order.
// ════════════════════════════════════════════════════════════

import supabase from "./supabase";

const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || "").replace(/\/+$/, "");
const ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const BOOK_URL = `${SUPABASE_URL}/functions/v1/dhd`;

/** Communes don't change during a visit — don't ask twice. */
const communeCache = new Map();

/**
 * The wilaya codes DHD will actually carry a parcel to, as strings
 * ("01", "16"). DHD covers 55 of the 58; offering a wilaya they
 * don't serve would take an order that can never be delivered.
 *
 * Returns null when we don't know — the caller should then show
 * every wilaya rather than none, and let the booking step report
 * the truth.
 */
export async function fetchServedWilayas() {
  try {
    const { data, error } = await supabase.from("dhd_wilayas").select("wilaya_id");
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data.map((w) => String(w.wilaya_id).padStart(2, "0"));
  } catch {
    return null;
  }
}

/**
 * Every commune in one wilaya. `has_stop_desk` marks the ones with
 * a DHD office, which is the only place a customer can collect.
 */
export async function fetchCommunes(wilayaCode) {
  const id = Number(wilayaCode);
  if (!Number.isFinite(id) || id <= 0) return [];
  if (communeCache.has(id)) return communeCache.get(id);

  try {
    const { data, error } = await supabase
      .from("dhd_communes")
      .select("nom, code_postal, has_stop_desk, stop_desk_info")
      .eq("wilaya_id", id)
      .order("nom");

    if (error || !Array.isArray(data)) return [];
    const communes = data.map((c) => ({
      nom: c.nom,
      codePostal: c.code_postal || "",
      hasStopDesk: c.has_stop_desk === true,
      deskInfo: c.stop_desk_info || null,
    }));
    communeCache.set(id, communes);
    return communes;
  } catch {
    return [];
  }
}

/**
 * Book the parcel for an order that is already safely in our
 * database. Sends only the order's id — the function reads the
 * address itself, so a stranger can't post a made-up one.
 *
 * Never throws: the order is already placed, and the admin has a
 * retry button. Returns { ok, tracking?, error? }.
 */
export async function bookParcel(orderId) {
  if (!orderId) return { ok: false, error: "no order id" };
  // The order is already saved by the time this runs, so the courier must
  // never be able to hold the customer on the checkout spinner. Give it a
  // few seconds, then let the admin's retry button finish the job.
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 7000);
  try {
    const res = await fetch(BOOK_URL, {
      method: "POST",
      signal: stop.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ orderId }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) {
      return { ok: false, error: body?.error || `HTTP ${res.status}` };
    }
    return { ok: true, tracking: body.tracking, alreadySent: !!body.alreadySent };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Headers for the admin-only half of the function (labels, tracking). The
 * function checks the Supabase session itself and refuses anyone who is not
 * the shop admin — a label carries a customer's name, phone and address.
 */
async function adminHeaders() {
  const base = { apikey: ANON_KEY };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) return { ...base, Authorization: `Bearer ${token}` };
  } catch {
    /* fall through — the function answers 401 and the caller says so */
  }
  return { ...base, Authorization: `Bearer ${ANON_KEY}` };
}

/** The courier's printable label, as a blob URL you must revoke when done. */
export async function fetchLabel(tracking) {
  const url = `${BOOK_URL}?action=label&tracking=${encodeURIComponent(tracking)}`;
  const res = await fetch(url, { headers: await adminHeaders() });
  if (res.status === 401) {
    throw new Error("Sign in with your Supabase admin account to print labels");
  }
  if (!res.ok) throw new Error(`Label failed (HTTP ${res.status})`);
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const body = await res.json();
    if (body?.url) return { url: body.url }; // DHD handed back a link instead
    throw new Error(body?.error || "DHD returned no label");
  }
  const blob = await res.blob();
  return { blobUrl: URL.createObjectURL(blob) };
}

/** Where the parcel is right now, straight from the courier. */
export async function fetchTracking(tracking) {
  const url = `${BOOK_URL}?action=track&tracking=${encodeURIComponent(tracking)}`;
  try {
    const res = await fetch(url, { headers: await adminHeaders() });
    const body = await res.json().catch(() => null);
    return body?.info ?? null;
  } catch {
    return null;
  }
}
