import { cn } from "../lib/utils";

interface TrendInfo {
  value: string;
  direction: "positive" | "negative" | "neutral";
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: TrendInfo;
  color?: "accent" | "highlight";
}

const COLOR_MAP: Record<string, string> = {
  accent: "text-accent",
  highlight: "text-highlight",
};

const TREND_COLOR_MAP: Record<TrendInfo["direction"], string> = {
  positive: "text-accent",
  negative: "text-highlight",
  neutral: "text-ink-muted",
};

const TREND_ICON_MAP: Record<TrendInfo["direction"], string> = {
  positive: "↑",
  negative: "↓",
  neutral: "→",
};

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  color = "highlight",
}: StatCardProps) {
  return (
    <div className="bg-panel rounded-xl p-6 border border-edge">
      <p className="text-ink-secondary text-sm font-medium text-balance">{title}</p>
      <p className={cn("text-3xl font-bold mt-2 tabular-nums", COLOR_MAP[color] ?? "text-ink")}>
        {value}
      </p>
      {subtitle && <p className="text-ink-muted text-sm mt-1">{subtitle}</p>}
      {trend && (
        <p className={cn("text-sm mt-1 font-medium tabular-nums", TREND_COLOR_MAP[trend.direction])}>
          {TREND_ICON_MAP[trend.direction]} {trend.value}
        </p>
      )}
    </div>
  );
}
