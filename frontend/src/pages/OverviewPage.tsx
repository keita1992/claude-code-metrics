import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchOverview, type OverviewData } from "../api/client";
import StatCard from "../components/StatCard";
import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LanguageContext";
import { cn } from "../lib/utils";

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { chart } = useTheme();
  const { t } = useLang();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchOverview()
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

  const dailyCostData = data.dailyCost.map((d) => ({
    date: d.date.slice(5),
    cost: d.cost,
  }));

  const modelBarData = data.modelCostDistribution;

  const savingsRate =
    data.kpi.estimatedCost + data.kpi.cacheSavings > 0
      ? ((data.kpi.cacheSavings / (data.kpi.estimatedCost + data.kpi.cacheSavings)) * 100).toFixed(1)
      : "0.0";

  const activeDays = data.dailyCost.filter((d) => d.cost > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink text-balance">{t.overview.title}</h2>
          <p className="text-xs text-ink-muted mt-0.5">{t.overview.subtitle}</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t.overview.totalCost}
          value={formatCost(data.kpi.estimatedCost)}
          subtitle={`${t.overview.dailyAvg} ${formatCost(data.kpi.dailyAvgCost)}`}
          color="highlight"
        />
        <StatCard
          title={t.overview.cacheHitRate}
          value={`${data.kpi.cacheHitRate}%`}
          color="accent"
        />
        <StatCard
          title={t.overview.costPerSession}
          value={formatCost(data.kpi.avgCostPerSession)}
          subtitle={`${formatNumber(data.kpi.totalSessions)} ${t.overview.sessions}`}
          color="highlight"
        />
        <StatCard
          title={t.overview.cacheSavings}
          value={formatCost(data.kpi.cacheSavings)}
          subtitle={`${t.overview.savingsRate} ${savingsRate}%`}
          color="accent"
        />
      </div>

      <details className="group">
        <summary className="text-xs text-ink-muted cursor-pointer hover:text-ink-secondary transition-colors list-none flex items-center gap-1">
          <svg className="size-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          {t.overview.dataSource}
        </summary>
        <div className="mt-2 pl-4 space-y-1">
          <p className="text-xs text-ink-muted">{t.overview.notePrice}</p>
          <p className="text-xs text-ink-muted">
            {t.overview.noteTzTemplate
              .replace("{tz}", data.coverage.timezone)
              .replace("{date}", data.coverage.statsLastComputedDate || t.overview.statsLastDateUnknown)
              .replace("{mode}", data.coverage.liveDataMode)}
          </p>
          <p className="text-xs text-ink-muted">
            {t.overview.noteTotalsTemplate.replace(
              "{sessions}",
              data.coverage.totalSessionsIncludesLive
                ? t.overview.statsPlusLive
                : t.overview.statsPreferred,
            )}
          </p>
          {data.kpi.unknownModelCount > 0 && (
            <p className="text-xs text-highlight">
              {t.overview.noteUnknownTemplate
                .replace("{count}", String(data.kpi.unknownModelCount))
                .replace("{tokens}", formatNumber(data.kpi.unknownModelTokens))}
            </p>
          )}
        </div>
      </details>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-panel rounded-xl p-6 border border-edge">
          <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
            {t.overview.dailyCostChart}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyCostData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis dataKey="date" tick={chart.axisTick} />
              <YAxis tick={chart.axisTick} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={chart.tooltipStyle}
                labelStyle={chart.labelStyle}
                formatter={(value: number) => formatCost(value)}
              />
              <Area
                type="monotone"
                dataKey="cost"
                name={t.overview.costLabel}
                stroke={chart.accent}
                fill={chart.accent}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-panel rounded-xl p-6 border border-edge">
          <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
            {t.overview.modelCostChart}
          </h3>
          {modelBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={modelBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis type="number" tick={chart.axisTick} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="model" tick={chart.axisTick} width={120} />
                <Tooltip
                  contentStyle={chart.tooltipStyle}
                  formatter={(value: number) => formatCost(value)}
                />
                <Bar dataKey="cost" name={t.overview.costLabel} radius={[0, 4, 4, 0]} fill={chart.accent} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-ink-muted text-sm">
              {t.overview.noCostData}
            </div>
          )}
        </div>

        <div className="bg-panel rounded-xl p-6 border border-edge lg:col-span-2">
          <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
            {t.overview.quickFacts}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-ink-muted text-xs font-medium">{t.overview.sessionCount}</p>
              <p className="text-2xl font-bold text-ink mt-1 tabular-nums">
                {formatNumber(data.kpi.totalSessions)}
              </p>
            </div>
            <div>
              <p className="text-ink-muted text-xs font-medium">{t.overview.activeDays}</p>
              <p className="text-2xl font-bold text-ink mt-1 tabular-nums">{activeDays}</p>
            </div>
            <div>
              <p className="text-ink-muted text-xs font-medium">{t.overview.topModel}</p>
              {data.topModel ? (
                <>
                  <p className="text-2xl font-bold text-ink mt-1">{data.topModel.name}</p>
                  <p className="text-ink-muted text-xs mt-0.5">
                    {formatCost(data.topModel.cost)} ({data.topModel.percentage}%)
                  </p>
                </>
              ) : (
                <p className="text-ink-muted text-sm mt-1">—</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 motion-safe:animate-pulse">
      <div className="h-8 bg-panel-alt rounded w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-panel rounded-xl p-6 border border-edge">
            <div className="h-4 bg-panel-alt rounded w-24 mb-3" />
            <div className="h-8 bg-panel-alt rounded w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-panel rounded-xl p-6 border border-edge">
            <div className="h-4 bg-panel-alt rounded w-40 mb-4" />
            <div className="h-64 bg-panel-alt rounded" />
          </div>
        ))}
        <div className="bg-panel rounded-xl p-6 border border-edge lg:col-span-2">
          <div className="h-4 bg-panel-alt rounded w-40 mb-4" />
          <div className="h-32 bg-panel-alt rounded" />
        </div>
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
