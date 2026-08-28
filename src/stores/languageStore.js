import { create } from "zustand";
import { persist } from "zustand/middleware";

const useLanguageStore = create(
  persist(
    (set, get) => ({
      lang: "fr", // "fr" | "ar"

      setLang: (lang) => {
        set({ lang });
        applyDir(lang);
      },

      toggle: () => {
        const current = get().lang;
        const next = current === "fr" ? "ar" : "fr";
        set({ lang: next });
        applyDir(next);
      },

      init: () => {
        applyDir(get().lang);
      },
    }),
    { name: "dl-lang" }
  )
);

function applyDir(lang) {
  const root = document.documentElement;
  root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  root.setAttribute("lang", lang);
}

export default useLanguageStore;
