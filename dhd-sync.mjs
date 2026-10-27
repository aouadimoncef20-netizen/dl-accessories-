#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
//  Copies the places DHD delivers to into your own database.
//
//      node dhd-sync.mjs              → copy them into Supabase
//      node dhd-sync.mjs --dry-run    → just count them, write nothing
//
//  Why: the checkout offers a commune dropdown, and DHD allows
//  only 50 calls a minute. Reading the list from our own tables
//  is instant, free, and keeps working when DHD is down.
//
//  Run it once now, then again whenever DHD adds or drops a
//  wilaya (they cover 55 of the 58 today).
//
//  Credentials, neither of which is printed or written to disk:
//
//   • DHD's API token — the 60-character string from the
//     "Information" button on platform.dhd-dz.com.
//         set DHD_TOKEN in the environment, or save the token
//         alone to  %USERPROFILE%\Desktop\dhd-token.txt
//
//   • A Supabase personal access token (starts with "sbp_") so
//     this can write the data — the same file
//     apply-supabase-sql.mjs already uses:
//         %USERPROFILE%\Desktop\supabase-token.txt
//     Revoke it at https://supabase.com/dashboard/account/tokens
//     when you are done.
//
//  Secrets (both tokens, the service-role key) are never printed.
// ════════════════════════════════════════════════════════════

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MANAGEMENT = "https://api.supabase.com/v1";
const DRY_RUN = process.argv.includes("--dry-run");

// Filled in below, once we know whether we're actually writing.
// These are module-level on purpose: the helpers under them are
// defined at module level too, and a `const` inside the `else` block
// would be invisible to them.
let TOKEN = "";
let SERVICE = "";
let SUPABASE_REST = "";

// ── DHD ──────────────────────────────────────────────────────
const DHD_URL = (process.env.DHD_API_URL || "https://platform.dhd-dz.com").replace(/\/+$/, "");

function dhdToken() {
  if (process.env.DHD_TOKEN) return process.env.DHD_TOKEN.trim();
  const file = path.join(os.homedir(), "Desktop", "dhd-token.txt");
  if (!fs.existsSync(file)) {
    die(
      `No DHD token found.\n  Set DHD_TOKEN, or save the token alone to:\n    ${file}\n` +
        `  (it is the 60-character string behind the "Information" button on platform.dhd-dz.com)`
    );
  }
  const match = fs.readFileSync(file, "utf8").match(/[A-Za-z0-9]{60}/);
  if (!match) die(`The file ${file} doesn't contain a 60-character token.`);
  return match[0];
}

// ── Supabase ─────────────────────────────────────────────────
function projectRef() {
  for (const file of [".env", ".env.local"]) {
    if (!fs.existsSync(file)) continue;
    const match = fs
      .readFileSync(file, "utf8")
      .match(/REACT_APP_SUPABASE_URL\s*=\s*"?https:\/\/([a-z0-9]+)\.supabase\.co/m);
    if (match) return match[1];
  }
  die("Couldn't find REACT_APP_SUPABASE_URL in .env.");
}

function accessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  const file = path.join(os.homedir(), "Desktop", "supabase-token.txt");
  if (!fs.existsSync(file)) {
    die(
      `No Supabase token found.\n  Save one to: ${file}\n` +
        `  (create it at https://supabase.com/dashboard/account/tokens)\n` +
        `  Nothing but the token itself needs to be in that file.`
    );
  }
  const match = fs.readFileSync(file, "utf8").match(/sbp_[A-Za-z0-9_\-]+/);
  if (!match) die(`The file ${file} doesn't contain a token starting with "sbp_".`);
  return match[0];
}

function die(message) {
  console.error("\n✗ " + message);
  process.exit(1);
}

async function management(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

/** The service-role key — lets this write past row-level security. */
async function serviceKey() {
  for (const url of [
    `${MANAGEMENT}/projects/${REF}/api-keys?reveal=true`,
    `${MANAGEMENT}/projects/${REF}/api-keys`,
  ]) {
    const res = await management(url);
    if (!res.ok) continue;
    const list = Array.isArray(res.json) ? res.json : res.json?.api_keys || [];
    const found = list.find((k) => /service_role/i.test(k.name || k.id || ""));
    const value = found?.api_key || found?.secret;
    if (value) return value;
  }
  die("Couldn't read the service-role key from the Management API.");
}

// ── DHD calls ────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dhd(pathname, params = {}) {
  const url = new URL(`${DHD_URL}${pathname}`);
  url.searchParams.set("api_token", DHD);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!res.ok) {
    if (res.status === 429) die("DHD rate limit hit (50/minute). Wait a minute and run it again.");
    die(`DHD ${pathname} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return json;
}

// ── Writing to Supabase ──────────────────────────────────────
async function upsert(table, rows, onConflict) {
  if (!rows.length) return;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const res = await fetch(`${SUPABASE_REST}/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: {
        apikey: SERVICE,
        Authorization: `Bearer ${SERVICE}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(slice),
    });
    if (!res.ok) {
      const text = await res.text();
      die(`Writing ${table} failed → HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
  }
}

/**
 * Delete the places DHD has dropped.
 *
 * The upsert above only adds and updates: a wilaya or a commune the courier
 * no longer serves would stay in our tables for ever, and the checkout would
 * keep offering it until an order was refused at the desk. One statement
 * through the Management API, with the covered set passed in as JSON — so no
 * special characters in a commune name ever have to be escaped into a filter.
 */
async function pruneCoverage(wilayas, communes) {
  // An empty answer is a failed read, not "DHD serves nowhere". Deleting on it
  // would empty the checkout's menu, so do nothing at all.
  if (!wilayas.length || !communes.length) return;

  const asJson = (value) => `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;

  const sql = `
    DELETE FROM dhd_communes c
     WHERE NOT EXISTS (
       SELECT 1
         FROM jsonb_to_recordset(${asJson(communes.map((c) => ({ w: c.wilaya_id, n: c.nom })))}) AS x(w int, n text)
        WHERE x.w = c.wilaya_id AND x.n = c.nom
     );

    DELETE FROM dhd_wilayas w
     WHERE NOT w.wilaya_id = ANY (
       SELECT jsonb_array_elements_text(${asJson(wilayas.map((v) => v.wilaya_id))})::int
     );
  `;

  const res = await fetch(`${MANAGEMENT}/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) die(`Pruning stale places failed → HTTP ${res.status}: ${text.slice(0, 300)}`);
}

/* ═══════════════════════════════════════════════════════════ */

const DHD = dhdToken();
const REF = projectRef();
console.log(`
DL Accessories — DHD places sync
================================
API:      ${DHD_URL}
Project:  ${REF}
Mode:     ${DRY_RUN ? "dry run — nothing will be written" : "writing to Supabase"}
`);

// 1. Which wilayas does DHD actually serve?
console.log("Reading DHD's wilayas…");
const wilayasRaw = await dhd("/api/v1/get/wilayas");
const wilayas = (Array.isArray(wilayasRaw) ? wilayasRaw : wilayasRaw?.data || [])
  .map((w) => ({
    wilaya_id: Number(w.wilaya_id ?? w.id),
    nom: String(w.wilaya_name ?? w.nom ?? w.name ?? "").trim(),
  }))
  .filter((w) => Number.isFinite(w.wilaya_id) && w.nom);

if (!wilayas.length) die("DHD returned no wilayas — has the token stopped working?");
console.log(`✓ ${wilayas.length} wilayas (of Algeria's 58)`);

// 2. Every commune in each of them. DHD allows 50 calls a minute,
//    so we pause between calls rather than get throttled halfway.
console.log(`\nReading communes, one wilaya at a time (about ${wilayas.length * 1.3 | 0}s)…`);
const communes = [];
let withDesk = 0;

for (const [i, w] of wilayas.entries()) {
  const raw = await dhd("/api/v1/get/communes", { wilaya_id: w.wilaya_id });
  const list = Array.isArray(raw) ? raw : raw?.data || [];
  for (const c of list) {
    const nom = String(c.nom ?? c.name ?? "").trim();
    if (!nom) continue;
    const hasDesk = Number(c.has_stop_desk) === 1 || c.has_stop_desk === true;
    if (hasDesk) withDesk++;
    communes.push({
      wilaya_id: w.wilaya_id,
      nom,
      code_postal: c.code_postal ? String(c.code_postal) : null,
      has_stop_desk: hasDesk,
      stop_desk_info: hasDesk ? c.station_info || null : null,
    });
  }
  process.stdout.write(`  ${String(i + 1).padStart(2)}/${wilayas.length}  ${w.nom} — ${list.length} communes\n`);
  if (i < wilayas.length - 1) await sleep(1300); // stay under 50/minute
}

console.log(`✓ ${communes.length} communes, ${withDesk} with an office (stop desk)`);

// 3. Write them home.
if (DRY_RUN) {
  console.log("\nDry run — nothing written. Drop --dry-run to copy them into Supabase.");
} else {
  TOKEN = accessToken();
  SERVICE = await serviceKey();
  SUPABASE_REST = `https://${REF}.supabase.co/rest/v1`;
  console.log("\nWriting to Supabase…");
  await upsert("dhd_wilayas", wilayas, "wilaya_id");
  console.log(`✓ dhd_wilayas — ${wilayas.length} rows`);
  await upsert("dhd_communes", communes, "wilaya_id,nom");
  console.log(`✓ dhd_communes — ${communes.length} rows`);

  // Anything DHD no longer covers goes, so the checkout stops offering it.
  await pruneCoverage(wilayas, communes);
  console.log("✓ stale wilayas and communes removed");
}

console.log(`
Done.

  The wilayas DHD does not serve: ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58]
    .filter((code) => !wilayas.some((w) => w.wilaya_id === code))
    .map((c) => String(c).padStart(2, "0"))
    .join(", ") || "none"}

  Re-run this whenever DHD changes the areas they cover.
`);
