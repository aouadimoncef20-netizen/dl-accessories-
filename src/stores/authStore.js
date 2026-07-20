import { create } from "zustand";
import { supabase } from "../lib/supabase";

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      set({ user: session.user });
      await get().loadProfile(session.user.id);
      get().checkAdmin(session.user.email);
    }
    set({ loading: false });
  },

  loadProfile: async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) set({ profile: data });
  },

  checkAdmin: (email) => {
    const adminEmails = (process.env.REACT_APP_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase());
    set({ isAdmin: adminEmails.includes(email?.toLowerCase()) });
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from("profiles").insert([
        { id: data.user.id, full_name: name },
      ]);
      set({ user: data.user });
    }
    return data;
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    set({ user: data.user });
    await get().loadProfile(data.user.id);
    get().checkAdmin(data.user.email);
    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, isAdmin: false });
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (error) throw error;
    set({ profile: data });
    return data;
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
}));

export default useAuthStore;
