#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
//  Runs SQL against the live Supabase project, from this machine,
//  through the Supabase Management API.
//
//  Needs a personal access token (starts with "sbp_") — create one at
//  https://supabase.com/dashboard/account/tokens and save it to
//      %USERPROFILE%\Desktop\supabase-token.txt
//  or set the SUPABASE_ACCESS_TOKEN environment variable.
//
//  That token can change anything in the whole Supabase account.
//  Revoke it at the same page as soon as you are done.
//
//  Commands
//    ping                 prove the token works
//    admin-user           create/confirm zaki1@dlaccessories.com in Supabase Auth
//    migrate              run SUPABASE_MIGRATION.sql
//    lockdown             run SUPABASE_AUTH_LOCKDOWN.sql   (run this LAST)
//    autoconfirm          stop Supabase demanding an email nobody can receive
//    run <file.sql>       run any SQL file
//    keys                 list the project's API key names (never their values)
//
//  Secrets (the token, the service-role key, any password) are never
//  printed and never written to disk by this script.
// ════════════════════════════════════════════════════════════

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MANAGEMENT = "https://api.supabase.com/v1";
const ADMIN_EMAIL = "zaki1@dlaccessories.com";

// ── arguments ────────────────────────────────────────────────
const argv = process.argv.slice(2);
const command = argv[0];
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1] || null;
};

function die(message) {
  console.error("\n✗ " + message);
  process.exit(1);
}

// ── project ref, from .env ───────────────────────────────────
function projectRef() {
  const given = flag("--ref");
  if (given) return given;
  for (const file of [".env", ".env.local"]) {
    if (!fs.existsSync(file)) continue;
    const match = fs
      .readFileSync(file, "utf8")
      .match(/REACT_APP_SUPABASE_URL\s*=\s*"?https:\/\/([a-z0-9]+)\.supabase\.co/m);
    if (match) return match[1];
  }
  die("Couldn't find REACT_APP_SUPABASE_URL in .env — pass --ref <project-ref> instead.");
}

// ── token ────────────────────────────────────────────────────
function accessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  const file =
    flag("--token-file") || path.join(os.homedir(), "Desktop", "supabase-token.txt");
  if (!fs.existsSync(file)) {
    die(
      `No token found.\n  Save it to: ${file}\n` +
        `  (create one at https://supabase.com/dashboard/account/tokens)\n` +
        `  Nothing but the token itself needs to be in that file.`
    );
  }
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/sbp_[A-Za-z0-9_\-]+/);
  if (!match) die(`The file ${file} doesn't contain a token starting with "sbp_".`);
  return match[0];
}

const REF = projectRef();
const TOKEN = accessToken();
const AUTH = { Authorization: `Bearer ${TOKEN}` };

// ── Management API helpers ───────────────────────────────────
async function api(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...AUTH, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, json: () => safeJson(text) };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Run one SQL script. Tries the query endpoint, falls back to migrations. */
async function runSql(sql, name) {
  const attempts = [
    { url: `${MANAGEMENT}/projects/${REF}/database/query`, body: { query: sql }, label: "database/query" },
    {
      url: `${MANAGEMENT}/projects/${REF}/database/migrations`,
      body: { query: sql, name },
      label: "database/migrations",
    },
  ];
  let last = "";
  for (const attempt of attempts) {
    const res = await api(attempt.url, { method: "POST", body: JSON.stringify(attempt.body) });
    if (res.ok) return { via: attempt.label, text: res.text };
    last = `${attempt.label} → HTTP ${res.status}: ${res.text.slice(0, 400)}`;
    if (res.status !== 404 && res.status !== 405) break;
  }
  throw new Error(last);
}

/** The project's service-role key — needed to touch Supabase Auth's admin API. */
async function serviceKey() {
  for (const url of [
    `${MANAGEMENT}/projects/${REF}/api-keys?reveal=true`,
    `${MANAGEMENT}/projects/${REF}/api-keys`,
  ]) {
    const res = await api(url);
    if (!res.ok) continue;
    const data = res.json();
    const list = Array.isArray(data) ? data : data?.api_keys || [];
    const found = list.find((k) => /service_role/i.test(k.name || k.id || ""));
    const value = found?.api_key || found?.secret;
    if (value) return value;
  }
  return null;
}

const authBase = `https://${REF}.supabase.co/auth/v1`;

async function ensureAdminUser() {
  const passwordFile =
    flag("--password-file") ||
    path.join(os.homedir(), "Desktop", "DL-admin-password-READ-THEN-DELETE.txt");
  if (!fs.existsSync(passwordFile)) {
    die(`No admin password found at ${passwordFile} — pass --password-file <path>.`);
  }
  const password = fs.readFileSync(passwordFile, "utf8").match(
    /^\s*([A-Za-z0-9]{6}(?:-[A-Za-z0-9]{6}){3})\s*$/m
  )?.[1];
  if (!password) die(`Couldn't read a password out of ${passwordFile}.`);

  const key = await serviceKey();
  if (!key) die("Couldn't read the service-role key from the Management API.");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  // Does the account already exist?
  const list = await fetch(`${authBase}/admin/users?per_page=200`, { headers });
  let existing = null;
  if (list.ok) {
    const data = safeJson(await list.text());
    const users = data?.users || data || [];
    existing = users.find((u) => String(u.email || "").toLowerCase() === ADMIN_EMAIL) || null;
  } else {
    console.log(`  (couldn't list users — HTTP ${list.status}; will try to create anyway)`);
  }

  const body = JSON.stringify({ email: ADMIN_EMAIL, password, email_confirm: true });
  const res = existing
    ? await fetch(`${authBase}/admin/users/${existing.id}`, { method: "PUT", headers, body })
    : await fetch(`${authBase}/admin/users`, { method: "POST", headers, body });
  const text = await res.text();

  if (!res.ok) {
    console.log(`✗ ${existing ? "Updating" : "Creating"} ${ADMIN_EMAIL} failed — HTTP ${res.status}`);
    console.log("  " + text.slice(0, 400));
    process.exit(1);
  }
  const user = safeJson(text);
  console.log(
    `✓ ${existing ? "Updated" : "Created"} ${ADMIN_EMAIL} — email confirmed, password set`
  );
  console.log(`  user id ${user?.id || (existing && existing.id)}`);
}

// ── commands ─────────────────────────────────────────────────
const commands = {
  async ping() {
    const res = await api(`${MANAGEMENT}/projects/${REF}/database/query`, {
      method: "POST",
      body: JSON.stringify({ query: "select 1 as ok" }),
    });
    if (!res.ok) die(`The Management API refused the token — HTTP ${res.status}: ${res.text.slice(0, 300)}`);
    console.log(`✓ token works, project ${REF} answered`);
  },

  async keys() {
    const res = await api(`${MANAGEMENT}/projects/${REF}/api-keys`);
    if (!res.ok) die(`HTTP ${res.status}: ${res.text.slice(0, 300)}`);
    const data = res.json();
    const list = Array.isArray(data) ? data : data?.api_keys || [];
    console.log(`${list.length} key(s), values not shown:`);
    for (const k of list) console.log(`  · ${k.name || k.id || "(unnamed)"}`);
  },

  async adminUser() {
    console.log(`Ensuring ${ADMIN_EMAIL} exists in Supabase Auth…`);
    await ensureAdminUser();
  },

  /** Customers have no mailbox on this project — without this they can't sign in. */
  async autoconfirm() {
    const res = await api(`${MANAGEMENT}/projects/${REF}/config/auth`, {
      method: "PATCH",
      body: JSON.stringify({ mailer_autoconfirm: true }),
    });
    if (!res.ok) die(`HTTP ${res.status}: ${res.text.slice(0, 300)}`);
    const after = await api(`${MANAGEMENT}/projects/${REF}/config/auth`);
    const on = after.json()?.mailer_autoconfirm;
    console.log(on === true ? "✓ email confirmation is OFF — new customers can sign in straight away" : "✗ the setting did not stick");
  },

  async run() {
    const file = argv[1];
    if (!file) die("Usage: node apply-supabase-sql.mjs run <file.sql>");
    await runFile(file);
  },

  async migrate() {
    await runFile("SUPABASE_MIGRATION.sql");
  },

  async lockdown() {
    console.log("Reminder: the dashboard needs a working Supabase sign-in for");
    console.log(`${ADMIN_EMAIL} BEFORE this runs, or it loses write access.\n`);
    await runFile("SUPABASE_AUTH_LOCKDOWN.sql");
  },
};

async function runFile(file) {
  if (!fs.existsSync(file)) die(`No such file: ${file}`);
  const sql = fs.readFileSync(file, "utf8");
  const name = path.basename(file, ".sql").toLowerCase();
  console.log(`Running ${file} (${sql.length.toLocaleString()} characters)…`);
  try {
    const { via, text } = await runSql(sql, name);
    console.log(`✓ ran through ${via}`);
    if (text && text.trim() && text.trim() !== "[]") console.log("  " + text.trim().slice(0, 500));
    console.log("  now run:  npm run check:db");
  } catch (error) {
    die(String(error.message || error));
  }
}

const chosen = commands[command];
if (!chosen) {
  console.error(
    "Usage: node apply-supabase-sql.mjs <ping|admin-user|migrate|lockdown|autoconfirm|keys|run <file.sql>>"
  );
  process.exit(1);
}
await chosen();
