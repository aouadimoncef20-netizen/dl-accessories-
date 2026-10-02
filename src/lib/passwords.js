// ════════════════════════════════════════════════════════════
//  Password hashing
// ════════════════════════════════════════════════════════════
//  Used for the two places that still keep a credential in this
//  browser: the built-in store admin (src/lib/adminAuth.js) and
//  the local account list (src/stores/authStore.js).
//
//  This is SHA-256, not a password-hashing algorithm — it is here
//  to stop a plain-text password sitting in localStorage where
//  anyone with the phone can read it. Real accounts should live in
//  Supabase Auth (see SUPABASE_AUTH_LOCKDOWN.sql).
// ════════════════════════════════════════════════════════════

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 of a string, as lowercase hex. Throws off a secure origin. */
export async function sha256(text) {
  const subtle = window.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "Signing in requires a secure connection (https:// or localhost)."
    );
  }
  const bytes = new TextEncoder().encode(String(text));
  return toHex(await subtle.digest("SHA-256", bytes));
}

/** Stored form: "sha256:<hex>". Older records were written in plain text. */
export async function hashPassword(password) {
  return `sha256:${await sha256(password)}`;
}

export function isHashed(stored) {
  return typeof stored === "string" && stored.startsWith("sha256:");
}

/** True when `password` matches whatever shape `stored` happens to be in. */
export async function passwordMatches(stored, password) {
  if (typeof stored !== "string" || !stored) return false;
  if (!isHashed(stored)) return stored === String(password);
  return stored === (await hashPassword(password));
}
