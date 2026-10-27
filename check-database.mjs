/**
 * DL Accessories — what does the live database actually have?
 *
 *   node check-database.mjs            read-only checks
 *   node check-database.mjs --write    also prove whether a stranger can
 *                                      change your products (writes an
 *                                      identical value back — harmless)
 *
 * Run it before and after pasting SUPABASE_MIGRATION.sql and
 * SUPABASE_AUTH_LOCKDOWN.sql. It prints a checklist, not a wall of JSON.
 * Uses only the public key that already ships inside the website.
 */
import fs from "node:fs";
import path from "node:path";

const WANT_WRITE_PROBE = process.argv.includes("--write");

const env = fs.existsSync(".env")
  ? fs.readFileSync(".env", "utf8")
  : "";
const readEnv = (name) => {
  const line = env.split(/\r?\n/).find((l) => l.startsWith(name));
  return line ? line.split("=").slice(1).join("=").trim() : null;
};

const URL_BASE = readEnv("REACT_APP_SUPABASE_URL");
const KEY = readEnv("REACT_APP_SUPABASE_ANON_KEY");

if (!URL_BASE || !KEY) {
  console.error("Couldn't find REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const host = new URL(URL_BASE).host;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

let passed = 0;
let failed = 0;
const ok = (label, detail) => { passed++; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`); };
const bad = (label, detail) => { failed++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); };
const warn = (label, detail) => { console.log(`  ! ${label}${detail ? ` — ${detail}` : ""}`); };

async function get(pathname, extra = {}) {
  const res = await fetch(`${URL_BASE}${pathname}`, { headers: { ...headers, ...extra } });
  const body = await res.text();
  let json = null;
  try { json = JSON.parse(body); } catch {}
  return { status: res.status, json, headers: res.headers };
}

async function rpc(fn, args) {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const body = await res.text();
  let json = null;
  try { json = JSON.parse(body); } catch {}
  return { status: res.status, json };
}

console.log(`\nDL Accessories — database check\nProject: ${host}\n`);

/* ── The shop ───────────────────────────────────────────── */
console.log("The shop");
try {
  const { status, json } = await get("/rest/v1/products?select=id,name,price,stock");
  if (status !== 200) {
    bad("the storefront cannot read products", `HTTP ${status}`);
  } else if (!Array.isArray(json) || json.length === 0) {
    bad("the storefront reads products", "the table is empty — add products in the admin dashboard");
  } else {
    ok("the storefront can read products", `${json.length} product${json.length === 1 ? "" : "s"}`);
    const zero = json.filter((p) => Number(p.stock) === 0);
    const unknown = json.filter((p) => p.stock === null || p.stock === undefined);
    if (zero.length === json.length) {
      bad("every product has 0 stock", "the shop shows 'Sold out' and checkout refuses every order — set real numbers in the admin dashboard");
    } else if (zero.length) {
      warn(`${zero.length} product${zero.length === 1 ? "" : "s"} at 0 stock`, "shown as sold out");
    }
    if (unknown.length) warn(`${unknown.length} with no stock figure`, "shown as available, never blocked");
  }
} catch (err) {
  bad("couldn't reach the database", err.message);
}

/* ── The migration (A2) ─────────────────────────────────── */
console.log("\nMigration — SUPABASE_MIGRATION.sql");
try {
  const flags = await get("/rest/v1/products?select=new_arrival,featured,best_seller&limit=1");
  flags.status === 200
    ? ok("products.new_arrival / featured / best_seller")
    : bad("products.new_arrival / featured / best_seller", "missing — the home page's Featured and New Arrival rows stay empty");

  const options = await get("/rest/v1/products?select=colors,sizes&limit=1");
  options.status === 200
    ? ok("products.colors / sizes", "product pages show the real options")
    : bad("products.colors / sizes", "missing — product pages hide their selectors");

  const phone = await get("/rest/v1/orders?select=phone_digits&limit=1");
  phone.status === 200
    ? ok("orders.phone_digits", "guest order tracking works")
    : bad("orders.phone_digits", "missing — guest order tracking cannot match an order");

  // A stranger must not be able to drain a product's stock, so the upgrade
  // file takes EXECUTE away from `anon`. PostgREST then answers 401/403 with
  // code 42501 — a refusal, which means the function is there and correctly
  // locked, not that it is gone. Only PGRST202, "could not find the function
  // in the schema cache", is an absence.
  const charge = await rpc("decrement_product_stock", {
    p_id: "00000000-0000-0000-0000-000000000000",
    p_qty: 0,
  });
  const refused = charge.status === 401 || charge.status === 403 || charge.json?.code === "42501";
  const absent = charge.status === 404 || charge.json?.code === "PGRST202";
  if (charge.status === 200) {
    ok("decrement_product_stock()", "stock can't oversell");
  } else if (refused) {
    ok("decrement_product_stock()", "in place — the admin may call it, a stranger is refused");
  } else if (absent) {
    bad("decrement_product_stock()", "missing — the app falls back to the racy read-then-write");
  } else {
    warn("decrement_product_stock()", `couldn't tell — HTTP ${charge.status}`);
  }

  // The Storage API won't let the public key read bucket metadata
  // (/storage/v1/bucket/… answers 400 to everyone but the service role), so
  // ask it for a file that isn't there instead: "Object not found" means the
  // bucket is there, "Bucket not found" means it isn't. That reads the same
  // before and after the lockdown, when a public-key upload is refused anyway.
  const bucket = await get("/storage/v1/object/public/product-images/check-not-a-real-file.txt");
  const bucketCode = bucket.json?.code;
  if (bucketCode === "NoSuchKey") {
    ok("product-images bucket", "the admin can upload photos");
  } else if (bucketCode === "NoSuchBucket") {
    bad("product-images bucket", "missing — the admin's photo upload has nowhere to go");
  } else {
    bad("product-images bucket", `couldn't tell — HTTP ${bucket.status}`);
  }
} catch (err) {
  bad("migration check failed", err.message);
}

/* ── The upgrade ────────────────────────────────────────── */
console.log("\nUpgrade — SUPABASE_UPGRADE.sql");
try {
  // PostgREST answers 400 for a column it cannot find, so a plain select is a
  // reliable yes/no on whether the file has been pasted yet. Reading an
  // unknown column never reaches the row policies.
  const probe = async (label, pathname, missing) => {
    const res = await get(pathname);
    res.status === 200
      ? ok(label)
      : res.status === 400 || res.status === 404
        ? bad(label, missing)
        : warn(label, `couldn't tell — HTTP ${res.status}`);
  };

  await probe(
    "products.sale_price / is_pack / variants",
    "/rest/v1/products?select=sale_price,is_pack,variants&limit=1",
    "missing — Promo and Packs filters stay empty and stock is counted per product, not per colour and size"
  );
  await probe(
    "orders.customer_note",
    "/rest/v1/orders?select=customer_note&limit=1",
    "missing — the customer's message at checkout is saved in notes instead and shown in the order's notes box"
  );
  await probe(
    "delivery_zones.stopdesk_dzd",
    "/rest/v1/delivery_zones?select=wilaya_code,price_dzd,stopdesk_dzd&limit=1",
    "missing — stop-desk prices are computed on the fly from shipping.js instead of stored per wilaya"
  );

  // Did the upgrade file run all the way through? place_order() takes the
  // customer's message as its last argument, but calling it to find out would
  // place a real order — and PostgREST won't describe a function to a caller
  // that can't see the API root. lookup_order() is the safe stand-in: the
  // upgrade recreates it with a tracking_number column *after* place_order(),
  // so if that column is there, place_order() was reached too. An empty phone
  // matches no row (the function filters out an empty phone_digits), so it
  // reads nothing back.
  const lookup = await rpc("lookup_order?select=tracking_number", {
    p_reference: "check-database-probe",
    p_phone: "",
  });
  if (lookup.status === 200 && Array.isArray(lookup.json)) {
    ok(
      "the upgrade ran to the end",
      "lookup_order() carries tracking_number — it is defined after place_order(), so the customer's note is wired up"
    );
  } else if (lookup.status === 400 || lookup.status === 404) {
    bad(
      "the upgrade ran to the end",
      "lookup_order() is still the old shape — paste SUPABASE_UPGRADE.sql again, or place_order() never learns the customer's note and tracking stays blank"
    );
  } else {
    warn("couldn't tell how far the upgrade ran", `HTTP ${lookup.status}`);
  }
} catch (err) {
  bad("upgrade check failed", err.message);
}

/* ── The courier function ───────────────────────────────── */
console.log("\nCourier function — supabase/functions/dhd");
try {
  // A label and a tracking history carry the customer's name, phone and full
  // address, so the function now insists on a Supabase session belonging to
  // the admin before it answers either. Asking with the public key alone must
  // come back 401 — and because that guard runs before the `tracking`
  // argument is even read, this probe costs no courier call and touches no
  // order. A 400 means the older function is still the one deployed.
  const fnUrl = `${URL_BASE.replace(/\/+$/, "")}/functions/v1/dhd?action=track`;
  const res = await fetch(fnUrl, { headers });
  if (res.status === 401) {
    ok("labels and tracking need the admin's sign-in", "the new function is deployed");
  } else if (res.status === 404) {
    warn("the dhd function isn't deployed", "courier booking and label printing are off");
  } else if (res.status === 400 || res.status === 200) {
    bad(
      "anyone can read labels and tracking",
      "the older function is still deployed — run: supabase functions deploy dhd"
    );
  } else {
    warn("couldn't tell which function is deployed", `HTTP ${res.status}`);
  }
} catch (err) {
  warn("couldn't reach the courier function", err.message);
}

/* ── Accounts ───────────────────────────────────────────── */
console.log("\nCustomer accounts");
try {
  const { json } = await get("/auth/v1/settings");
  if (json?.mailer_autoconfirm === true) {
    ok("email confirmation is off", "customers can sign in as soon as they register");
  } else if (json?.disable_signup === true) {
    bad("sign-ups are disabled", "turn on Authentication → Sign In / Providers → Email");
  } else {
    bad("email confirmation is ON", "customers register but cannot sign in until you turn it off (Authentication → Sign In / Providers → Email) or set up SMTP");
  }
} catch (err) {
  warn("couldn't read the account settings", err.message);
}

/* ── Security (D1) ──────────────────────────────────────── */
console.log("\nWho else can see your data — SUPABASE_AUTH_LOCKDOWN.sql");
try {
  const res = await fetch(`${URL_BASE}/rest/v1/orders?select=id&limit=1`, {
    headers: { ...headers, Prefer: "count=exact" },
  });
  const range = res.headers.get("content-range") || "";
  const count = Number(range.split("/")[1]);
  if (count > 0) {
    bad(`a stranger can read ${count} order${count === 1 ? "" : "s"}`, "names, phone numbers and home addresses — run the lockdown file");
  } else {
    ok("a stranger cannot read orders", "the lockdown is in place (or there are no orders)");
  }

  const products = await get("/rest/v1/products?select=id,name,stock&limit=1");
  if (WANT_WRITE_PROBE && products.status === 200 && products.json?.[0]) {
    const row = products.json[0];
    const res2 = await fetch(`${URL_BASE}/rest/v1/products?id=eq.${row.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      // Writes the values that are already there — nothing actually changes.
      body: JSON.stringify({ name: row.name, stock: row.stock }),
    });
    const changed = await res2.text();
    let rows = [];
    try { rows = JSON.parse(changed); } catch {}
    if (Array.isArray(rows) && rows.length > 0) {
      bad("a stranger can EDIT your products", "prices and stock — anyone with your website open can change them");
    } else {
      ok("a stranger cannot edit products");
    }
  } else if (WANT_WRITE_PROBE) {
    warn("couldn't test product edits", "no product to test against");
  }
} catch (err) {
  warn("security check failed", err.message);
}

console.log(
  `\n${passed} in place · ${failed} still missing` +
  (failed ? "\nPaste the file for anything missing, then run this again." : "\nNothing missing. Run the browser check and deploy.")
);
