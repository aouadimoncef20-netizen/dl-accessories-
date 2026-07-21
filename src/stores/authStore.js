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

const useAuthStore = create((set, get) => ({
  user: loadSession(),
  profile: null,
  loading: false,
  isAdmin: loadSession()?.email === ADMIN_EMAIL,

  initialize: async () => {
    const session = loadSession();
    if (session) {
      set({
        user: session,
        isAdmin: session.email === ADMIN_EMAIL,
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
    const newUser = { id: crypto.randomUUID(), email, password, name };
    users.push(newUser);
    saveUsers(users);
    set({ user: { id: newUser.id, email, name }, isAdmin: false });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: newUser.id, email, name }));
    return { user: { id: newUser.id, email, name } };
  },

  signIn: async (email, password) => {
    const users = getUsers();
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) {
      throw new Error("Invalid email or password.");
    }
    const session = { id: found.id, email: found.email, name: found.name };
    set({ user: session, isAdmin: email === ADMIN_EMAIL });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { user: session };
  },

  signOut: async () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, profile: null, isAdmin: false });
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
