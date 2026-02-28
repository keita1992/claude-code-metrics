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

  // キャッシュ節約率
  const savingsRate =
    data.kpi.estimatedCost + data.kpi.cacheSavings > 0
      ? ((data.kpi.cacheSavings / (data.kpi.estimatedCost + data.kpi.cacheSavings)) * 100).toFixed(1)
      : "0.0";

  // アクティブ日数
  const activeDays = data.dailyCost.filter((d) => d.cost > 0).length;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-balance">Overview</h2>
          <p className="text-xs text-gray-500 mt-0.5">今月の集計</p>
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

      {/* KPI カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="推定コスト合計"
          value={formatCost(data.kpi.estimatedCost)}
          subtitle={`日平均 ${formatCost(data.kpi.dailyAvgCost)}`}
        />
        <StatCard
          title="キャッシュヒット率"
          value={`${data.kpi.cacheHitRate}%`}
        />
        <StatCard
          title="セッション単価"
          value={formatCost(data.kpi.avgCostPerSession)}
          subtitle={`${formatNumber(data.kpi.totalSessions)} セッション`}
        />
        <StatCard
          title="キャッシュ節約額"
          value={formatCost(data.kpi.cacheSavings)}
          subtitle={`節約率 ${savingsRate}%`}
        />
      </div>

      {/* メタ情報（折りたたみ可能） */}
      <details className="group">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors list-none flex items-center gap-1">
          <svg className="size-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          データソース詳細
        </summary>
        <div className="mt-2 pl-4 space-y-1">
          <p className="text-xs text-gray-500">
            * コスト表示はAPI公開価格に基づく参考値です。Maxプラン等のサブスクリプション利用時の実際の請求額とは異なります。
          </p>
          <p className="text-xs text-gray-500">
            * 集計TZ: {data.coverage.timezone} / stats-cache最終日: {data.coverage.statsLastComputedDate || "不明"} / live読み込み: {data.coverage.liveDataMode}
          </p>
          <p className="text-xs text-gray-500">
            * totals反映: sessions={data.coverage.totalSessionsIncludesLive ? "stats+live" : "stats優先"} / messages={data.coverage.totalMessagesIncludesLive ? "stats+live" : "stats優先"}
          </p>
          {data.kpi.unknownModelCount > 0 && (
            <p className="text-xs text-rose-400">
              * 価格未定義モデル {data.kpi.unknownModelCount} 件 ({formatNumber(data.kpi.unknownModelTokens)} tokens) はコスト推定に含まれていません。
            </p>
          )}
        </div>
      </details>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 日次コスト推移 */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            日次コスト推移
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyCostData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
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
                name="コスト"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* モデル別コスト (横棒グラフ) */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            モデル別コスト
          </h3>
          {modelBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={modelBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  tickFormatter={(v) => `$${v}`}
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
                  formatter={(value: number) => formatCost(value)}
                />
                <Bar dataKey="cost" name="コスト" radius={[0, 4, 4, 0]} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
              コストデータがありません
            </div>
          )}
        </div>

        {/* サマリー情報パネル */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-balance">
            クイックファクト
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-gray-500 text-xs font-medium">セッション数</p>
              <p className="text-2xl font-bold text-gray-200 mt-1 tabular-nums">
                {formatNumber(data.kpi.totalSessions)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium">メッセージ数</p>
              <p className="text-2xl font-bold text-gray-200 mt-1 tabular-nums">
                {formatNumber(data.kpi.totalMessages)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium">アクティブ日数</p>
              <p className="text-2xl font-bold text-gray-200 mt-1 tabular-nums">
                {activeDays}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium">最コストモデル</p>
              {data.topModel ? (
                <>
                  <p className="text-2xl font-bold text-gray-200 mt-1">{data.topModel.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {formatCost(data.topModel.cost)} ({data.topModel.percentage}%)
                  </p>
                </>
              ) : (
                <p className="text-gray-500 text-sm mt-1">—</p>
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
      <div className="h-8 bg-gray-800 rounded w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="h-4 bg-gray-800 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-800 rounded w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="h-4 bg-gray-800 rounded w-40 mb-4" />
            <div className="h-64 bg-gray-800 rounded" />
          </div>
        ))}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 lg:col-span-2">
          <div className="h-4 bg-gray-800 rounded w-40 mb-4" />
          <div className="h-32 bg-gray-800 rounded" />
        </div>
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
