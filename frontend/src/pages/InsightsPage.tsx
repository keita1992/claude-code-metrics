import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fetchInsights, type InsightsData } from "../api/client";
import StatCard from "../components/StatCard";
import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LanguageContext";
import { cn } from "../lib/utils";

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { chart } = useTheme();
  const { t } = useLang();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchInsights()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const peakData = data.peakHours.map((h) => ({
    ...h,
    label: `${h.hour}:00`,
  }));

  const weeklyData = data.weeklyTrend.map((w) => ({
    ...w,
    weekLabel: w.week.slice(5),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink text-balance">{t.insights.title}</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {t.common.aggregationTz}: {data.timezone} / {t.insights.subtitleLive}
          </p>
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title={t.insights.overallCacheRate}
          value={`${(data.cacheEfficiency.overallRate * 100).toFixed(1)}%`}
          color="accent"
        />
        <StatCard
          title={t.insights.totalCacheSavings}
          value={formatCost(data.cacheEfficiency.totalSavings)}
          color="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-panel rounded-xl p-6 border border-edge">
          <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
            {t.insights.cacheByModel}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left py-3 px-4 text-ink-secondary font-medium">{t.insights.colModel}</th>
                  <th className="text-right py-3 px-4 text-ink-secondary font-medium">{t.insights.colHitRate}</th>
                  <th className="text-right py-3 px-4 text-ink-secondary font-medium">{t.insights.colSavings}</th>
                </tr>
              </thead>
              <tbody>
                {data.cacheEfficiency.byModel.map((m) => (
                  <tr key={m.model} className="border-b border-edge-subtle hover:bg-panel-hover">
                    <td className="py-3 px-4 text-ink font-medium">{m.model}</td>
                    <td className="py-3 px-4 text-right text-accent tabular-nums">
                      {(m.rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-accent tabular-nums">
                      {formatCost(m.savings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-panel rounded-xl p-6 border border-edge">
          <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
            {t.insights.optimizationSuggestions}
          </h3>
          {data.downgradeSuggestions.length > 0 ? (
            <div className="space-y-3">
              {data.downgradeSuggestions.map((s, i) => (
                <div key={i} className="bg-panel-hover rounded-lg p-4 border border-edge">
                  <p className="text-ink text-sm">{s.description}</p>
                  <p className="text-accent text-sm font-medium mt-2">
                    {t.insights.potentialSavings}{formatCost(s.potentialSavings)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="size-10 rounded-full bg-accent-subtle flex items-center justify-center mb-3">
                <svg className="size-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <p className="text-ink-secondary text-sm font-medium">{t.insights.optimized}</p>
              <p className="text-ink-muted text-xs mt-1">{t.insights.optimizedDesc}</p>
            </div>
          )}
        </div>

        <div className="bg-panel rounded-xl p-6 border border-edge">
          <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
            {t.insights.peakHours} ({data.timezone})
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={peakData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis dataKey="label" tick={chart.axisTick} />
              <YAxis tick={chart.axisTick} />
              <Tooltip
                contentStyle={chart.tooltipStyle}
                labelStyle={chart.labelStyle}
              />
              <Bar dataKey="count" fill={chart.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-panel rounded-xl p-6 border border-edge">
          <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
            {t.insights.weeklyTrend}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis dataKey="weekLabel" tick={chart.axisTick} />
              <YAxis
                tick={chart.axisTick}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={chart.tooltipStyle}
                labelStyle={chart.labelStyle}
                formatter={(value: number) => formatCost(value)}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke={chart.highlight}
                fill={chart.highlight}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-panel rounded-xl p-6 border border-edge lg:col-span-2">
          <h3 className="text-sm font-medium text-ink-secondary mb-1 text-balance">
            {t.insights.projectConcentration}
          </h3>
          <p className="text-xs text-ink-muted mb-4">
            {t.insights.totalProjectsTemplate.replace("{n}", String(data.projectConcentration.totalProjects))}
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.projectConcentration.topProjects}
                dataKey="percentage"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={85}
              >
                {data.projectConcentration.topProjects.map((_, i) => (
                  <Cell key={i} fill={chart.series[i % chart.series.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chart.tooltipStyle}
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: chart.legendText, fontSize: "12px" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 motion-safe:animate-pulse">
      <div className="h-8 bg-panel-alt rounded w-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-panel rounded-xl p-6 border border-edge">
            <div className="h-4 bg-panel-alt rounded w-24 mb-3" />
            <div className="h-8 bg-panel-alt rounded w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`bg-panel rounded-xl p-6 border border-edge ${i === 4 ? "lg:col-span-2" : ""}`}
          >
            <div className="h-4 bg-panel-alt rounded w-40 mb-4" />
            <div className="h-56 bg-panel-alt rounded" />
          </div>
        ))}
      </div>
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
