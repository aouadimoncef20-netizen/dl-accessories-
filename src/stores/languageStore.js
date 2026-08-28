import { create } from "zustand";
import { persist } from "zustand/middleware";

const LANGS = ["en", "fr", "ar"];

const useLanguageStore = create(
  persist(
    (set, get) => ({
      lang: "en",

      setLang: (lang) => {
        set({ lang });
        applyDir(lang);
      },

      toggle: () => {
        const current = get().lang;
        const idx = LANGS.indexOf(current);
        const next = LANGS[(idx + 1) % LANGS.length];
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
