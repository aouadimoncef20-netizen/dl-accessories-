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
  return res.status;
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

  (await rpc("decrement_product_stock", { p_id: "00000000-0000-0000-0000-000000000000", p_qty: 0 })) === 200
    ? ok("decrement_product_stock()", "stock can't oversell")
    : bad("decrement_product_stock()", "missing — the app falls back to the racy read-then-write");

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
