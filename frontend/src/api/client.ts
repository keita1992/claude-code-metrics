// --- Response Types ---

export interface DataCoverage {
  timezone: string;
  statsLastComputedDate: string;
  liveDataMode: "incremental" | "full_scan";
  liveRangeStartDate: string;
  liveRangeEndDate: string;
  projectsCoverage: "live_only";
  sessionCoverage: "live_only";
  totalSessionsIncludesLive: boolean;
  totalMessagesIncludesLive: boolean;
}

export interface OverviewData {
  kpi: {
    estimatedCost: number;
    cacheSavings: number;
    cacheHitRate: number;
    avgCostPerSession: number;
    dailyAvgCost: number;
    totalSessions: number;
    totalMessages: number;
    unknownModelCount: number;
    unknownModelTokens: number;
  };
  dailyCost: Array<{ date: string; cost: number }>;
  modelCostDistribution: Array<{ model: string; cost: number }>;
  topModel: { name: string; cost: number; percentage: number } | null;
  coverage: DataCoverage;
}

export interface DailyData {
  daily: Array<{
    date: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    estimatedCost: number;
    sessionCount: number;
    messageCount: number;
  }>;
  timezone: string;
  summary?: {
    uniqueSessions: number;
    totalMessages: number;
    totalCost: number;
  };
}

export interface ModelsData {
  models: Array<{
    model: string;
    modelId: string;
    isPriceKnown: boolean;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    totalCost: number | null;
    withoutCacheCost: number | null;
    cacheSavings: number | null;
    cacheHitRate: number;
  }>;
  dailyModelTrend: Array<{ date: string; models: Record<string, number> }>;
  coverage: DataCoverage;
}

export interface ProjectsData {
  projects: Array<{
    name: string;
    dirName: string;
    sessionCount: number;
    totalTokens: number;
    estimatedCost: number;
    unknownModelTokens: number;
    topTools: Array<{ name: string; count: number }>;
  }>;
  coverage: DataCoverage;
}

export interface InsightsData {
  cacheEfficiency: {
    overallRate: number;
    totalSavings: number;
    byModel: Array<{ model: string; rate: number; savings: number }>;
  };
  downgradeSuggestions: Array<{
    description: string;
    potentialSavings: number;
  }>;
  peakHours: Array<{ hour: number; count: number }>;
  weeklyTrend: Array<{ week: string; cost: number }>;
  projectConcentration: {
    topProjects: Array<{ name: string; percentage: number }>;
    totalProjects: number;
  };
  timezone: string;
  coverage: DataCoverage;
}

export interface HeatmapCell {
  weekday: number; // 1=月...7=日 (ISO weekday)
  hour: number;
  tokens: number;
  cost: number;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  timezone: string;
  coverage: DataCoverage;
}

// --- API Client ---

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function fetchOverview(): Promise<OverviewData> {
  return fetchJSON<OverviewData>("/api/overview");
}

export function fetchDaily(start?: string, end?: string, mode: "daily" | "weekly" = "daily"): Promise<DailyData> {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  if (mode === "weekly") params.set("mode", "weekly");
  const qs = params.toString();
  return fetchJSON<DailyData>(`/api/daily${qs ? `?${qs}` : ""}`);
}

export function fetchModels(): Promise<ModelsData> {
  return fetchJSON<ModelsData>("/api/models");
}

export function fetchProjects(): Promise<ProjectsData> {
  return fetchJSON<ProjectsData>("/api/projects");
}

export function fetchInsights(): Promise<InsightsData> {
  return fetchJSON<InsightsData>("/api/insights");
}

export function fetchHeatmap(start?: string, end?: string): Promise<HeatmapData> {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const qs = params.toString();
  return fetchJSON<HeatmapData>(`/api/heatmap${qs ? `?${qs}` : ""}`);
}
