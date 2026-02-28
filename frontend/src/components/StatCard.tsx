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
  color?: string;
}

const COLOR_MAP: Record<string, string> = {
  violet: "text-violet-500",
  emerald: "text-emerald-500",
  rose: "text-rose-500",
};

const TREND_COLOR_MAP: Record<TrendInfo["direction"], string> = {
  positive: "text-emerald-400",
  negative: "text-rose-400",
  neutral: "text-gray-400",
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
  color = "violet",
}: StatCardProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <p className="text-gray-400 text-sm font-medium text-balance">{title}</p>
      <p className={cn("text-3xl font-bold mt-2 tabular-nums", COLOR_MAP[color] ?? "text-gray-100")}>
        {value}
      </p>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      {trend && (
        <p className={cn("text-sm mt-1 font-medium tabular-nums", TREND_COLOR_MAP[trend.direction])}>
          {TREND_ICON_MAP[trend.direction]} {trend.value}
        </p>
      )}
    </div>
  );
}
