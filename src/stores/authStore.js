import { create } from "zustand";
import {
  ADMIN_EMAIL,
  adminSession,
  isAdminEmail,
  verifyAdminPassword,
} from "../lib/adminAuth";
import {
  authCurrentSession,
  authSignIn,
  authSignOut,
  authSignUp,
  authUpdatePassword,
  mapSession,
} from "../lib/supabaseAuth";
import {
  hashPassword,
  isHashed,
  passwordMatches,
} from "../lib/passwords";

const STORAGE_KEY = "dl_auth_user";
const USERS_KEY = "dl_users";

/** Every lookup and comparison goes through this, so casing never matters. */
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function checkIsAdmin(user) {
  if (!user) return false;
  if (user.email === ADMIN_EMAIL) return true;
  if (user.role === "admin") return true;
  // Check the persisted users list in case the session was stale
  const users = getUsers();
  const stored = users.find((u) => u.id === user.id);
  return stored?.role === "admin";
}

// Only ask Supabase about a session if this device ever had one — otherwise
// every cold start would pay a network round trip for nothing.
function hasSupabaseToken() {
  try {
    return Object.keys(localStorage).some(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
    );
  } catch {
    return false;
  }
}

function persist(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

const useAuthStore = create((set, get) => ({
  user: loadSession(),
  profile: null,
  loading: false,
  isAdmin: checkIsAdmin(loadSession()),

  initialize: async () => {
    // A real Supabase session is the account the database itself trusts, so
    // it wins. If there is none (or the project is unreachable), the session
    // saved in this browser keeps working exactly as before.
    if (hasSupabaseToken()) {
      const sb = await authCurrentSession();
      const session = mapSession(sb);
      if (session) {
        persist(session);
        set({ user: session, isAdmin: checkIsAdmin(session), loading: false });
        return;
      }
    }

    const local = loadSession();
    set({ user: local, isAdmin: checkIsAdmin(local), loading: false });
  },

  signUp: async (email, password, name) => {
    const normalized = normalizeEmail(email);

    // The admin address is reserved — it must never be self-registered
    // (whoever registered it first would own the store dashboard).
    if (isAdminEmail(normalized)) {
      throw new Error("This email is reserved for the store administrator.");
    }
    if (String(password || "").length < 6) {
      throw new Error("Choose a password of at least 6 characters.");
    }

    // ── 1. A real account, if the account system is reachable ──
    const remote = await authSignUp(normalized, password, name);
    if (remote.session && remote.user) {
      set({ user: remote.user, isAdmin: checkIsAdmin(remote.user) });
      persist(remote.user);
      return { user: remote.user, source: "supabase" };
    }

    // ── 2. Otherwise an account that lives in this browser ──
    const users = getUsers();
    if (users.find((u) => normalizeEmail(u.email) === normalized)) {
      throw new Error("An account with this email already exists.");
    }

    const newUser = {
      id: crypto.randomUUID(),
      email: normalized,
      password: await hashPassword(password), // never the typed password
      name,
      role: "user",
    };
    users.push(newUser);
    saveUsers(users);

    const session = { id: newUser.id, email: normalized, name, role: "user" };
    set({ user: session, isAdmin: false });
    persist(session);
    return {
      user: session,
      source: "local",
      needsConfirm: !!remote.needsConfirm,
    };
  },

  signIn: async (email, password) => {
    const normalized = normalizeEmail(email);

    // ── 1. A real account (works on every device, survives a clear-out) ──
    const remote = await authSignIn(normalized, password);
    if (remote.user) {
      set({ user: remote.user, profile: null, isAdmin: checkIsAdmin(remote.user) });
      persist(remote.user);
      return { user: remote.user, source: "supabase" };
    }

    // ── 2. Store admin: the built-in account ──
    if (isAdminEmail(normalized)) {
      const ok = await verifyAdminPassword(password);
      if (!ok) throw new Error("Invalid email or password.");
      const session = adminSession();
      set({ user: session, profile: null, isAdmin: true });
      persist(session);
      return { user: session, source: "built-in" };
    }

    // ── 3. Accounts created in this browser ──
    const users = getUsers();
    const found = users.find((u) => normalizeEmail(u.email) === normalized);
    const ok = found && (await passwordMatches(found.password, password));
    if (!ok) throw new Error("Invalid email or password.");

    // Older records stored the password as plain text. Upgrade it to a hash
    // the first time we know for certain what it is.
    if (!isHashed(found.password)) {
      const idx = users.indexOf(found);
      users[idx] = { ...found, password: await hashPassword(password) };
      saveUsers(users);
    }

    const session = {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role || "user",
    };
    set({ user: session, isAdmin: checkIsAdmin(session) });
    persist(session);
    return { user: session, source: "local" };
  },

  signOut: async () => {
    await authSignOut(); // drop the Supabase session too, if there is one
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, profile: null, isAdmin: false });
  },

  // NOTE: there is deliberately no `makeAdmin()` here any more. Admin
  // rights come only from signing in with the reserved admin account
  // (see src/lib/adminAuth.js) — never from a button a customer can press.

  // With a real account signed in on this device we can change the password
  // for real. Otherwise we fall back to the account list in this browser —
  // and we never store the new password in plain text either way.
  resetPassword: async (email, newPassword) => {
    const normalized = normalizeEmail(email);
    if (!newPassword || String(newPassword).length < 6) {
      throw new Error("Choose a password of at least 6 characters.");
    }

    const sb = await authCurrentSession();
    if (normalizeEmail(sb?.user?.email) === normalized) {
      const res = await authUpdatePassword(newPassword);
      if (res.ok) return true;
      throw new Error(
        res.offline
          ? "We couldn't reach the account system just now. Please try again in a moment."
          : res.reason || "Couldn't change that password."
      );
    }

    const users = getUsers();
    const idx = users.findIndex((u) => normalizeEmail(u.email) === normalized);
    if (idx === -1) {
      throw new Error(
        "No account with that email exists on this device. If you signed up on a different phone or browser, email us instead."
      );
    }
    users[idx] = { ...users[idx], password: await hashPassword(newPassword) };
    saveUsers(users);
    return true;
  },
}));

export default useAuthStore;
