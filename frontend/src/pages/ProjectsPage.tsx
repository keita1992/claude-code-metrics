import { useEffect, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fetchProjects, type ProjectsData } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LanguageContext";
import { useTimezone } from "../context/TimezoneContext";
import { cn } from "../lib/utils";

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function ProjectsPage() {
  const [data, setData] = useState<ProjectsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { chart } = useTheme();
  const { t } = useLang();
  const { tz } = useTimezone();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchProjects(tz)
      .then((d) => {
        setData(d);
        if (d.projects.length > 0) {
          setSelectedProject((prev) => prev ?? d.projects[0].dirName);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tz]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const sorted = [...data.projects].sort(
    (a, b) => b.estimatedCost - a.estimatedCost,
  );

  const pieData = sorted.slice(0, 8).map((p) => ({
    name: p.name,
    cost: p.estimatedCost,
  }));

  const selected = data.projects.find((p) => p.dirName === selectedProject);
  const toolData = selected?.topTools.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink text-balance">{t.projects.title}</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {t.projects.subtitle} ({data.coverage.timezone})
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-panel rounded-xl p-6 border border-edge lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-ink-secondary text-balance">
              {t.projects.ranking}
            </h3>
            <p className="text-xs text-ink-muted flex items-center gap-1">
              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
              </svg>
              {t.projects.clickHint}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left py-3 px-4 text-ink-secondary font-medium">{t.projects.colRank}</th>
                  <th className="text-left py-3 px-4 text-ink-secondary font-medium">{t.projects.colProject}</th>
                  <th className="text-right py-3 px-4 text-ink-secondary font-medium">{t.projects.colSessions}</th>
                  <th className="text-right py-3 px-4 text-ink-secondary font-medium">{t.projects.colTokens}</th>
                  <th className="text-right py-3 px-4 text-ink-secondary font-medium">
                    <span title={t.projects.colUnknownTokensTitle}>{t.projects.colUnknownTokens} ⓘ</span>
                  </th>
                  <th className="text-right py-3 px-4 text-ink-secondary font-medium">{t.projects.colCost}</th>
                  <th className="text-center py-3 px-4 text-ink-secondary font-medium w-8"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr
                    key={p.dirName}
                    onClick={() => setSelectedProject(p.dirName)}
                    className={cn(
                      "border-b border-edge-subtle cursor-pointer transition-colors group",
                      selectedProject === p.dirName
                        ? "bg-accent-subtle border-l-2 border-l-accent"
                        : "hover:bg-panel-hover",
                    )}
                  >
                    <td className="py-3 px-4 text-ink-muted">{i + 1}</td>
                    <td className="py-3 px-4 text-ink font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-right text-ink-secondary tabular-nums">{p.sessionCount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-ink-secondary tabular-nums">{p.totalTokens.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-highlight tabular-nums">
                      {p.unknownModelTokens > 0 ? p.unknownModelTokens.toLocaleString() : <span className="text-ink-muted">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-highlight font-medium tabular-nums">{formatCost(p.estimatedCost)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        "text-xs transition-colors",
                        selectedProject === p.dirName ? "text-accent" : "text-ink-muted group-hover:text-ink-secondary",
                      )}>
                        {selectedProject === p.dirName ? "▶" : "›"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-panel rounded-xl p-6 border border-edge">
          <h3 className="text-sm font-medium text-ink-secondary mb-4 text-balance">
            {t.projects.costDistribution}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="cost"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={85}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={chart.series[i % chart.series.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chart.tooltipStyle}
                formatter={(value: number) => formatCost(value)}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: chart.legendText, fontSize: "12px" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-panel rounded-xl p-6 border border-edge">
          <h3 className="text-sm font-medium text-ink-secondary mb-1 text-balance">
            {t.projects.toolRanking}
          </h3>
          <p className="text-xs text-ink-muted mb-4">
            {selected ? (
              <span>
                <span className="text-accent">{selected.name}</span>
                {t.projects.toolRankingOf}
              </span>
            ) : (
              t.projects.selectProject
            )}
          </p>
          {toolData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={toolData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis dataKey="name" tick={chart.axisTick} />
                <YAxis tick={chart.axisTick} />
                <Tooltip
                  contentStyle={chart.tooltipStyle}
                  labelStyle={chart.labelStyle}
                />
                <Bar dataKey="count" fill={chart.accent} radius={[4, 4, 0, 0]}>
                  {toolData.map((_, i) => (
                    <Cell key={i} fill={chart.series[i % chart.series.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-ink-muted text-sm">
              {t.projects.noToolData}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 motion-safe:animate-pulse">
      <div className="h-8 bg-panel-alt rounded w-36" />
      <div className="bg-panel rounded-xl p-6 border border-edge">
        <div className="h-4 bg-panel-alt rounded w-48 mb-4" />
        <div className="h-48 bg-panel-alt rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-panel rounded-xl p-6 border border-edge">
            <div className="h-4 bg-panel-alt rounded w-40 mb-4" />
            <div className="h-64 bg-panel-alt rounded" />
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
