import { createContext, useContext, useState, type ReactNode } from "react";

export type Timezone = "Asia/Tokyo" | "UTC";

interface TimezoneContextValue {
  tz: Timezone;
  toggleTz: () => void;
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [tz, setTz] = useState<Timezone>(() => {
    const saved = localStorage.getItem("ccm-tz");
    if (saved === "Asia/Tokyo" || saved === "UTC") return saved;
    return "Asia/Tokyo";
  });

  const toggleTz = () =>
    setTz((t) => {
      const next = t === "Asia/Tokyo" ? "UTC" : "Asia/Tokyo";
      localStorage.setItem("ccm-tz", next);
      return next;
    });

  return (
    <TimezoneContext.Provider value={{ tz, toggleTz }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const ctx = useContext(TimezoneContext);
  if (!ctx) throw new Error("useTimezone must be used within TimezoneProvider");
  return ctx;
}
