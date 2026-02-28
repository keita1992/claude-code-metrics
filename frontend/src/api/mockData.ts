// デモモード用モックデータ
// 実データ（keita1992 の stats-cache.json）の傾向を反映:
//   期間: 2025-12-25 〜 2026-02-16（54日間、うちアクティブ34日）
//   夜型ピーク（21〜23時）、Opus 主体、高キャッシュ率（~92.8%）

import type {
  OverviewData,
  DailyData,
  ModelsData,
  ProjectsData,
  InsightsData,
  HeatmapData,
  DataCoverage,
} from "./client";

const COVERAGE: DataCoverage = {
  timezone: "Asia/Tokyo",
  statsLastComputedDate: "2026-02-16",
  liveDataMode: "incremental",
  liveRangeStartDate: "2026-02-17",
  liveRangeEndDate: "2026-02-28",
  projectsCoverage: "live_only",
  sessionCoverage: "live_only",
  totalSessionsIncludesLive: true,
  totalMessagesIncludesLive: true,
};

// --- Overview ---

export const MOCK_OVERVIEW: OverviewData = {
  kpi: {
    estimatedCost: 487.32,
    cacheSavings: 2341.80,
    cacheHitRate: 0.928,
    avgCostPerSession: 0.626,
    dailyAvgCost: 14.33,
    totalSessions: 779,
    totalMessages: 8247,
    unknownModelCount: 0,
    unknownModelTokens: 0,
  },
  dailyCost: [
    { date: "2025-12-25", cost: 4.20 },
    { date: "2025-12-26", cost: 13.80 },
    { date: "2025-12-27", cost: 0 },
    { date: "2025-12-28", cost: 0 },
    { date: "2025-12-29", cost: 11.40 },
    { date: "2025-12-30", cost: 17.50 },
    { date: "2025-12-31", cost: 3.80 },
    { date: "2026-01-01", cost: 0 },
    { date: "2026-01-02", cost: 0 },
    { date: "2026-01-03", cost: 0 },
    { date: "2026-01-04", cost: 0 },
    { date: "2026-01-05", cost: 19.20 },
    { date: "2026-01-06", cost: 22.40 },
    { date: "2026-01-07", cost: 16.80 },
    { date: "2026-01-08", cost: 14.60 },
    { date: "2026-01-09", cost: 24.30 },
    { date: "2026-01-10", cost: 0 },
    { date: "2026-01-11", cost: 5.10 },
    { date: "2026-01-12", cost: 21.80 },
    { date: "2026-01-13", cost: 19.40 },
    { date: "2026-01-14", cost: 17.20 },
    { date: "2026-01-15", cost: 15.90 },
    { date: "2026-01-16", cost: 23.50 },
    { date: "2026-01-17", cost: 0 },
    { date: "2026-01-18", cost: 0 },
    { date: "2026-01-19", cost: 14.30 },
    { date: "2026-01-20", cost: 18.90 },
    { date: "2026-01-21", cost: 16.10 },
    { date: "2026-01-22", cost: 15.00 },
    { date: "2026-01-23", cost: 21.70 },
    { date: "2026-01-24", cost: 4.80 },
    { date: "2026-01-25", cost: 0 },
    { date: "2026-01-26", cost: 16.50 },
    { date: "2026-01-27", cost: 19.30 },
    { date: "2026-01-28", cost: 14.40 },
    { date: "2026-01-29", cost: 12.60 },
    { date: "2026-01-30", cost: 20.80 },
    { date: "2026-01-31", cost: 0 },
    { date: "2026-02-01", cost: 0 },
    { date: "2026-02-02", cost: 15.70 },
    { date: "2026-02-03", cost: 22.10 },
    { date: "2026-02-04", cost: 13.80 },
    { date: "2026-02-05", cost: 12.30 },
    { date: "2026-02-06", cost: 21.40 },
    { date: "2026-02-07", cost: 4.50 },
    { date: "2026-02-08", cost: 0 },
    { date: "2026-02-09", cost: 17.20 },
    { date: "2026-02-10", cost: 19.80 },
    { date: "2026-02-11", cost: 0 },
    { date: "2026-02-12", cost: 15.30 },
    { date: "2026-02-13", cost: 20.50 },
    { date: "2026-02-14", cost: 6.20 },
    { date: "2026-02-15", cost: 0 },
    { date: "2026-02-16", cost: 13.60 },
  ],
  modelCostDistribution: [
    { model: "claude-opus-4-6", cost: 289.45 },
    { model: "claude-opus-4-5-20251101", cost: 156.32 },
    { model: "claude-sonnet-4-5-20250929", cost: 38.71 },
    { model: "claude-haiku-4-5-20251001", cost: 2.84 },
  ],
  topModel: { name: "claude-opus-4-6", cost: 289.45, percentage: 59.4 },
  coverage: COVERAGE,
};

// --- Daily ---

export const MOCK_DAILY: DailyData = {
  daily: [
    { date: "2025-12-25", inputTokens: 42100, outputTokens: 18400, cacheReadTokens: 310000, cacheCreationTokens: 25000, estimatedCost: 4.20, sessionCount: 7, messageCount: 68 },
    { date: "2025-12-26", inputTokens: 138000, outputTokens: 58000, cacheReadTokens: 1020000, cacheCreationTokens: 82000, estimatedCost: 13.80, sessionCount: 22, messageCount: 234 },
    { date: "2025-12-27", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2025-12-28", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2025-12-29", inputTokens: 114000, outputTokens: 48000, cacheReadTokens: 845000, cacheCreationTokens: 68000, estimatedCost: 11.40, sessionCount: 18, messageCount: 192 },
    { date: "2025-12-30", inputTokens: 175000, outputTokens: 74000, cacheReadTokens: 1295000, cacheCreationTokens: 104000, estimatedCost: 17.50, sessionCount: 28, messageCount: 296 },
    { date: "2025-12-31", inputTokens: 38000, outputTokens: 16000, cacheReadTokens: 281000, cacheCreationTokens: 23000, estimatedCost: 3.80, sessionCount: 6, messageCount: 64 },
    { date: "2026-01-01", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-01-02", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-01-03", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-01-04", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-01-05", inputTokens: 192000, outputTokens: 81000, cacheReadTokens: 1420000, cacheCreationTokens: 114000, estimatedCost: 19.20, sessionCount: 31, messageCount: 326 },
    { date: "2026-01-06", inputTokens: 224000, outputTokens: 94000, cacheReadTokens: 1656000, cacheCreationTokens: 133000, estimatedCost: 22.40, sessionCount: 36, messageCount: 380 },
    { date: "2026-01-07", inputTokens: 168000, outputTokens: 71000, cacheReadTokens: 1243000, cacheCreationTokens: 100000, estimatedCost: 16.80, sessionCount: 27, messageCount: 284 },
    { date: "2026-01-08", inputTokens: 146000, outputTokens: 61000, cacheReadTokens: 1081000, cacheCreationTokens: 87000, estimatedCost: 14.60, sessionCount: 23, messageCount: 246 },
    { date: "2026-01-09", inputTokens: 243000, outputTokens: 102000, cacheReadTokens: 1797000, cacheCreationTokens: 144000, estimatedCost: 24.30, sessionCount: 39, messageCount: 412 },
    { date: "2026-01-10", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-01-11", inputTokens: 51000, outputTokens: 21000, cacheReadTokens: 377000, cacheCreationTokens: 30000, estimatedCost: 5.10, sessionCount: 8, messageCount: 86 },
    { date: "2026-01-12", inputTokens: 218000, outputTokens: 92000, cacheReadTokens: 1613000, cacheCreationTokens: 129000, estimatedCost: 21.80, sessionCount: 35, messageCount: 370 },
    { date: "2026-01-13", inputTokens: 194000, outputTokens: 82000, cacheReadTokens: 1435000, cacheCreationTokens: 115000, estimatedCost: 19.40, sessionCount: 31, messageCount: 328 },
    { date: "2026-01-14", inputTokens: 172000, outputTokens: 72000, cacheReadTokens: 1272000, cacheCreationTokens: 102000, estimatedCost: 17.20, sessionCount: 28, messageCount: 292 },
    { date: "2026-01-15", inputTokens: 159000, outputTokens: 67000, cacheReadTokens: 1176000, cacheCreationTokens: 94000, estimatedCost: 15.90, sessionCount: 25, messageCount: 270 },
    { date: "2026-01-16", inputTokens: 235000, outputTokens: 99000, cacheReadTokens: 1738000, cacheCreationTokens: 139000, estimatedCost: 23.50, sessionCount: 38, messageCount: 398 },
    { date: "2026-01-17", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-01-18", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-01-19", inputTokens: 143000, outputTokens: 60000, cacheReadTokens: 1058000, cacheCreationTokens: 85000, estimatedCost: 14.30, sessionCount: 23, messageCount: 242 },
    { date: "2026-01-20", inputTokens: 189000, outputTokens: 80000, cacheReadTokens: 1398000, cacheCreationTokens: 112000, estimatedCost: 18.90, sessionCount: 30, messageCount: 320 },
    { date: "2026-01-21", inputTokens: 161000, outputTokens: 68000, cacheReadTokens: 1191000, cacheCreationTokens: 95000, estimatedCost: 16.10, sessionCount: 26, messageCount: 274 },
    { date: "2026-01-22", inputTokens: 150000, outputTokens: 63000, cacheReadTokens: 1110000, cacheCreationTokens: 89000, estimatedCost: 15.00, sessionCount: 24, messageCount: 256 },
    { date: "2026-01-23", inputTokens: 217000, outputTokens: 91000, cacheReadTokens: 1605000, cacheCreationTokens: 128000, estimatedCost: 21.70, sessionCount: 35, messageCount: 368 },
    { date: "2026-01-24", inputTokens: 48000, outputTokens: 20000, cacheReadTokens: 355000, cacheCreationTokens: 28000, estimatedCost: 4.80, sessionCount: 8, messageCount: 82 },
    { date: "2026-01-25", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-01-26", inputTokens: 165000, outputTokens: 69000, cacheReadTokens: 1221000, cacheCreationTokens: 98000, estimatedCost: 16.50, sessionCount: 26, messageCount: 280 },
    { date: "2026-01-27", inputTokens: 193000, outputTokens: 81000, cacheReadTokens: 1428000, cacheCreationTokens: 114000, estimatedCost: 19.30, sessionCount: 31, messageCount: 326 },
    { date: "2026-01-28", inputTokens: 144000, outputTokens: 60000, cacheReadTokens: 1065000, cacheCreationTokens: 85000, estimatedCost: 14.40, sessionCount: 23, messageCount: 244 },
    { date: "2026-01-29", inputTokens: 126000, outputTokens: 53000, cacheReadTokens: 932000, cacheCreationTokens: 75000, estimatedCost: 12.60, sessionCount: 20, messageCount: 214 },
    { date: "2026-01-30", inputTokens: 208000, outputTokens: 87000, cacheReadTokens: 1539000, cacheCreationTokens: 123000, estimatedCost: 20.80, sessionCount: 33, messageCount: 352 },
    { date: "2026-01-31", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-02-01", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-02-02", inputTokens: 157000, outputTokens: 66000, cacheReadTokens: 1161000, cacheCreationTokens: 93000, estimatedCost: 15.70, sessionCount: 25, messageCount: 266 },
    { date: "2026-02-03", inputTokens: 221000, outputTokens: 93000, cacheReadTokens: 1635000, cacheCreationTokens: 131000, estimatedCost: 22.10, sessionCount: 35, messageCount: 374 },
    { date: "2026-02-04", inputTokens: 138000, outputTokens: 58000, cacheReadTokens: 1021000, cacheCreationTokens: 82000, estimatedCost: 13.80, sessionCount: 22, messageCount: 234 },
    { date: "2026-02-05", inputTokens: 123000, outputTokens: 52000, cacheReadTokens: 910000, cacheCreationTokens: 73000, estimatedCost: 12.30, sessionCount: 20, messageCount: 208 },
    { date: "2026-02-06", inputTokens: 214000, outputTokens: 90000, cacheReadTokens: 1583000, cacheCreationTokens: 127000, estimatedCost: 21.40, sessionCount: 34, messageCount: 362 },
    { date: "2026-02-07", inputTokens: 45000, outputTokens: 19000, cacheReadTokens: 333000, cacheCreationTokens: 27000, estimatedCost: 4.50, sessionCount: 7, messageCount: 76 },
    { date: "2026-02-08", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-02-09", inputTokens: 172000, outputTokens: 72000, cacheReadTokens: 1272000, cacheCreationTokens: 102000, estimatedCost: 17.20, sessionCount: 28, messageCount: 292 },
    { date: "2026-02-10", inputTokens: 198000, outputTokens: 83000, cacheReadTokens: 1464000, cacheCreationTokens: 117000, estimatedCost: 19.80, sessionCount: 32, messageCount: 336 },
    { date: "2026-02-11", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-02-12", inputTokens: 153000, outputTokens: 64000, cacheReadTokens: 1132000, cacheCreationTokens: 91000, estimatedCost: 15.30, sessionCount: 24, messageCount: 260 },
    { date: "2026-02-13", inputTokens: 205000, outputTokens: 86000, cacheReadTokens: 1517000, cacheCreationTokens: 121000, estimatedCost: 20.50, sessionCount: 33, messageCount: 348 },
    { date: "2026-02-14", inputTokens: 62000, outputTokens: 26000, cacheReadTokens: 459000, cacheCreationTokens: 37000, estimatedCost: 6.20, sessionCount: 10, messageCount: 106 },
    { date: "2026-02-15", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0, sessionCount: 0, messageCount: 0 },
    { date: "2026-02-16", inputTokens: 136000, outputTokens: 57000, cacheReadTokens: 1006000, cacheCreationTokens: 81000, estimatedCost: 13.60, sessionCount: 22, messageCount: 230 },
  ],
  timezone: "Asia/Tokyo",
  summary: {
    uniqueSessions: 779,
    totalMessages: 8247,
    totalCost: 487.32,
  },
};

// --- Models ---

export const MOCK_MODELS: ModelsData = {
  models: [
    {
      model: "claude-opus-4-6",
      modelId: "claude-opus-4-6",
      isPriceKnown: true,
      inputTokens: 3240000,
      outputTokens: 1365000,
      cacheReadTokens: 23950000,
      cacheCreationTokens: 1920000,
      totalCost: 289.45,
      withoutCacheCost: 1876.30,
      cacheSavings: 1586.85,
      cacheHitRate: 0.934,
    },
    {
      model: "claude-opus-4-5-20251101",
      modelId: "claude-opus-4-5-20251101",
      isPriceKnown: true,
      inputTokens: 1750000,
      outputTokens: 737000,
      cacheReadTokens: 12940000,
      cacheCreationTokens: 1037000,
      totalCost: 156.32,
      withoutCacheCost: 908.70,
      cacheSavings: 752.38,
      cacheHitRate: 0.922,
    },
    {
      model: "claude-sonnet-4-5-20250929",
      modelId: "claude-sonnet-4-5-20250929",
      isPriceKnown: true,
      inputTokens: 431000,
      outputTokens: 181000,
      cacheReadTokens: 3188000,
      cacheCreationTokens: 255000,
      totalCost: 38.71,
      withoutCacheCost: 41.54,
      cacheSavings: 2.83,
      cacheHitRate: 0.917,
    },
    {
      model: "claude-haiku-4-5-20251001",
      modelId: "claude-haiku-4-5-20251001",
      isPriceKnown: true,
      inputTokens: 62000,
      outputTokens: 26000,
      cacheReadTokens: 459000,
      cacheCreationTokens: 37000,
      totalCost: 2.84,
      withoutCacheCost: 2.98,
      cacheSavings: 0.14,
      cacheHitRate: 0.904,
    },
  ],
  dailyModelTrend: MOCK_DAILY.daily
    .filter((d) => d.estimatedCost > 0)
    .map((d) => ({
      date: d.date,
      models: {
        "claude-opus-4-6": Math.round(d.estimatedCost * 0.594 * 100) / 100,
        "claude-opus-4-5-20251101": Math.round(d.estimatedCost * 0.321 * 100) / 100,
        "claude-sonnet-4-5-20250929": Math.round(d.estimatedCost * 0.079 * 100) / 100,
        "claude-haiku-4-5-20251001": Math.round(d.estimatedCost * 0.006 * 100) / 100,
      },
    })),
  coverage: COVERAGE,
};

// --- Projects ---

export const MOCK_PROJECTS: ProjectsData = {
  projects: [
    {
      name: "claude-code-metrics",
      dirName: "-Users-private-dev-claude-code-metrics",
      sessionCount: 142,
      totalTokens: 12840000,
      estimatedCost: 98.40,
      unknownModelTokens: 0,
      topTools: [
        { name: "Read", count: 3420 },
        { name: "Edit", count: 1870 },
        { name: "Bash", count: 1340 },
        { name: "Grep", count: 980 },
        { name: "Glob", count: 720 },
      ],
    },
    {
      name: "musubi",
      dirName: "-Users-private-dev-musubi",
      sessionCount: 198,
      totalTokens: 17920000,
      estimatedCost: 142.80,
      unknownModelTokens: 0,
      topTools: [
        { name: "Bash", count: 4210 },
        { name: "Read", count: 2980 },
        { name: "Edit", count: 2340 },
        { name: "Grep", count: 1560 },
        { name: "Write", count: 890 },
      ],
    },
    {
      name: "memory-pot",
      dirName: "-Users-private-dev-memory-pot",
      sessionCount: 87,
      totalTokens: 7830000,
      estimatedCost: 61.20,
      unknownModelTokens: 0,
      topTools: [
        { name: "Read", count: 1920 },
        { name: "Edit", count: 1240 },
        { name: "Bash", count: 980 },
        { name: "Glob", count: 540 },
        { name: "Grep", count: 430 },
      ],
    },
    {
      name: "veg-reserve",
      dirName: "-Users-private-dev-veg-reserve",
      sessionCount: 73,
      totalTokens: 6570000,
      estimatedCost: 51.40,
      unknownModelTokens: 0,
      topTools: [
        { name: "Read", count: 1540 },
        { name: "Bash", count: 1120 },
        { name: "Edit", count: 890 },
        { name: "Grep", count: 620 },
        { name: "Write", count: 340 },
      ],
    },
    {
      name: "dotfiles",
      dirName: "-Users-private-dotfiles",
      sessionCount: 45,
      totalTokens: 4050000,
      estimatedCost: 32.10,
      unknownModelTokens: 0,
      topTools: [
        { name: "Read", count: 980 },
        { name: "Edit", count: 760 },
        { name: "Bash", count: 540 },
        { name: "Write", count: 280 },
        { name: "Glob", count: 190 },
      ],
    },
    {
      name: "claude-skills",
      dirName: "-Users-private--claude-skills",
      sessionCount: 62,
      totalTokens: 5580000,
      estimatedCost: 43.70,
      unknownModelTokens: 0,
      topTools: [
        { name: "Read", count: 1320 },
        { name: "Write", count: 980 },
        { name: "Edit", count: 870 },
        { name: "Bash", count: 430 },
        { name: "Glob", count: 310 },
      ],
    },
    {
      name: "sandbox",
      dirName: "-Users-private-dev-sandbox",
      sessionCount: 38,
      totalTokens: 3420000,
      estimatedCost: 24.80,
      unknownModelTokens: 0,
      topTools: [
        { name: "Bash", count: 860 },
        { name: "Read", count: 640 },
        { name: "Write", count: 420 },
        { name: "Edit", count: 380 },
        { name: "Grep", count: 210 },
      ],
    },
    {
      name: "infrastructure",
      dirName: "-Users-private-dev-infrastructure",
      sessionCount: 52,
      totalTokens: 4680000,
      estimatedCost: 16.90,
      unknownModelTokens: 0,
      topTools: [
        { name: "Bash", count: 1240 },
        { name: "Read", count: 890 },
        { name: "Edit", count: 560 },
        { name: "Grep", count: 340 },
        { name: "Glob", count: 220 },
      ],
    },
    {
      name: "blog",
      dirName: "-Users-private-dev-blog",
      sessionCount: 29,
      totalTokens: 2610000,
      estimatedCost: 10.10,
      unknownModelTokens: 0,
      topTools: [
        { name: "Read", count: 580 },
        { name: "Write", count: 460 },
        { name: "Edit", count: 380 },
        { name: "Bash", count: 190 },
        { name: "Glob", count: 120 },
      ],
    },
    {
      name: "experiments",
      dirName: "-Users-private-dev-experiments",
      sessionCount: 53,
      totalTokens: 4770000,
      estimatedCost: 5.92,
      unknownModelTokens: 0,
      topTools: [
        { name: "Bash", count: 1120 },
        { name: "Read", count: 780 },
        { name: "Write", count: 540 },
        { name: "Edit", count: 340 },
        { name: "Grep", count: 180 },
      ],
    },
  ],
  coverage: COVERAGE,
};

// --- Insights ---

export const MOCK_INSIGHTS: InsightsData = {
  peakHours: [
    { hour: 0, count: 82 },
    { hour: 1, count: 45 },
    { hour: 2, count: 23 },
    { hour: 3, count: 12 },
    { hour: 4, count: 8 },
    { hour: 5, count: 6 },
    { hour: 6, count: 14 },
    { hour: 7, count: 38 },
    { hour: 8, count: 92 },
    { hour: 9, count: 198 },
    { hour: 10, count: 264 },
    { hour: 11, count: 287 },
    { hour: 12, count: 218 },
    { hour: 13, count: 176 },
    { hour: 14, count: 245 },
    { hour: 15, count: 312 },
    { hour: 16, count: 356 },
    { hour: 17, count: 389 },
    { hour: 18, count: 421 },
    { hour: 19, count: 487 },
    { hour: 20, count: 534 },
    { hour: 21, count: 612 },
    { hour: 22, count: 578 },
    { hour: 23, count: 398 },
  ],
  cacheEfficiency: {
    overallRate: 0.928,
    totalSavings: 2341.80,
    byModel: [
      { model: "claude-opus-4-6", rate: 0.934, savings: 1586.85 },
      { model: "claude-opus-4-5-20251101", rate: 0.922, savings: 752.38 },
      { model: "claude-sonnet-4-5-20250929", rate: 0.917, savings: 2.83 },
      { model: "claude-haiku-4-5-20251001", rate: 0.904, savings: 0.14 },
    ],
  },
  downgradeSuggestions: [
    {
      description: "claude-opus-4-6 の使用をクエリの複雑さに応じて Sonnet に切り替えると、コストを最大 40% 削減できる可能性があります",
      potentialSavings: 115.78,
    },
    {
      description: "短い補完タスクに claude-haiku-4-5 を活用することで追加のコスト削減が見込めます",
      potentialSavings: 34.21,
    },
  ],
  weeklyTrend: [
    { week: "2025-W52", cost: 50.70 },
    { week: "2026-W01", cost: 98.40 },
    { week: "2026-W02", cost: 104.30 },
    { week: "2026-W03", cost: 97.80 },
    { week: "2026-W04", cost: 95.60 },
    { week: "2026-W05", cost: 40.52 },
  ],
  projectConcentration: {
    topProjects: [
      { name: "musubi", percentage: 29.3 },
      { name: "claude-code-metrics", percentage: 20.2 },
      { name: "memory-pot", percentage: 12.6 },
      { name: "veg-reserve", percentage: 10.5 },
      { name: "claude-skills", percentage: 9.0 },
    ],
    totalProjects: 20,
  },
  timezone: "Asia/Tokyo",
  coverage: COVERAGE,
};

// --- Heatmap ---

// 夜型ピーク（21〜23時）、平日多め のパターンを再現
// weekday: ISO 8601 (1=月, 7=日)
const HOUR_WEIGHTS = [
  0.08, 0.05, 0.03, 0.02, 0.02, 0.03, 0.05, 0.09, 0.17, 0.28, 0.38, 0.43,
  0.33, 0.28, 0.38, 0.48, 0.58, 0.67, 0.82, 0.92, 1.00, 1.18, 1.12, 0.78,
];
const DOW_WEIGHTS = [1.00, 1.08, 1.02, 0.94, 1.12, 0.42, 0.30];

const PEAK_TOKENS = 780000;
const PEAK_COST = 6.24;

function _buildHeatmapCells() {
  const cells = [];
  for (let w = 1; w <= 7; w++) {
    for (let h = 0; h < 24; h++) {
      const multiplier = DOW_WEIGHTS[w - 1] * HOUR_WEIGHTS[h];
      const tokens = Math.round(PEAK_TOKENS * multiplier);
      const cost = Math.round(PEAK_COST * multiplier * 100) / 100;
      if (tokens > 0) {
        cells.push({ weekday: w, hour: h, tokens, cost });
      }
    }
  }
  return cells;
}

export const MOCK_HEATMAP: HeatmapData = {
  cells: _buildHeatmapCells(),
  timezone: "Asia/Tokyo",
  coverage: COVERAGE,
};
