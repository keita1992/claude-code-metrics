import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fetchDaily, type DailyData } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LanguageContext";
import { useTimezone } from "../context/TimezoneContext";
import { cn } from "../lib/utils";

function formatDateInTZ(daysAgo: number, tz: string): string {
  const target = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(target);
}

export default function DailyTrendsPage() {
  const { tz } = useTimezone();
  const [data, setData] = useState<DailyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => formatDateInTZ(30, tz));
  const [endDate, setEndDate] = useState(() => formatDateInTZ(0, tz));
  const [mode, setMode] = useState<"daily" | "weekly">("daily");
  const { chart } = useTheme();
  const { t } = useLang();

  const DATE_PRESETS = [
    { label: t.daily.preset7, days: 7 },
    { label: t.daily.preset30, days: 30 },
    { label: t.daily.preset90, days: 90 },
  ];

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchDaily(startDate, endDate, mode, tz)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [startDate, endDate, mode, tz]);

  useEffect(() => {
    load();
  }, [load]);

  // TZ変更時に日付範囲をリセット
  useEffect(() => {
    setStartDate(formatDateInTZ(30, tz));
    setEndDate(formatDateInTZ(0, tz));
  }, [tz]);

  const applyPreset = (days: number) => {
    setStartDate(formatDateInTZ(days, tz));
    setEndDate(formatDateInTZ(0, tz));
  };

  const chartData = data?.daily.map((d) => ({
    ...d,
    date: mode === "weekly" ? d.date : d.date.slice(5),
  }));

  const summary = data
    ? data.daily.reduce(
        (acc, d) => ({
          totalCost: acc.totalCost + d.estimatedCost,
          totalSessions: acc.totalSessions + d.sessionCount,
          totalTokens:
            acc.totalTokens +
            d.inputTokens +
            d.outputTokens +
            d.cacheReadTokens +
            d.cacheCreationTokens,
        }),
        { totalCost: 0, totalSessions: 0, totalTokens: 0 },
      )
    : null;

  const uniqueSessions = data?.summary?.uniqueSessions ?? summary?.totalSessions ?? 0;

  const avgDailyCost =
    summary && data && data.daily.length > 0
      ? summary.totalCost / data.daily.length
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink text-balance">
            {mode === "daily" ? t.daily.titleDaily : t.daily.titleWeekly}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">TZ: {tz}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-panel-hover rounded-lg border border-edge overflow-hidden">
            <button
              onClick={() => setMode("daily")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "daily"
                  ? "bg-accent text-white"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              {t.daily.modeDaily}
            </button>
            <button
              onClick={() => setMode("weekly")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "weekly"
                  ? "bg-accent text-white"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              {t.daily.modeWeekly}
            </button>
          </div>

          {mode === "daily" && (
            <div className="flex gap-1">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => applyPreset(p.days)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-panel border border-edge rounded-lg text-ink-secondary hover:text-ink hover:border-accent transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {mode === "daily" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-panel border border-edge rounded-lg px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
              />
              <span className="text-ink-muted text-sm">{t.common.to}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-panel border border-edge rounded-lg px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
              />
            </div>
          )}

          <button
            onClick={load}
            disabled={loading}
            title={t.common.refreshTitle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-panel border border-edge rounded-lg text-ink-secondary hover:text-ink hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={cn("size-4", loading && "motion-safe:animate-spin")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            {t.common.refresh}
          </button>
        </div>
      </div>

      {summary && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-panel rounded-xl p-4 border border-edge">
            <p className="text-ink-secondary text-xs font-medium">{t.daily.periodCost}</p>
            <p className="text-xl font-bold text-highlight mt-1 tabular-nums">
              ${summary.totalCost.toFixed(2)}
            </p>
            {avgDailyCost !== null && (
              <p className="text-ink-muted text-xs mt-0.5">
                {t.daily.periodDailyAvg} ${avgDailyCost.toFixed(2)}
              </p>
            )}
          </div>
          <div className="bg-panel rounded-xl p-4 border border-edge">
            <p className="text-ink-secondary text-xs font-medium">{t.daily.periodSessions}</p>
            <p className="text-xl font-bold text-accent mt-1 tabular-nums">
              {uniqueSessions.toLocaleString()}
            </p>
          </div>
          <div className="bg-panel rounded-xl p-4 border border-edge">
            <p className="text-ink-secondary text-xs font-medium">{t.daily.periodTokens}</p>
            <p className="text-xl font-bold text-accent mt-1 tabular-nums">
              {(summary.totalTokens / 1_000_000).toFixed(2)}M
            </p>
          </div>
        </div>
      )}

      {loading && <LoadingSkeleton />}
      {error && <ErrorState message={error} onRetry={load} />}

      {chartData && !loading && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-panel rounded-xl p-6 border border-edge">
            <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
              {mode === "daily" ? t.daily.tokenChartDaily : t.daily.tokenChartWeekly}
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis dataKey="date" tick={chart.axisTick} />
                <YAxis
                  tick={chart.axisTick}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={chart.tooltipStyle}
                  labelStyle={chart.labelStyle}
                  formatter={(value: number) => value.toLocaleString()}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: chart.legendText, fontSize: "12px" }}>{value}</span>
                  )}
                />
                <Bar dataKey="inputTokens" name={t.daily.input} stackId="a" fill={chart.series[0]} />
                <Bar dataKey="outputTokens" name={t.daily.output} stackId="a" fill={chart.series[1]} />
                <Bar dataKey="cacheReadTokens" name={t.daily.cacheRead} stackId="a" fill={chart.series[2]} />
                <Bar dataKey="cacheCreationTokens" name={t.daily.cacheCreation} stackId="a" fill={chart.series[3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-panel rounded-xl p-6 border border-edge">
            <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
              {mode === "daily" ? t.daily.costChartDaily : t.daily.costChartWeekly}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis dataKey="date" tick={chart.axisTick} />
                <YAxis
                  tick={chart.axisTick}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={chart.tooltipStyle}
                  labelStyle={chart.labelStyle}
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Line
                  type="monotone"
                  dataKey="estimatedCost"
                  name={t.daily.cost}
                  stroke={chart.highlight}
                  strokeWidth={2}
                  dot={{ fill: chart.highlight, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-panel rounded-xl p-6 border border-edge">
            <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
              {mode === "daily" ? t.daily.sessionChartDaily : t.daily.sessionChartWeekly}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis dataKey="date" tick={chart.axisTick} />
                <YAxis tick={chart.axisTick} />
                <Tooltip
                  contentStyle={chart.tooltipStyle}
                  labelStyle={chart.labelStyle}
                />
                <Bar
                  dataKey="sessionCount"
                  name={t.daily.sessionLabel}
                  fill={chart.series[0]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 motion-safe:animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-panel rounded-xl p-4 border border-edge">
            <div className="h-3 bg-panel-alt rounded w-20 mb-2" />
            <div className="h-6 bg-panel-alt rounded w-24" />
          </div>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-panel rounded-xl p-6 border border-edge">
          <div className="h-4 bg-panel-alt rounded w-40 mb-4" />
          <div className="h-72 bg-panel-alt rounded" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLang();
  return (
    <div className="flex items-center justify-center h-64">
      <div className="bg-panel rounded-xl p-8 border border-highlight text-center max-w-md">
        <p className="text-highlight font-medium mb-2">{t.common.loadError}</p>
        <p className="text-ink-secondary text-sm mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium bg-panel-hover border border-edge rounded-lg text-ink-secondary hover:text-ink hover:border-accent transition-colors"
        >
          {t.common.retry}
        </button>
      </div>
    </div>
  );
}
