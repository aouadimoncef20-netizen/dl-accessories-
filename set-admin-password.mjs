/**
 * DL Accessories — change the store admin's password.
 *
 *   npm run admin:password
 *
 * Why this exists: the password in the code is a SHA-256 hash, and the only
 * safe way to replace it is on your own machine. Type the new password here
 * and it never leaves this terminal — it is not printed, not logged, and not
 * sent anywhere except to Supabase's sign-up endpoint.
 *
 * It does two things:
 *   1. writes the new hash into src/lib/adminAuth.js  (the built-in login)
 *   2. creates your `zaki1@dlaccessories.com` account in Supabase Auth
 *      (the account the lockdown SQL trusts — see SUPABASE_AUTH_LOCKDOWN.sql)
 *
 * Options
 *   --file <path>    write to a different file (used for testing)
 *   --local-only     skip Supabase, just update the hash in the code
 */
import crypto from "node:crypto";
import fs from "node:fs";
import readline from "node:readline";

const args = process.argv.slice(2);
const fileArg = args.indexOf("--file");
const TARGET = fileArg !== -1 ? args[fileArg + 1] : "src/lib/adminAuth.js";
const LOCAL_ONLY = args.includes("--local-only");

if (!fs.existsSync(TARGET)) {
  console.error(`Couldn't find ${TARGET}. Run this from the project folder (the one with package.json).`);
  process.exit(1);
}

const source = fs.readFileSync(TARGET, "utf8");
const emailMatch = source.match(/ADMIN_EMAIL\s*=\s*["']([^"']+)["']/);
const hashMatch = source.match(/ADMIN_PASSWORD_SHA256\s*=\s*\n?\s*["']([a-f0-9]{64})["']/);
if (!emailMatch || !hashMatch) {
  console.error(`Couldn't read ADMIN_EMAIL / ADMIN_PASSWORD_SHA256 from ${TARGET}.`);
  process.exit(1);
}
const ADMIN_EMAIL = emailMatch[1];
const CURRENT_HASH = hashMatch[1];

const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

/* ── Asking without echoing ─────────────────────────────── */
// Piped input (a test harness) arrives all at once, so read the whole of
// stdin up front and hand the lines out one at a time. A real terminal takes
// the key-at-a-time path instead, where nothing typed is ever echoed.
let pipedLines = null;
async function readPiped() {
  if (pipedLines) return pipedLines;
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  pipedLines = Buffer.concat(chunks).toString("utf8").split(/\r?\n/);
  return pipedLines;
}

function ask(question) {
  if (process.stdin.isTTY) {
    return new Promise((resolve) => {
      process.stdout.write(question);
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");
      let value = "";
      const onData = (char) => {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(wasRaw);
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value);
        } else if (char === "\u0003") {
          process.stdout.write("\n");
          process.exit(130);
        } else if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
        } else if (char >= " ") {
          value += char;
        }
      };
      stdin.on("data", onData);
    });
  }
  return readPiped().then((lines) => {
    process.stdout.write(`${question}\n`);
    return lines.shift() ?? "";
  });
}

/* ── Read the .env for the Supabase project ─────────────── */
function envValue(name) {
  if (!fs.existsSync(".env")) return null;
  const line = fs.readFileSync(".env", "utf8").split(/\r?\n/).find((l) => l.startsWith(name));
  return line ? line.split("=").slice(1).join("=").trim() : null;
}

console.log(`
DL Accessories — set the admin password
=======================================
Admin account: ${ADMIN_EMAIL}
Code file:     ${TARGET}
`);

const password = await ask("New password (typing is hidden): ");
const again = await ask("Type it once more: ");

if (!password) {
  console.error("\nNothing entered — no changes made.");
  process.exit(1);
}
if (password !== again) {
  console.error("\nThose two didn't match — no changes made. Try again.");
  process.exit(1);
}
if (password.length < 12) {
  console.error(`\nThat's ${password.length} characters. Use at least 12 — this one guards the store dashboard.`);
  process.exit(1);
}
if (sha256(password) === CURRENT_HASH) {
  console.error("\nThat is the password you already have — nothing to change.");
  process.exit(1);
}

/* ── 1. The hash in the code ────────────────────────────── */
const updated = source.replace(
  /ADMIN_PASSWORD_SHA256\s*=\s*\n?\s*["'][a-f0-9]{64}["']/,
  `ADMIN_PASSWORD_SHA256 =\n  "${sha256(password)}"`
);
if (updated === source) {
  console.error("\nCouldn't rewrite the hash — the file has changed shape. Tell me, and I'll fix the pattern.");
  process.exit(1);
}
fs.writeFileSync(TARGET, updated, "utf8");
console.log(`\n✓ Updated the password in ${TARGET}`);

/* ── 2. The Supabase account ────────────────────────────── */
const URL_BASE = envValue("REACT_APP_SUPABASE_URL");
const KEY = envValue("REACT_APP_SUPABASE_ANON_KEY");

if (LOCAL_ONLY || !URL_BASE || !KEY) {
  console.log(
    LOCAL_ONLY
      ? "\nSkipped Supabase (--local-only)."
      : "\nCouldn't find the Supabase keys in .env — skipped creating the account there."
  );
} else {
  console.log("\nCreating the matching account in Supabase…");
  const call = async (path, body) => {
    const res = await fetch(`${URL_BASE}${path}`, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json };
  };

  try {
    const signIn = await call("/auth/v1/token?grant_type=password", {
      email: ADMIN_EMAIL,
      password,
    });

    if (signIn.status === 200 && signIn.json?.access_token) {
      console.log("✓ That account already existed and the new password works.");
      await fetch(`${URL_BASE}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: KEY, Authorization: `Bearer ${signIn.json.access_token}` },
      });
    } else {
      const signUp = await call("/auth/v1/signup", { email: ADMIN_EMAIL, password });
      const created = signUp.json?.id || signUp.json?.user?.id;

      if (signUp.status === 200 && signUp.json?.access_token) {
        console.log("✓ Account created and confirmed — you can sign in with it now.");
      } else if (created && !signUp.json?.access_token) {
        console.log(
          "! Account created, but Supabase still wants an email confirmation.\n" +
          "  Either turn off Authentication → Sign In / Providers → Email → Confirm email,\n" +
          "  or open Authentication → Users and confirm the address by hand."
        );
      } else if (/already|registered|exists/i.test(JSON.stringify(signUp.json))) {
        console.log(
          "! An account with this address already exists in Supabase, with a different password.\n" +
          "  In Authentication → Users, delete that user, then run this again —\n" +
          "  or set its password from the dashboard."
        );
      } else {
        console.log(`! Supabase said: ${signUp.json?.msg || signUp.json?.message || `HTTP ${signUp.status}`}`);
      }
    }
  } catch (err) {
    console.log(`! Couldn't reach Supabase (${err.message}). The password in the code is updated; the account step can wait.`);
  }
}

console.log(`
Next
  1. npm run build      → the new password takes effect in the site
  2. Before running SUPABASE_AUTH_LOCKDOWN.sql, sign out and back in as
     ${ADMIN_EMAIL} in the app and check the dashboard loads your products.
`);
