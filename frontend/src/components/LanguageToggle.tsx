import { useLang } from "../context/LanguageContext";

export default function LanguageToggle() {
  const { t, toggleLang } = useLang();

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-ink-secondary hover:bg-panel-hover hover:text-ink transition-colors"
      aria-label={t.language.label}
    >
      <svg
        className="size-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802"
        />
      </svg>
      {t.language.switchTo}
    </button>
  );
}
