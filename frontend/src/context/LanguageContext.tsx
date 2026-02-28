import { createContext, useContext, useState, type ReactNode } from "react";
import { translations, type Lang, type Translations } from "../i18n/translations";

interface LanguageContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("ccm-lang");
    if (saved === "ja" || saved === "en") return saved;
    return "ja";
  });

  const toggleLang = () =>
    setLang((l) => {
      const next = l === "ja" ? "en" : "ja";
      localStorage.setItem("ccm-lang", next);
      return next;
    });

  const t = translations[lang] as Translations;

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
