// ════════════════════════════════════════════════════════════
//  STORE ADMIN CREDENTIALS — the fallback
// ════════════════════════════════════════════════════════════
//  The admin has two ways in, tried in this order:
//
//    1. A real Supabase Auth account for ADMIN_EMAIL (see
//       src/lib/supabaseAuth.js). This is the one that survives a
//       database lockdown and works on any device.
//    2. The built-in account below — no registration, no service
//       required. It is what keeps the dashboard reachable when
//       the database is unreachable.
//
//  The built-in password is NOT stored in plain text — only its
//  SHA-256 hash. Nobody reading the built JavaScript can recover
//  the password from it.
//
//  TO CHANGE THE BUILT-IN PASSWORD:
//    In the project folder run `npm run admin:password`. It asks for the
//    new password twice (nothing is echoed), rewrites the hash below,
//    and — if the database is reachable — also updates the matching
//    Supabase Auth account. Then run `npm run build` and redeploy.
// ════════════════════════════════════════════════════════════

import { sha256 } from "./passwords";

export const ADMIN_EMAIL = "zaki1@dlaccessories.com";
export const ADMIN_NAME = "Store Admin";

/**
 * The address printed on the older password sheet. There has never been a
 * Supabase account for it, but accepting it here means a credential saved
 * under that name still opens the dashboard instead of being turned away
 * with "Invalid email or password".
 */
export const ADMIN_EMAIL_ALIASES = ["admin@dlaccessories.com"];

const ADMIN_EMAILS = [ADMIN_EMAIL, ...ADMIN_EMAIL_ALIASES];

const ADMIN_PASSWORD_SHA256 =
  "2f0551423b06bbc39c9afcb046c3d7d857cad661eb7b184a5595ac8d776fcd09";

/** True if this email is the store-admin address (or its older alias). */
export function isAdminEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalized);
}

/** Check a typed password against the built-in hash. */
export async function verifyAdminPassword(password) {
  const typed = String(password);
  if ((await sha256(typed)) === ADMIN_PASSWORD_SHA256) return true;

  // A password copied from a note or a chat often arrives with a trailing
  // space or newline. Try the trimmed form as a second chance; the exact
  // password is still checked first, so a password that really ends in a
  // space keeps working too.
  const trimmed = typed.trim();
  return trimmed !== typed && (await sha256(trimmed)) === ADMIN_PASSWORD_SHA256;
}

/** The session object the rest of the app expects. */
export function adminSession() {
  return {
    id: "store-admin",
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    role: "admin",
    created_at: null,
  };
}
