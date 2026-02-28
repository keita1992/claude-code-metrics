import { useTimezone } from "../context/TimezoneContext";
import { useLang } from "../context/LanguageContext";

export default function TimezoneToggle() {
  const { tz, toggleTz } = useTimezone();
  const { t } = useLang();

  return (
    <button
      onClick={toggleTz}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-ink-secondary hover:bg-panel-hover hover:text-ink transition-colors"
      aria-label={t.timezone.label}
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
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
      {tz === "Asia/Tokyo" ? t.timezone.switchToUtc : t.timezone.switchToJst}
    </button>
  );
}
