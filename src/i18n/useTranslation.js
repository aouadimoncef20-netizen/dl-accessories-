import useLanguageStore from "../stores/languageStore";
import translations from "./translations";

export default function useTranslation() {
  const lang = useLanguageStore((s) => s.lang);

  const t = (key, vars) => {
    let text = translations[lang]?.[key] || translations.fr[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        text = text.replace(`{${k}}`, vars[k]);
      });
    }
    return text;
  };

  return { t, lang, isRtl: lang === "ar" };
}
