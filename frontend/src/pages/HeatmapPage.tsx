import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { fetchHeatmap, type HeatmapData, type HeatmapCell } from "../api/client";
import StatCard from "../components/StatCard";
import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LanguageContext";
import { useTimezone } from "../context/TimezoneContext";
import { cn } from "../lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

type Metric = "cost" | "tokens";
type Preset = "all" | "6months" | "lastMonth" | "thisMonth";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getPresetDates(preset: Preset): { start: string; end: string } | null {
  if (preset === "all") return null;
  const today = new Date();
  if (preset === "6months") {
    const start = new Date(today);
    start.setMonth(start.getMonth() - 6);
    return { start: toDateStr(start), end: toDateStr(today) };
  }
  if (preset === "lastMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: toDateStr(start), end: toDateStr(end) };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: toDateStr(start), end: toDateStr(today) };
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatCostShort(n: number): string {
  if (n >= 100) return `$${Math.round(n)}`;
  if (n >= 10) return `$${n.toFixed(1)}`;
  return `$${n.toFixed(2)}`;
}

function formatTokensShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function HeatmapPage() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [metric, setMetric] = useState<Metric>("cost");
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const { theme } = useTheme();
  const { t } = useLang();
  const { tz } = useTimezone();

  const PRESETS: { key: Preset; label: string }[] = [
    { key: "all", label: t.heatmap.presetAll },
    { key: "6months", label: t.heatmap.preset6months },
    { key: "lastMonth", label: t.heatmap.presetLastMonth },
    { key: "thisMonth", label: t.heatmap.presetThisMonth },
  ];

  const WEEKDAY_LABELS = t.heatmap.weekdayLabels;

  const [preset, setPreset] = useState<Preset>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handlePresetClick = useCallback((p: Preset) => {
    setPreset(p);
    const dates = getPresetDates(p);
    setStartDate(dates?.start ?? "");
    setEndDate(dates?.end ?? "");
  }, []);

  const handleStartChange = useCallback((v: string) => {
    setStartDate(v);
    setPreset("all");
    if (v) setPreset("all");
  }, []);
  const handleEndChange = useCallback((v: string) => {
    setEndDate(v);
    setPreset("all");
  }, []);

  const isInitial = useRef(true);
  const hasData = useRef(false);
  const load = useCallback(() => {
    if (hasData.current) {
      setRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);
    fetchHeatmap(startDate || undefined, endDate || undefined, tz)
      .then((d) => {
        setData(d);
        hasData.current = true;
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false);
        setRefetching(false);
      });
  }, [startDate, endDate, tz]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    for (const p of PRESETS) {
      const dates = getPresetDates(p.key);
      if (dates === null && startDate === "" && endDate === "") {
        setPreset("all");
        return;
      }
      if (dates && dates.start === startDate && dates.end === endDate) {
        setPreset(p.key);
        return;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const cellMap = useMemo(() => {
    if (!data) return new Map<string, HeatmapCell>();
    const map = new Map<string, HeatmapCell>();
    for (const cell of data.cells) {
      map.set(`${cell.weekday}:${cell.hour}`, cell);
    }
    return map;
  }, [data]);

  const maxValue = useMemo(() => {
    if (!data || data.cells.length === 0) return 1;
    return Math.max(
      ...data.cells.map((c) => (metric === "cost" ? c.cost : c.tokens)),
      0.001,
    );
  }, [data, metric]);

  const summary = useMemo(() => {
    if (!data || data.cells.length === 0) return null;

    const byWeekday = new Map<number, number>();
    for (const c of data.cells) {
      byWeekday.set(c.weekday, (byWeekday.get(c.weekday) ?? 0) + c.cost);
    }
    let peakWeekday = 1;
    let peakWeekdayCost = 0;
    for (const [wd, cost] of byWeekday) {
      if (cost > peakWeekdayCost) {
        peakWeekday = wd;
        peakWeekdayCost = cost;
      }
    }

    const byHour = new Map<number, number>();
    for (const c of data.cells) {
      byHour.set(c.hour, (byHour.get(c.hour) ?? 0) + c.cost);
    }
    let peakHour = 0;
    let peakHourCost = 0;
    for (const [h, cost] of byHour) {
      if (cost > peakHourCost) {
        peakHour = h;
        peakHourCost = cost;
      }
    }

    const peakCell = data.cells.reduce((a, b) => (a.cost > b.cost ? a : b));

    return { peakWeekday, peakHour, peakCell };
  }, [data]);

  const getCellTextColor = useCallback(
    (value: number): string => {
      const ratio = Math.pow(value / maxValue, 0.5);
      if (theme === "dark") {
        return ratio > 0.4 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)";
      } else {
        return ratio > 0.3 ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.6)";
      }
    },
    [theme, maxValue],
  );

  const getCellColor = useCallback(
    (value: number): string => {
      if (value === 0) {
        return theme === "dark"
          ? "rgba(58, 54, 62, 0.5)"
          : "rgba(224, 214, 207, 0.5)";
      }
      const ratio = Math.pow(value / maxValue, 0.5);
      if (theme === "dark") {
        const r = Math.round(58 + (91 - 58) * ratio);
        const g = Math.round(54 + (132 - 54) * ratio);
        const b = Math.round(62 + (173 - 62) * ratio);
        const a = 0.4 + 0.6 * ratio;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      } else {
        const r = Math.round(224 + (45 - 224) * ratio);
        const g = Math.round(214 + (66 - 214) * ratio);
        const b = Math.round(207 + (98 - 207) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
      }
    },
    [theme, maxValue],
  );

  if (loading && !data) return <LoadingSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink text-balance">{t.heatmap.title}</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {t.common.aggregationTz}: {data.timezone} / {t.heatmap.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-panel border border-edge rounded-lg p-0.5">
            <button
              onClick={() => setMetric("cost")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                metric === "cost"
                  ? "bg-accent-subtle text-accent"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              {t.heatmap.metricCost}
            </button>
            <button
              onClick={() => setMetric("tokens")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                metric === "tokens"
                  ? "bg-accent-subtle text-accent"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              {t.heatmap.metricTokens}
            </button>
          </div>
          <button
            onClick={load}
            disabled={loading || refetching}
            title={t.common.refreshTitle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-panel border border-edge rounded-lg text-ink-secondary hover:text-ink hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={cn("size-4", (loading || refetching) && "motion-safe:animate-spin")}
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

      <div className="flex items-center flex-wrap gap-3">
        <div className="flex items-center bg-panel border border-edge rounded-lg p-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePresetClick(p.key)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                preset === p.key
                  ? "bg-accent-subtle text-accent"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartChange(e.target.value)}
            className="px-2 py-1.5 bg-panel border border-edge rounded-lg text-ink text-sm tabular-nums focus:outline-none focus:border-accent transition-colors"
          />
          <span className="text-ink-muted">{t.common.to}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndChange(e.target.value)}
            className="px-2 py-1.5 bg-panel border border-edge rounded-lg text-ink text-sm tabular-nums focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {summary && (
        <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-4 transition-opacity duration-200", refetching && "opacity-50")}>
          <StatCard
            title={t.heatmap.peakWeekday}
            value={WEEKDAY_LABELS[summary.peakWeekday - 1] + t.heatmap.weekdaySuffix}
            color="accent"
          />
          <StatCard
            title={t.heatmap.peakHour}
            value={`${summary.peakHour}:00${t.common.to}${summary.peakHour + 1}:00`}
            color="accent"
          />
          <StatCard
            title={t.heatmap.peakCell}
            value={formatCost(summary.peakCell.cost)}
            subtitle={`${WEEKDAY_LABELS[summary.peakCell.weekday - 1]}${t.heatmap.weekdaySuffix} ${summary.peakCell.hour}:00`}
            color="highlight"
          />
        </div>
      )}

      <div className={cn("bg-panel rounded-xl p-6 border border-edge transition-opacity duration-200", refetching && "opacity-50")}>
        <div className="overflow-x-auto">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `48px repeat(7, minmax(0, 1fr))`,
              gridTemplateRows: `28px repeat(24, minmax(28px, 1fr))`,
            }}
          >
            <div />
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={`wd-${i}`}
                className="flex items-center justify-center text-xs font-medium text-ink-secondary"
              >
                {label}
              </div>
            ))}

            {HOURS.map((h) => (
              <>
                <div
                  key={`h-${h}`}
                  className="flex items-center justify-center text-xs text-ink-muted tabular-nums"
                >
                  {h}:00
                </div>
                {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
                  const cell = cellMap.get(`${wd}:${h}`);
                  const value = cell
                    ? metric === "cost"
                      ? cell.cost
                      : cell.tokens
                    : 0;
                  const label =
                    value > 0
                      ? metric === "cost"
                        ? formatCostShort(cell!.cost)
                        : formatTokensShort(cell!.tokens)
                      : "";
                  return (
                    <div
                      key={`${wd}-${h}`}
                      className="rounded-sm cursor-pointer transition-all duration-150 hover:ring-2 hover:ring-accent hover:ring-offset-1 hover:ring-offset-panel flex items-center justify-center"
                      style={{
                        backgroundColor: getCellColor(value),
                        minHeight: "28px",
                        color: value > 0 ? getCellTextColor(value) : "transparent",
                        fontSize: "10px",
                        fontWeight: 600,
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                      onMouseEnter={(e) => {
                        setHoveredCell(cell ?? null);
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {label}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 px-12">
          <span className="text-xs text-ink-muted">{t.heatmap.low}</span>
          <div className="flex gap-0.5">
            {[0, 0.15, 0.3, 0.5, 0.7, 0.85, 1].map((ratio) => (
              <div
                key={ratio}
                className="w-6 h-3 rounded-sm"
                style={{ backgroundColor: getCellColor(ratio * maxValue) }}
              />
            ))}
          </div>
          <span className="text-xs text-ink-muted">{t.heatmap.high}</span>
        </div>
      </div>

      {hoveredCell && (
        <div
          className="fixed z-50 px-3 py-2 bg-panel border border-edge rounded-lg shadow-lg text-sm pointer-events-none"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 48,
          }}
        >
          <div className="text-ink font-medium">
            {WEEKDAY_LABELS[hoveredCell.weekday - 1]}{t.heatmap.weekdaySuffix} {hoveredCell.hour}:00{t.common.to}{hoveredCell.hour + 1}:00
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-accent tabular-nums font-medium">
              {formatCost(hoveredCell.cost)}
            </span>
            <span className="text-ink-secondary tabular-nums">
              {formatTokens(hoveredCell.tokens)} tokens
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 motion-safe:animate-pulse">
      <div className="h-8 bg-panel-alt rounded w-36" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-panel rounded-xl p-6 border border-edge">
            <div className="h-4 bg-panel-alt rounded w-24 mb-3" />
            <div className="h-8 bg-panel-alt rounded w-32" />
          </div>
        ))}
      </div>
      <div className="bg-panel rounded-xl p-6 border border-edge">
        <div className="h-64 bg-panel-alt rounded" />
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
