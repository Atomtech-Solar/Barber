import {
  dashboardService,
  getDashboardRange,
  getPreviousRange,
  type DashboardBusinessPerformance,
  type DashboardRange,
  type DashboardSummary,
} from "@/services/dashboard.service";

function normalizeGrowthPercent(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Atenção: localStorage é vulnerável a XSS — dados aqui são apenas UX/mock até API dedicada existir.

const LS_KEY = "brynex_performance_extra_goals_v1";

export type PerformancePeriodPreset = "today" | "7d" | "30d" | "custom";

export type PerformanceGoalPeriodType = "daily" | "weekly" | "monthly" | "custom";

export type PerformanceGoalMetric = "revenue" | "appointments" | "average_ticket";

export type PerformanceGoalStatus = "in_progress" | "achieved" | "behind";

export type StoredPerformanceGoal = {
  id: string;
  company_id: string;
  name: string;
  period_type: PerformanceGoalPeriodType;
  metric: PerformanceGoalMetric;
  target_value: number;
  custom_start?: string | null;
  custom_end?: string | null;
  created_at: string;
};

export type PerformanceGoalWithProgress = StoredPerformanceGoal & {
  current_value: number;
  progress_percent: number;
  status: PerformanceGoalStatus;
};

export type RankingMetricMode = "revenue" | "quantity";

export type RankingRowBase = {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
  /** Variação de posição vs. período anterior quando a ordenação é por faturamento. */
  rank_delta_revenue: number | null;
  /** Variação de posição vs. período anterior quando a ordenação é por quantidade. */
  rank_delta_quantity: number | null;
};

export type PerformanceIndicatorSnapshot = {
  revenue: { value: number; changePct: number };
  appointments: { value: number; changePct: number };
  averageTicket: { value: number; changePct: number };
};

function readGoalStore(): Record<string, StoredPerformanceGoal[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredPerformanceGoal[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeGoalStore(store: Record<string, StoredPerformanceGoal[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(store));
}

function newId() {
  return `pg_${crypto.randomUUID?.() ?? String(Date.now())}`;
}

function goalStatusFromProgress(progressPercent: number): PerformanceGoalStatus {
  if (progressPercent >= 100) return "achieved";
  if (progressPercent < 60) return "behind";
  return "in_progress";
}

export function getPerformanceRange(
  preset: PerformancePeriodPreset,
  custom?: { startDate: string; endDate: string } | null
): DashboardRange {
  if (preset === "custom" && custom?.startDate && custom?.endDate) {
    const a = custom.startDate <= custom.endDate ? custom.startDate : custom.endDate;
    const b = custom.startDate <= custom.endDate ? custom.endDate : custom.startDate;
    return { startDate: a, endDate: b };
  }
  const key =
    preset === "today" ? "today" : preset === "7d" ? "7d" : preset === "30d" ? "30d" : "7d";
  return getDashboardRange(key);
}

function metricCurrent(metric: PerformanceGoalMetric, summary: DashboardSummary): number {
  if (metric === "revenue") return summary.revenue;
  if (metric === "appointments") return summary.clientsServed;
  return summary.averageTicket;
}

function buildServiceRankingRows(
  curr: DashboardBusinessPerformance["topServices"],
  prev: DashboardBusinessPerformance["topServices"]
): RankingRowBase[] {
  const currRev = [...curr].sort((a, b) => b.revenue - a.revenue || b.appointments - a.appointments);
  const prevRev = [...prev].sort((a, b) => b.revenue - a.revenue || b.appointments - a.appointments);
  const prevRevRank = new Map(prevRev.map((s, i) => [s.serviceId, i + 1]));

  const currQty = [...curr].sort((a, b) => b.appointments - a.appointments || b.revenue - a.revenue);
  const prevQty = [...prev].sort((a, b) => b.appointments - a.appointments || b.revenue - a.revenue);
  const prevQtyRank = new Map(prevQty.map((s, i) => [s.serviceId, i + 1]));

  const qtyDeltaById = new Map<string, number | null>();
  currQty.forEach((s, i) => {
    const newRank = i + 1;
    const old = prevQtyRank.get(s.serviceId);
    qtyDeltaById.set(s.serviceId, old == null ? null : old - newRank);
  });

  return currRev.map((s, i) => {
    const newRank = i + 1;
    const old = prevRevRank.get(s.serviceId);
    return {
      id: s.serviceId,
      name: s.serviceName,
      revenue: s.revenue,
      quantity: s.appointments,
      rank_delta_revenue: old == null ? null : old - newRank,
      rank_delta_quantity: qtyDeltaById.get(s.serviceId) ?? null,
    };
  });
}

function buildProfessionalRankingRows(
  curr: DashboardBusinessPerformance["topProfessionals"],
  prev: DashboardBusinessPerformance["topProfessionals"]
): RankingRowBase[] {
  const currRev = [...curr].sort((a, b) => b.revenue - a.revenue || b.appointments - a.appointments);
  const prevRev = [...prev].sort((a, b) => b.revenue - a.revenue || b.appointments - a.appointments);
  const prevRevRank = new Map(prevRev.map((p, i) => [p.professionalId, i + 1]));

  const currQty = [...curr].sort((a, b) => b.appointments - a.appointments || b.revenue - a.revenue);
  const prevQty = [...prev].sort((a, b) => b.appointments - a.appointments || b.revenue - a.revenue);
  const prevQtyRank = new Map(prevQty.map((p, i) => [p.professionalId, i + 1]));

  const qtyDeltaById = new Map<string, number | null>();
  currQty.forEach((p, i) => {
    const newRank = i + 1;
    const old = prevQtyRank.get(p.professionalId);
    qtyDeltaById.set(p.professionalId, old == null ? null : old - newRank);
  });

  return currRev.map((p, i) => {
    const newRank = i + 1;
    const old = prevRevRank.get(p.professionalId);
    return {
      id: p.professionalId,
      name: p.professionalName,
      revenue: p.revenue,
      quantity: p.appointments,
      rank_delta_revenue: old == null ? null : old - newRank,
      rank_delta_quantity: qtyDeltaById.get(p.professionalId) ?? null,
    };
  });
}

export const performanceService = {
  async getPerformanceIndicators(
    companyId: string,
    range: DashboardRange
  ): Promise<{ data: PerformanceIndicatorSnapshot; error: unknown }> {
    const previousRange = getPreviousRange(range);
    const [currRes, prevRes] = await Promise.all([
      dashboardService.getSummary(companyId, range),
      dashboardService.getSummary(companyId, previousRange),
    ]);
    const c = currRes.data;
    const p = prevRes.data;
    return {
      data: {
        revenue: { value: c.revenue, changePct: normalizeGrowthPercent(c.revenue, p.revenue) },
        appointments: {
          value: c.clientsServed,
          changePct: normalizeGrowthPercent(c.clientsServed, p.clientsServed),
        },
        averageTicket: {
          value: c.averageTicket,
          changePct: normalizeGrowthPercent(c.averageTicket, p.averageTicket),
        },
      },
      error: currRes.error ?? prevRes.error,
    };
  },

  listStoredGoals(companyId: string): StoredPerformanceGoal[] {
    const store = readGoalStore();
    return (store[companyId] ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  createStoredGoal(
    companyId: string,
    input: Omit<StoredPerformanceGoal, "id" | "company_id" | "created_at">
  ): StoredPerformanceGoal {
    const store = readGoalStore();
    const list = store[companyId] ?? [];
    const row: StoredPerformanceGoal = {
      ...input,
      id: newId(),
      company_id: companyId,
      created_at: new Date().toISOString(),
    };
    store[companyId] = [...list, row];
    writeGoalStore(store);
    return row;
  },

  updateStoredGoal(companyId: string, id: string, patch: Partial<StoredPerformanceGoal>): StoredPerformanceGoal | null {
    const store = readGoalStore();
    const list = store[companyId] ?? [];
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    const next = { ...list[idx], ...patch, id: list[idx].id, company_id: companyId };
    const copy = [...list];
    copy[idx] = next;
    store[companyId] = copy;
    writeGoalStore(store);
    return next;
  },

  deleteStoredGoal(companyId: string, id: string): boolean {
    const store = readGoalStore();
    const list = store[companyId] ?? [];
    const filtered = list.filter((g) => g.id !== id);
    if (filtered.length === list.length) return false;
    store[companyId] = filtered;
    writeGoalStore(store);
    return true;
  },

  async enrichStoredGoals(
    companyId: string,
    range: DashboardRange,
    goals: StoredPerformanceGoal[]
  ): Promise<PerformanceGoalWithProgress[]> {
    const { data: summary } = await dashboardService.getSummary(companyId, range);
    return goals.map((g) => {
      const current = metricCurrent(g.metric, summary);
      const progress =
        g.target_value > 0 ? Math.min(150, (current / g.target_value) * 100) : 0;
      return {
        ...g,
        current_value: current,
        progress_percent: progress,
        status: goalStatusFromProgress(progress),
      };
    });
  },

  /**
   * Rankings com comparação ao período anterior (delta de posição).
   * Segurança: agregação real deve ser validada na API em produção.
   */
  async getRankingsWithTrend(companyId: string, range: DashboardRange) {
    const previousRange = getPreviousRange(range);
    const [currRes, prevRes] = await Promise.all([
      dashboardService.getBusinessPerformance(companyId, range),
      dashboardService.getBusinessPerformance(companyId, previousRange),
    ]);

    const curr = currRes.data;
    const previous = prevRes.data;

    const services = buildServiceRankingRows(curr.topServices, previous.topServices);
    const professionals = buildProfessionalRankingRows(curr.topProfessionals, previous.topProfessionals);

    return { services, professionals, error: currRes.error ?? prevRes.error };
  },
};
