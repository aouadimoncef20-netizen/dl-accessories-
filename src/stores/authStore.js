import { create } from "zustand";

const ADMIN_EMAIL = "admin@dlaccessories.com";
const STORAGE_KEY = "dl_auth_user";

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function getUsers() {
  try {
    const raw = localStorage.getItem("dl_users");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem("dl_users", JSON.stringify(users));
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

const useAuthStore = create((set, get) => ({
  user: loadSession(),
  profile: null,
  loading: false,
  isAdmin: checkIsAdmin(loadSession()),

  initialize: async () => {
    const session = loadSession();
    if (session) {
      set({
        user: session,
        isAdmin: checkIsAdmin(session),
        loading: false,
      });
    } else {
      set({ loading: false });
    }
  },

  signUp: async (email, password, name) => {
    const users = getUsers();
    if (users.find((u) => u.email === email)) {
      throw new Error("An account with this email already exists.");
    }
    const role = email === ADMIN_EMAIL ? "admin" : "user";
    const newUser = { id: crypto.randomUUID(), email, password, name, role };
    users.push(newUser);
    saveUsers(users);
    const session = { id: newUser.id, email, name, role };
    set({ user: session, isAdmin: checkIsAdmin(session) });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { user: session };
  },

  signIn: async (email, password) => {
    const users = getUsers();
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) {
      throw new Error("Invalid email or password.");
    }
    const session = { id: found.id, email: found.email, name: found.name, role: found.role || "user" };
    set({ user: session, isAdmin: checkIsAdmin(session) });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { user: session };
  },

  signOut: async () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, profile: null, isAdmin: false });
  },

  // ── Grant admin access to any logged-in user ──
  makeAdmin: async () => {
    const user = get().user;
    if (!user) return;
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx].role = "admin";
      saveUsers(users);
    }
    const updated = { ...user, role: "admin" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ user: updated, isAdmin: true });
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return;
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      saveUsers(users);
    }
    const updated = { ...user, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ user: updated, profile: updated });
    return updated;
  },

  resetPassword: async (email) => {
    // Simulated — no-op in local mode
    if (!getUsers().find((u) => u.email === email)) {
      throw new Error("No account found with this email.");
    }
  },
}));

export default useAuthStore;
