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
import { cn } from "../lib/utils";

const CHART_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#a78bfa", "#34d399", "#fbbf24"];

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function ProjectsPage() {
  const [data, setData] = useState<ProjectsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchProjects()
      .then((d) => {
        setData(d);
        if (d.projects.length > 0) {
          setSelectedProject((prev) => prev ?? d.projects[0].dirName);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
          <h2 className="text-2xl font-bold text-balance">Projects</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            プロジェクト別集計は live データのみ ({data.coverage.timezone})
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Table */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400 text-balance">
              Project Rankings (by Cost)
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
              </svg>
              行をクリックするとツール詳細が表示されます
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">#</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Project</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Sessions</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Total Tokens</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    <span title="価格未定義モデルのトークン数">未定義モデルTokens ⓘ</span>
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Cost</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium w-8"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr
                    key={p.dirName}
                    onClick={() => setSelectedProject(p.dirName)}
                    className={cn(
                      "border-b border-gray-800/50 cursor-pointer transition-colors group",
                      selectedProject === p.dirName
                        ? "bg-violet-500/10 border-l-2 border-l-violet-500"
                        : "hover:bg-gray-800/40",
                    )}
                  >
                    <td className="py-3 px-4 text-gray-500">{i + 1}</td>
                    <td className="py-3 px-4 text-gray-200 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-right text-gray-300 tabular-nums">{p.sessionCount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-300 tabular-nums">{p.totalTokens.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-rose-400 tabular-nums">
                      {p.unknownModelTokens > 0 ? p.unknownModelTokens.toLocaleString() : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-400 font-medium tabular-nums">{formatCost(p.estimatedCost)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        "text-xs transition-colors",
                        selectedProject === p.dirName ? "text-violet-400" : "text-gray-700 group-hover:text-gray-400",
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

        {/* Cost Distribution Pie */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            Cost Distribution
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
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatCost(value)}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#d1d5db", fontSize: "12px" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Tools for Selected Project */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-1 text-balance">
            Top Tools
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            {selected ? (
              <span>
                <span className="text-violet-400">{selected.name}</span> のツール使用回数
              </span>
            ) : (
              "プロジェクトを選択してください"
            )}
          </p>
          {toolData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={toolData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {toolData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
              ツールデータがありません
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
      <div className="h-8 bg-gray-800 rounded w-36" />
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="h-4 bg-gray-800 rounded w-48 mb-4" />
        <div className="h-48 bg-gray-800 rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="h-4 bg-gray-800 rounded w-40 mb-4" />
            <div className="h-64 bg-gray-800 rounded" />
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
