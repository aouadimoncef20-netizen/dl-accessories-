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

const ADMIN_PASSWORD_SHA256 =
  "2f0551423b06bbc39c9afcb046c3d7d857cad661eb7b184a5595ac8d776fcd09";

/** True if this email is the reserved store-admin address. */
export function isAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

/** Check a typed password against the built-in hash. */
export async function verifyAdminPassword(password) {
  const hash = await sha256(String(password));
  return hash === ADMIN_PASSWORD_SHA256;
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
