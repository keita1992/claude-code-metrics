import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { fetchModels, type ModelsData } from "../api/client";
import { cn } from "../lib/utils";

const CHART_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#a78bfa", "#34d399", "#fbbf24"];

function formatCost(n: number | null): string {
  if (n === null) return "N/A";
  return `$${n.toFixed(2)}`;
}

export default function ModelAnalysisPage() {
  const [data, setData] = useState<ModelsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchModels()
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

  const unknownModels = data.models.filter((m) => !m.isPriceKnown);
  const tokenData = data.models.map((m) => ({
    model: m.model,
    input: m.inputTokens,
    output: m.outputTokens,
    cacheRead: m.cacheReadTokens,
    cacheCreation: m.cacheCreationTokens,
  }));

  const cacheRateData = data.models.map((m) => ({
    model: m.model,
    rate: m.cacheHitRate * 100,
  }));

  const allModels = Array.from(
    new Set(data.dailyModelTrend.flatMap((d) => Object.keys(d.models))),
  );

  const trendData = data.dailyModelTrend.map((d) => ({
    date: d.date.slice(5),
    ...d.models,
  }));

  // コスト合計
  const knownModels = data.models.filter((m) => m.isPriceKnown);
  const totalActualCost = knownModels.reduce((s, m) => s + (m.totalCost ?? 0), 0);
  const totalWithoutCache = knownModels.reduce((s, m) => s + (m.withoutCacheCost ?? 0), 0);
  const totalCacheSavings = knownModels.reduce((s, m) => s + (m.cacheSavings ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-balance">Model Analysis</h2>
          <p className="text-xs text-gray-500 mt-0.5">集計TZ: {data.coverage.timezone}</p>
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

      {unknownModels.length > 0 && (
        <p className="text-xs text-rose-400">
          * 価格未定義モデル: {unknownModels.map((m) => m.model).join(", ")} (コストはN/A表示)
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Usage by Model */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            Token Usage by Model
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tokenData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="model"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => value.toLocaleString()}
              />
              <Legend />
              <Bar dataKey="input" name="Input" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="output" name="Output" stackId="a" fill="#10b981" />
              <Bar dataKey="cacheRead" name="Cache Read" stackId="a" fill="#f59e0b" />
              <Bar dataKey="cacheCreation" name="Cache Create" stackId="a" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cache Hit Rate */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            Cache Hit Rate by Model
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cacheRateData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="model"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
              <Bar dataKey="rate" name="Hit Rate" radius={[0, 4, 4, 0]}>
                {cacheRateData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Comparison Table */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-400 mb-2 text-balance">
            Model Cost Comparison
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            * API公開価格に基づく参考値。Maxプラン等の実際の請求額とは異なります。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Model</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">実コスト</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    <span title="キャッシュなしの場合の仮想コスト">キャッシュなし</span>
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">キャッシュ節約</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Hit Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.models.map((m) => (
                  <tr
                    key={m.modelId}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td className="py-3 px-4 text-gray-200 font-medium">
                      {m.model}
                      {!m.isPriceKnown && (
                        <span className="ml-2 text-xs text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded">
                          価格未定義
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-400 tabular-nums">
                      {formatCost(m.totalCost)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 tabular-nums">
                      {formatCost(m.withoutCacheCost)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 tabular-nums">
                      {formatCost(m.cacheSavings)}
                    </td>
                    <td className="py-3 px-4 text-right text-violet-400 tabular-nums">
                      {(m.cacheHitRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              {knownModels.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-700 bg-gray-800/30">
                    <td className="py-3 px-4 text-gray-300 font-semibold">合計</td>
                    <td className="py-3 px-4 text-right text-rose-400 font-semibold tabular-nums">
                      ${totalActualCost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400 font-semibold tabular-nums">
                      ${totalWithoutCache.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-semibold tabular-nums">
                      ${totalCacheSavings.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Daily Model Trend */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            Daily Model Usage Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#e5e7eb" }}
                formatter={(value: number) => value.toLocaleString()}
              />
              <Legend />
              {allModels.map((model, i) => (
                <Area
                  key={model}
                  type="monotone"
                  dataKey={model}
                  stackId="1"
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 motion-safe:animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`bg-gray-900 rounded-xl p-6 border border-gray-800 ${i >= 2 ? "lg:col-span-2" : ""}`}
          >
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
