import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "light" | "dark";

export interface ChartTheme {
  series: string[];
  tooltipStyle: { backgroundColor: string; border: string; borderRadius: string };
  labelStyle: { color: string };
  gridStroke: string;
  axisTick: { fill: string; fontSize: number };
  accent: string;
  highlight: string;
  legendText: string;
}

const DARK: ChartTheme = {
  series: ["#5b84ad", "#D09683", "#a08a82", "#7a6e78", "#7aadcc", "#e0b8a8", "#c4b0a8", "#9a8e96"],
  tooltipStyle: { backgroundColor: "#2a272c", border: "1px solid #403c42", borderRadius: "8px" },
  labelStyle: { color: "#ede8e3" },
  gridStroke: "#3a363e",
  axisTick: { fill: "#8a807a", fontSize: 12 },
  accent: "#5b84ad",
  highlight: "#D09683",
  legendText: "#b0a8a0",
};

const LIGHT: ChartTheme = {
  series: ["#2D4262", "#D09683", "#73605B", "#363237", "#4a6a8f", "#c07860", "#9a8880", "#5a545c"],
  tooltipStyle: { backgroundColor: "#ffffff", border: "1px solid #ddd3ca", borderRadius: "8px" },
  labelStyle: { color: "#363237" },
  gridStroke: "#e0d6cf",
  axisTick: { fill: "#73605B", fontSize: 12 },
  accent: "#2D4262",
  highlight: "#c0826f",
  legendText: "#73605B",
};

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  chart: ChartTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("ccm-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("ccm-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const chart = theme === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, chart }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
