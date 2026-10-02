import { create } from "zustand";
import { persist } from "zustand/middleware";

const useThemeStore = create(
  persist(
    (set, get) => ({
      // "light" | "dark". A saved cart from an older version may still say
      // "system"; applyTheme below honours it, but nothing sets it any more.
      mode: "light",

      init: () => {
        const { mode } = get();
        applyTheme(mode);
      },

      toggle: () => {
        const current = get().mode;
        const next = current === "dark" ? "light" : "dark";
        set({ mode: next });
        applyTheme(next);
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
