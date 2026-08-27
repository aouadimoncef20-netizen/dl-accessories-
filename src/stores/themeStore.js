import { create } from "zustand";
import { persist } from "zustand/middleware";

const useThemeStore = create(
  persist(
    (set, get) => ({
      mode: "light", // "light" | "dark" | "system"

      init: () => {
        const { mode } = get();
        applyTheme(mode);
      },

      setMode: (mode) => {
        set({ mode });
        applyTheme(mode);
      },

      toggle: () => {
        const current = get().mode;
        const next = current === "dark" ? "light" : "dark";
        set({ mode: next });
        applyTheme(next);
      },

      resolved: () => {
        const { mode } = get();
        if (mode === "system") {
          return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        }
        return mode;
      },
    }),
    { name: "dl-theme" }
  )
);

function applyTheme(mode) {
  const root = document.documentElement;
  let resolved = mode;
  if (mode === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  root.setAttribute("data-theme", resolved);
  root.classList.toggle("dark", resolved === "dark");
}

// Listen for system preference changes
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const store = useThemeStore.getState();
      if (store.mode === "system") {
        applyTheme("system");
      }
    });
}

export default useThemeStore;
