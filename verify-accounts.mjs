// Temporary verification harness for the auth work. The real Supabase project
// is offline, so the auth endpoints are stubbed; the point is to prove that
// (a) nothing that used to work broke, and (b) the new path takes over cleanly.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BUILD = path.join(process.cwd(), "build");
const PORT = 4179;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".json": "application/json", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  let file = path.join(BUILD, url === "/" ? "index.html" : url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(BUILD, "index.html");
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const results = [];
const log = (ok, msg) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
};

const BASE = `http://localhost:${PORT}`;
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD;

const browser = await chromium.launch();

/* ══════════════════════════════════════════════════════════
   PHASE 1 — the database is unreachable (today's reality)
   ══════════════════════════════════════════════════════════ */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.route("**/*.supabase.co/**", (route) => route.abort());

  // ── Create an account ──
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill('input[type="text"]', "Amina Test");
  await page.fill('input[type="email"]', "amina@example.com");
  await page.fill('input[type="password"]', "secret123");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);

  const stored = await page.evaluate(() => {
    const users = JSON.parse(localStorage.getItem("dl_users") || "[]");
    return users[0] || null;
  });
  log(!!stored, "an account can still be created while the database is unreachable");
  log(
    typeof stored?.password === "string" && stored.password.startsWith("sha256:"),
    `the password is stored hashed, not in plain text (${String(stored?.password).slice(0, 14)}…)`
  );
  log(stored?.password !== "secret123", "the typed password is not readable in localStorage");

  // ── Sign back in with those credentials ──
  await page.evaluate(() => localStorage.removeItem("dl_auth_user"));
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "amina@example.com");
  await page.fill('input[type="password"]', "secret123");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2500);

  const afterLogin = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dl_auth_user") || "null")
  );
  log(afterLogin?.email === "amina@example.com", "sign-in still works when Supabase is down");

  // ── A record written by the OLD version (plain text) ──
  await page.evaluate(() => {
    const users = JSON.parse(localStorage.getItem("dl_users"));
    users[0].password = "oldplain";
    localStorage.setItem("dl_users", JSON.stringify(users));
    localStorage.removeItem("dl_auth_user");
  });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "amina@example.com");
  await page.fill('input[type="password"]', "oldplain");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2500);

  const upgraded = await page.evaluate(() => {
    const users = JSON.parse(localStorage.getItem("dl_users"));
    return { password: users[0].password, signedIn: !!localStorage.getItem("dl_auth_user") };
  });
  log(upgraded.signedIn, "an old plain-text account can still sign in");
  log(
    String(upgraded.password).startsWith("sha256:"),
    "and its stored password is upgraded to a hash on the way in"
  );

  // ── Wrong password is still refused ──
  await page.evaluate(() => localStorage.removeItem("dl_auth_user"));
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "amina@example.com");
  await page.fill('input[type="password"]', "wrong-one");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2500);
  const rejected = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dl_auth_user") || "null")
  );
  log(rejected === null, "a wrong password is still refused");

  // ── The admin's built-in account still gets in ──
  if (ADMIN_PASSWORD) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "zaki1@dlaccessories.com");
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2500);
    const admin = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("dl_auth_user") || "null")
    );
    log(admin?.role === "admin", "the built-in admin account still signs in");
  }

  log(errors.length === 0, `no uncaught errors with the database down${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  await page.close();
}

/* ══════════════════════════════════════════════════════════
   PHASE 2 — the account system is reachable
   ══════════════════════════════════════════════════════════ */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const USER = {
    id: "8f14e45f-ceea-467a-9c1c-0d5a2b3c4d5e",
    aud: "authenticated",
    role: "authenticated",
    email: "sara@example.com",
    created_at: "2026-09-01T10:00:00Z",
    user_metadata: { name: "Sara" },
    app_metadata: {},
  };

  let sawAuthenticatedRequest = false;

  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(body),
      });

    if (url.includes("/auth/v1/token")) {
      return json({
        access_token: "stub-access-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "stub-refresh-token",
        user: USER,
      });
    }
    if (url.includes("/auth/v1/user")) return json(USER);
    if (url.includes("/auth/v1/logout")) return json({});

    // Anything on the data API must carry the signed-in user's token now.
    if ((req.headers()["authorization"] || "").includes("stub-access-token")) {
      sawAuthenticatedRequest = true;
    }

    if (url.includes("/rest/v1/orders")) {
      return json([
        {
          id: "deadbeef-0000-1111-2222-333333333333",
          status: "shipped",
          created_at: "2026-09-20T12:00:00Z",
          total: 4500,
          customer_name: "Sara",
          address: "12 Rue des Fleurs",
          state: "Alger",
          user_id: USER.id,
          items: [
            {
              id: "aaaaaaaa-1111-2222-3333-444444444444",
              name: "Éclat Signet Ring",
              price: 4500,
              qty: 1,
              image: "",
              variant: "Size: 6",
            },
          ],
        },
      ]);
    }
    return json([]);
  });

  // ── Sign in with a real account ──
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "sara@example.com");
  await page.fill('input[type="password"]', "secret123");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2500);

  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dl_auth_user") || "null")
  );
  log(session?.email === "sara@example.com", "a real Supabase account signs in");
  log(session?.name === "Sara", `the app user is built from the account (name: ${session?.name})`);
  log(session?.role === "user", `a customer is not made an admin (role: ${session?.role})`);

  // ── My Orders shows what was bought ──
  await page.goto(`${BASE}/my-orders`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const body = (await page.locator("body").textContent()) || "";
  log(/Éclat Signet Ring/.test(body), "My Orders lists the item that was bought");
  log(/Size: 6/.test(body), "My Orders shows the chosen size");
  log(/Shipped/.test(body), "My Orders shows the status in the customer's words");
  log(sawAuthenticatedRequest, "data requests carry the signed-in user's token");

  log(errors.length === 0, `no uncaught errors with accounts live${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  await page.close();
}

/* ══════════════════════════════════════════════════════════
   PHASE 3 — placing an order while the database is reachable
   ══════════════════════════════════════════════════════════ */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  let orderBody = null;
  let stockCallBody = null;

  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(body),
      });

    if (url.includes("/rpc/decrement_product_stock")) {
      stockCallBody = req.postDataJSON();
      return json(10);
    }
    if (url.includes("/rest/v1/orders")) {
      orderBody = req.postDataJSON();
      return json({ id: "deadbeef-1234-5678-9abc-def012345678", created_at: "2026-09-29T09:00:00Z" });
    }
    if (url.includes("/rest/v1/products")) {
      return json([{ id: "aaaaaaaa-1111-2222-3333-444444444444", name: "Éclat Signet Ring", stock: 10 }]);
    }
    return json([]);
  });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem(
      "dl-cart",
      JSON.stringify({
        state: {
          items: [
            {
              id: "aaaaaaaa-1111-2222-3333-444444444444",
              name: "Éclat Signet Ring",
              price: 4500,
              image: "",
              stock: 10,
              variant: "Size: 6",
              qty: 1,
            },
          ],
          discount: null,
        },
        version: 0,
      })
    );
  });

  await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
  await page.fill('input[name="fullName"]', "Amina Test");
  await page.fill('input[name="phone"]', "0555 12 34 56");
  await page.fill('input[name="address"]', "12 Rue des Fleurs");
  await page.fill('input[name="state"]', "Alger");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);

  const bodyText = (await page.locator("body").textContent()) || "";
  log(/check_circle/.test(bodyText), "a saved order still reaches the confirmation screen");
  log(!/cloud_off/.test(bodyText), "and it is not the 'we could not save it' screen");
  log(orderBody?.variant === undefined && orderBody?.items?.[0]?.variant === "Size: 6",
    `the chosen size is saved with the order (${orderBody?.items?.[0]?.variant})`);
  log(orderBody?.phone_digits === "0555123456",
    `the digits-only phone is saved for tracking (${orderBody?.phone_digits})`);
  log(
    stockCallBody?.p_id === "aaaaaaaa-1111-2222-3333-444444444444" && stockCallBody?.p_qty === 1,
    "stock is taken off through the atomic database function, not a read-then-write"
  );
  const cartAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("dl-cart") || "{}"));
  log((cartAfter?.state?.items || []).length === 0, "the basket is emptied once the order is saved");
  log(errors.length === 0, `no uncaught errors at checkout${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  await page.close();
}

/* ══════════════════════════════════════════════════════════
   PHASE 4 — order tracking, with and without the new function
   ══════════════════════════════════════════════════════════ */
const TRACKED_ORDER = {
  id: "deadbeef-1234-5678-9abc-def012345678",
  status: "shipped",
  created_at: "2026-09-20T12:00:00Z",
  total: 4500,
  customer_name: "Amina Test",
  address: "12 Rue des Fleurs",
  state: "Alger",
  phone_digits: "0555123456",
  items: [{ name: "Éclat Signet Ring", price: 4500, qty: 1, variant: "Size: 6" }],
};

async function trackOrder({ withFunction }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let rpcUsed = false;

  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(body),
      });

    if (url.includes("/rpc/lookup_order")) {
      if (!withFunction) {
        return json({ code: "PGRST202", message: "Could not find the function public.lookup_order" }, 404);
      }
      rpcUsed = true;
      return json([TRACKED_ORDER]);
    }
    if (url.includes("/rest/v1/orders")) return json([TRACKED_ORDER]);
    return json([]);
  });

  await page.goto(`${BASE}/track-order`, { waitUntil: "networkidle" });
  await page.fill("#track-reference", "DL-deadbeef");
  await page.fill("#track-phone", "0555 12 34 56");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2500);

  const text = (await page.locator("body").textContent()) || "";
  const found = /Éclat Signet Ring/.test(text) && /Size: 6/.test(text);
  log(found, `tracking finds the order (${withFunction ? "database function present" : "function missing → fallback"})`);
  if (withFunction) log(rpcUsed, "and it went through the new function");
  log(/12 Rue des Fleurs/.test(text), "and shows the delivery details that were on the order");
  log(errors.length === 0, `no uncaught errors tracking${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  await page.close();
}

await trackOrder({ withFunction: true });
await trackOrder({ withFunction: false });

await browser.close();
server.close();

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
