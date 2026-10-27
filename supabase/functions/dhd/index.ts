// ════════════════════════════════════════════════════════════
//  DL Accessories — the DHD (Ecotrack) courier function
// ════════════════════════════════════════════════════════════
//  This is the ONLY place the DHD token lives. It never reaches
//  the browser, so nobody can read it out of the website and book
//  parcels on your account.
//
//  POST  { orderId }                  → book the parcel for that order
//  GET   ?action=label&tracking=XXX   → the courier's label, as a PDF
//  GET   ?action=track&tracking=XXX   → where the parcel is right now
//
//  WHY IT TAKES AN ORDER ID AND NOT AN ADDRESS
//  The customer's browser calls the first one at checkout, and the
//  browser is not trustable — anyone could post a made-up address
//  and turn your DHD account into a free parcel service. So it takes
//  only an order id, then reads the real address out of the database
//  with the service key. A made-up id matches no order and is
//  refused. An order that already has a tracking number is returned
//  as-is, so a double-click cannot book two parcels.
//
//  WHO MAY READ
//  Booking has to stay open to the storefront, so it is gated by the
//  order id alone. Reading is different: a label or a tracking history
//  contains the customer's name, phone and full address, so those two
//  require a real Supabase session belonging to ADMIN_EMAIL — see
//  isAdmin() below.
//
//  Deploy:   supabase functions deploy dhd --project-ref <ref>
//  Secrets:  supabase secrets set DHD_TOKEN=... --project-ref <ref>
// ════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const DHD_URL = (Deno.env.get("DHD_API_URL") ?? "https://platform.dhd-dz.com").replace(/\/+$/, "");
const DHD_TOKEN = Deno.env.get("DHD_TOKEN") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/**
 * The shop's own address. Reading a label or a tracking history hands back a
 * customer's name, phone and full address, so it is for the admin only.
 *
 * The platform's JWT check is off for this function (the storefront's key is
 * a publishable key, not a JWT), so the check happens here: the caller has to
 * present a real Supabase session, and it has to belong to this address.
 */
const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") ?? "zaki1@dlaccessories.com").toLowerCase();

async function isAdmin(req: Request): Promise<boolean> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return false;
    return String(data.user.email ?? "").toLowerCase() === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

/** Call DHD. The token goes in the query string, as their docs show. */
async function dhd(pathname: string, params: Record<string, unknown> = {}) {
  if (!DHD_TOKEN) throw new Error("DHD_TOKEN is not set on this function");
  const url = new URL(`${DHD_URL}${pathname}`);
  url.searchParams.set("api_token", DHD_TOKEN);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* not JSON — keep the text */ }
  return { ok: res.ok, status: res.status, text, body };
}

/** What's inside the parcel, for the courier's slip. */
function productLine(items: any[]): string {
  return (items || [])
    .map((i) => `${i?.name ?? "Article"}${i?.qty > 1 ? ` ×${i.qty}` : ""}`)
    .join(", ")
    .slice(0, 200);
}

/** The chosen ring size / finish, so whoever packs it packs the right one. */
function noteLine(items: any[]): string {
  const variants = (items || []).map((i) => i?.variant).filter(Boolean);
  return variants.length ? variants.join(" · ").slice(0, 200) : "";
}

/** The two-digit code, from the new column or from the old label. */
function wilayaCodeOf(order: any): string | null {
  if (order.wilaya_code) return String(order.wilaya_code).padStart(2, "0");
  const match = String(order.state ?? "").match(/^\s*(\d{1,2})/);
  return match ? match[1].padStart(2, "0") : null;
}

/**
 * DHD's success payload isn't pinned down in their docs. Rather than
 * assume a shape and silently store nothing, look in the likely places
 * and — if the number isn't there — keep the raw reply so it can be
 * read and the extractor fixed.
 */
function trackingFrom(body: any): string | null {
  if (!body) return null;
  const candidates = [
    body.tracking, body.tracking_number, body.code,
    body.data?.tracking, body.data?.tracking_number,
    body.order?.tracking, body.colis?.tracking,
  ];
  const found = candidates.find((c) => typeof c === "string" && c.trim());
  return found ? found.trim() : null;
}

async function book(orderId: string) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) return json({ ok: false, error: error.message }, 500);
  if (!order) return json({ ok: false, error: "No such order" }, 404);

  // Already booked — hand back the same number instead of a second parcel.
  if (order.tracking_number) {
    return json({ ok: true, tracking: order.tracking_number, alreadySent: true });
  }

  const wilaya = wilayaCodeOf(order);
  if (!wilaya) {
    await supabase.from("orders")
      .update({ dhd_status: "failed", dhd_error: "No wilaya code on this order" })
      .eq("id", orderId);
    return json({ ok: false, error: "This order has no wilaya code" }, 422);
  }
  if (!order.commune) {
    await supabase.from("orders")
      .update({ dhd_status: "failed", dhd_error: "No commune on this order" })
      .eq("id", orderId);
    return json({ ok: false, error: "This order has no commune" }, 422);
  }

  let reply;
  try {
    reply = await dhd("/api/v1/create/order", {
      reference: `DL-${String(order.id).slice(0, 8)}`,
      nom_client: order.customer_name,
      telephone: String(order.phone_digits || order.phone || "").replace(/\D/g, ""),
      adresse: order.address,
      commune: order.commune,
      code_wilaya: wilaya,
      montant: Math.round(Number(order.total) || 0),
      produit: productLine(order.items),
      remarque: noteLine(order.items),
      type: 1,                                             // 1 = Livraison
      stop_desk: order.delivery_type === "bureau" ? 1 : 0,
      stock: 0,                                            // we hand them the parcel
    });
  } catch (err) {
    await supabase.from("orders")
      .update({ dhd_status: "failed", dhd_error: String((err as Error).message).slice(0, 300) })
      .eq("id", orderId);
    return json({ ok: false, error: "Could not reach DHD" }, 502);
  }

  const tracking = trackingFrom(reply.body);
  const refused = reply.body?.success === false || (!tracking && !reply.ok);

  if (refused || !tracking) {
    // Keep DHD's own words — that's what tells the admin whether the
    // wilaya is unserved, the phone is bad, or something else.
    const message =
      reply.body?.message || reply.body?.msg || reply.body?.error || reply.text.slice(0, 300);
    await supabase.from("orders")
      .update({ dhd_status: "failed", dhd_error: String(message).slice(0, 500) })
      .eq("id", orderId);
    return json({ ok: false, error: String(message) }, 422);
  }

  await supabase.from("orders")
    .update({
      tracking_number: tracking,
      dhd_status: "created",
      dhd_sent_at: new Date().toISOString(),
      dhd_error: null,
    })
    .eq("id", orderId);

  return json({ ok: true, tracking });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);

  try {
    // ── The label, as a PDF the admin can print ──
    // Deliberately not using the dhd() helper above: this endpoint
    // answers with a PDF file, not JSON, and the helper would try to
    // read it as text and lose it.
    if (req.method === "GET" && url.searchParams.get("action") === "label") {
      if (!(await isAdmin(req))) {
        return json({ ok: false, error: "Sign in as the shop admin to print labels" }, 401);
      }
      const tracking = url.searchParams.get("tracking");
      if (!tracking) return json({ ok: false, error: "tracking is required" }, 400);
      if (!DHD_TOKEN) return json({ ok: false, error: "DHD_TOKEN is not set on this function" }, 500);

      const target = new URL(`${DHD_URL}/api/v1/get/order/label`);
      target.searchParams.set("api_token", DHD_TOKEN);
      target.searchParams.set("tracking", tracking);

      const res = await fetch(target);
      const type = res.headers.get("content-type") || "";

      // The normal answer: the label itself, streamed straight back.
      if (type.includes("application/pdf")) {
        return new Response(res.body, {
          headers: { ...CORS, "Content-Type": "application/pdf" },
        });
      }

      // Something else — a link to the label, or an error to read.
      const text = await res.text();
      let body: any = null;
      try { body = JSON.parse(text); } catch {}
      const link = body?.url || body?.label || body?.data;

      if (typeof link === "string" && link.startsWith("http")) {
        return json({ ok: true, url: link });
      }
      if (typeof link === "string" && link.length > 100) {
        // A base64-encoded PDF.
        const bytes = Uint8Array.from(atob(link), (c) => c.charCodeAt(0));
        return new Response(bytes, {
          headers: { ...CORS, "Content-Type": "application/pdf" },
        });
      }
      return json({ ok: false, error: text.slice(0, 300) }, 502);
    }

    // ── Where is it? ──
    if (req.method === "GET" && url.searchParams.get("action") === "track") {
      if (!(await isAdmin(req))) {
        return json({ ok: false, error: "Sign in as the shop admin to read tracking" }, 401);
      }
      const tracking = url.searchParams.get("tracking");
      if (!tracking) return json({ ok: false, error: "tracking is required" }, 400);
      const info = await dhd("/api/v1/get/tracking/info", { tracking });
      return json({ ok: info.ok, info: info.body, raw: info.ok ? undefined : info.text.slice(0, 300) });
    }

    // ── Book a parcel ──
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const orderId = body?.orderId;
      if (!orderId) return json({ ok: false, error: "orderId is required" }, 400);
      return await book(String(orderId));
    }

    return json({ ok: false, error: "Unsupported request" }, 405);
  } catch (err) {
    return json({ ok: false, error: String((err as Error).message) }, 500);
  }
});
