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
import { cn } from "../lib/utils";

const CHART_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#a78bfa", "#34d399", "#fbbf24"];

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          <h2 className="text-2xl font-bold text-balance">Insights</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            集計TZ: {data.timezone} / プロジェクト集中度は live データ基準
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="データを再読み込み"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200 hover:border-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          更新
        </button>
      </div>

      {/* Cache Efficiency KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Overall Cache Hit Rate"
          value={`${(data.cacheEfficiency.overallRate * 100).toFixed(1)}%`}
          color="emerald"
        />
        <StatCard
          title="Total Cache Savings"
          value={formatCost(data.cacheEfficiency.totalSavings)}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cache Efficiency by Model */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            Cache Efficiency by Model
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Model</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Hit Rate</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Savings</th>
                </tr>
              </thead>
              <tbody>
                {data.cacheEfficiency.byModel.map((m) => (
                  <tr key={m.model} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-3 px-4 text-gray-200 font-medium">{m.model}</td>
                    <td className="py-3 px-4 text-right text-violet-400 tabular-nums">
                      {(m.rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 tabular-nums">
                      {formatCost(m.savings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Downgrade Suggestions */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            Optimization Suggestions
          </h3>
          {data.downgradeSuggestions.length > 0 ? (
            <div className="space-y-3">
              {data.downgradeSuggestions.map((s, i) => (
                <div
                  key={i}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                >
                  <p className="text-gray-200 text-sm">{s.description}</p>
                  <p className="text-emerald-400 text-sm font-medium mt-2">
                    節約見込み: {formatCost(s.potentialSavings)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <svg className="size-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm font-medium">最適化済み</p>
              <p className="text-gray-500 text-xs mt-1">現在の利用パターンに改善提案はありません</p>
            </div>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            Peak Usage Hours ({data.timezone})
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={peakData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Cost Trend */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            Weekly Cost Trend
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="weekLabel" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#e5e7eb" }}
                formatter={(value: number) => formatCost(value)}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#f43f5e"
                fill="#f43f5e"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Project Concentration */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-400 mb-1 text-balance">
            Project Concentration
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            合計 {data.projectConcentration.totalProjects} プロジェクト
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
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#d1d5db", fontSize: "12px" }}>{value}</span>
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
      <div className="h-8 bg-gray-800 rounded w-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="h-4 bg-gray-800 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-800 rounded w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`bg-gray-900 rounded-xl p-6 border border-gray-800 ${i === 4 ? "lg:col-span-2" : ""}`}
          >
            <div className="h-4 bg-gray-800 rounded w-40 mb-4" />
            <div className="h-56 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="bg-gray-900 rounded-xl p-8 border border-rose-500/30 text-center max-w-md">
        <p className="text-rose-400 font-medium mb-2">Failed to load data</p>
        <p className="text-gray-400 text-sm mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-gray-100 hover:border-violet-500 transition-colors"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
