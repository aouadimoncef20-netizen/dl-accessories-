// ════════════════════════════════════════════════════════════
//  Supabase Auth — the real accounts
// ════════════════════════════════════════════════════════════
//  Why this exists: the app used to sign people in entirely from
//  this browser, which meant every request reached the database as
//  the `anon` role — so the tables had to be writable (and
//  readable!) by anyone holding the public key.
//
//  With a real Supabase session, requests carry an access token and
//  the database can tell a real account from a stranger. That is
//  what lets SUPABASE_AUTH_LOCKDOWN.sql close the tables.
//
//  Every function here is written so a failure is NEVER worse than
//  not having Supabase Auth at all: if the project is unreachable,
//  slow, or the account doesn't exist there yet, we report that
//  plainly and the caller falls back to the local path.
// ════════════════════════════════════════════════════════════

import supabase from "./supabase";
import { isAdminEmail } from "./adminAuth";

// A network hiccup must not leave the sign-in button spinning forever.
const TIMEOUT_MS = 8000;

function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timed out reaching Supabase.")), ms)
    ),
  ]);
}

/** Supabase's auth user → the session shape the rest of the app expects. */
export function mapSession(session) {
  const u = session?.user;
  if (!u?.email) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || u.email.split("@")[0],
    role: isAdminEmail(u.email) ? "admin" : "user",
    created_at: u.created_at || null,
  };
}

/**
 * The account already signed in on this device, if any.
 * `getSession()` reads local storage first, so this still answers
 * while the database is unreachable.
 */
export async function authCurrentSession() {
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), 4000);
    return data?.session || null;
  } catch {
    return null;
  }
}

/** Password sign-in. Returns { session, user, reason, offline } — never throws. */
export async function authSignIn(email, password) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password })
    );
    if (error || !data?.session) {
      return { session: null, user: null, reason: error?.message || "no session" };
    }
    return { session: data.session, user: mapSession(data.session) };
  } catch (err) {
    return { session: null, user: null, offline: true, reason: err?.message };
  }
}

/**
 * Password sign-up. Returns { session, user, reason, offline, needsConfirm }.
 * `needsConfirm` is true when Supabase created the account but is waiting for
 * the customer to click a confirmation email, so there is no session yet.
 */
export async function authSignUp(email, password, name) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
    );
    if (error) {
      return { session: null, user: null, reason: error.message };
    }
    if (data?.session) {
      return { session: data.session, user: mapSession(data.session) };
    }
    return {
      session: null,
      user: data?.user ? mapSession({ user: data.user }) : null,
      needsConfirm: !!data?.user,
      reason: "confirmation required",
    };
  } catch (err) {
    return { session: null, user: null, offline: true, reason: err?.message };
  }
}

/** Clear the Supabase session too — never throws. */
export async function authSignOut() {
  try {
    await withTimeout(supabase.auth.signOut(), 4000);
  } catch {}
}

/** Change the password of the signed-in Supabase account. */
export async function authUpdatePassword(password) {
  try {
    const { error } = await withTimeout(
      supabase.auth.updateUser({ password })
    );
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, offline: true, reason: err?.message };
  }
}
