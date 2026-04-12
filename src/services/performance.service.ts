import {
  dashboardService,
  getDashboardRange,
  getPreviousRange,
  type DashboardBusinessPerformance,
  type DashboardRange,
  type DashboardSummary,
} from "@/services/dashboard.service";
import { requireCompanyId, requireUuid } from "@/lib/companyScope";
import { supabase } from "@/lib/supabase";
import {
  assertCustomGoalsNoOverlap,
  assertRollingGoalUnique,
  BusinessRuleError,
  validatePerformanceGoalPayload,
  type GoalPeer,
  type PerformanceGoalPayload,
} from "@/lib/businessRules";
import type {
  PerformanceGoalMetric,
  PerformanceGoalPeriodType,
  PerformanceGoalStatus,
  PerformancePeriodPreset,
} from "@/types/performanceGoals";

export type {
  PerformanceGoalMetric,
  PerformanceGoalPeriodType,
  PerformanceGoalStatus,
  PerformancePeriodPreset,
} from "@/types/performanceGoals";

function normalizeGrowthPercent(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/** Metas extras: fonte de verdade = tabela `company_performance_goals` (migration 057). */

const LS_KEY = "brynex_performance_extra_goals_v1";

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
  /** Para concorrência otimista (atualização segura). */
  updated_at?: string;
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

function rowToStored(row: Record<string, unknown>): StoredPerformanceGoal {
  return {
    id: String(row.id),
    company_id: String(row.company_id),
    name: String(row.name),
    period_type: row.period_type as PerformanceGoalPeriodType,
    metric: row.metric as PerformanceGoalMetric,
    target_value: Number(row.target_value),
    custom_start: (row.custom_start as string | null) ?? null,
    custom_end: (row.custom_end as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

function peersFromList(list: StoredPerformanceGoal[]): GoalPeer[] {
  return list.map((g) => ({
    id: g.id,
    period_type: g.period_type,
    metric: g.metric,
    custom_start: g.custom_start,
    custom_end: g.custom_end,
  }));
}

async function migrateLocalGoalsToSupabase(companyId: string): Promise<void> {
  const store = readGoalStore();
  const legacy = store[companyId];
  if (!legacy?.length) return;

  let migrated = 0;
  for (const g of legacy) {
    try {
      const payload: PerformanceGoalPayload = {
        name: g.name,
        period_type: g.period_type,
        metric: g.metric,
        target_value: g.target_value,
        custom_start: g.custom_start,
        custom_end: g.custom_end,
      };
      validatePerformanceGoalPayload(payload);
      const { error } = await supabase.from("company_performance_goals").insert({
        company_id: companyId,
        name: payload.name.trim(),
        period_type: payload.period_type,
        metric: payload.metric,
        target_value: payload.target_value,
        custom_start: payload.period_type === "custom" ? payload.custom_start : null,
        custom_end: payload.period_type === "custom" ? payload.custom_end : null,
      });
      if (!error) migrated += 1;
    } catch {
      /* ignora metas legadas inválidas */
    }
  }

  if (migrated > 0) {
    delete store[companyId];
    writeGoalStore(store);
  }
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
    requireCompanyId(companyId);
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

  async listGoals(companyId: string): Promise<{ data: StoredPerformanceGoal[]; error: unknown }> {
    requireCompanyId(companyId);
    const { data, error } = await supabase
      .from("company_performance_goals")
      .select("*")
      .eq("company_id", companyId)
      .order("name");

    if (error) return { data: [], error };

    let rows = (data ?? []).map((r) => rowToStored(r as Record<string, unknown>));

    if (rows.length === 0) {
      await migrateLocalGoalsToSupabase(companyId);
      const again = await supabase
        .from("company_performance_goals")
        .select("*")
        .eq("company_id", companyId)
        .order("name");
      if (again.error) return { data: [], error: again.error };
      rows = (again.data ?? []).map((r) => rowToStored(r as Record<string, unknown>));
    }

    return { data: rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), error: null };
  },

  async createGoal(
    companyId: string,
    input: Omit<StoredPerformanceGoal, "id" | "company_id" | "created_at" | "updated_at">
  ): Promise<{ data: StoredPerformanceGoal | null; error: unknown }> {
    requireCompanyId(companyId);
    const payload: PerformanceGoalPayload = {
      name: input.name,
      period_type: input.period_type,
      metric: input.metric,
      target_value: input.target_value,
      custom_start: input.custom_start,
      custom_end: input.custom_end,
    };
    validatePerformanceGoalPayload(payload);

    const { data: existing, error: listErr } = await this.listGoals(companyId);
    if (listErr) return { data: null, error: listErr };

    const peers = peersFromList(existing);
    assertRollingGoalUnique(peers, {
      id: "__new__",
      period_type: payload.period_type,
      metric: payload.metric,
    });
    assertCustomGoalsNoOverlap(peers, {
      id: "__new__",
      period_type: payload.period_type,
      metric: payload.metric,
      custom_start: payload.custom_start,
      custom_end: payload.custom_end,
    });

    const { data, error } = await supabase
      .from("company_performance_goals")
      .insert({
        company_id: companyId,
        name: payload.name.trim(),
        period_type: payload.period_type,
        metric: payload.metric,
        target_value: payload.target_value,
        custom_start: payload.period_type === "custom" ? payload.custom_start : null,
        custom_end: payload.period_type === "custom" ? payload.custom_end : null,
      })
      .select("*")
      .single();

    if (error) return { data: null, error };
    return { data: rowToStored(data as Record<string, unknown>), error: null };
  },

  async updateGoal(
    companyId: string,
    id: string,
    patch: Partial<StoredPerformanceGoal>,
    options?: { expectedUpdatedAt?: string | null }
  ): Promise<{ data: StoredPerformanceGoal | null; error: unknown }> {
    requireCompanyId(companyId);
    requireUuid(id);

    const { data: list, error: listErr } = await this.listGoals(companyId);
    if (listErr) return { data: null, error: listErr };
    const current = list.find((g) => g.id === id);
    if (!current) {
      return { data: null, error: new BusinessRuleError("Meta não encontrada.", "GOAL_NOT_FOUND") };
    }
    if (current.company_id !== companyId) {
      return { data: null, error: new BusinessRuleError("Meta não pertence a esta empresa.", "GOAL_TENANT") };
    }
    if (options?.expectedUpdatedAt && current.updated_at !== options.expectedUpdatedAt) {
      return {
        data: null,
        error: new BusinessRuleError(
          "Esta meta foi alterada em outro lugar. Recarregue a página e tente novamente.",
          "GOAL_CONFLICT"
        ),
      };
    }

    const merged: StoredPerformanceGoal = { ...current, ...patch, id, company_id: companyId };
    const payload: PerformanceGoalPayload = {
      name: merged.name,
      period_type: merged.period_type,
      metric: merged.metric,
      target_value: Number(merged.target_value),
      custom_start: merged.custom_start,
      custom_end: merged.custom_end,
    };
    validatePerformanceGoalPayload(payload);

    const peers = peersFromList(list.filter((g) => g.id !== id));
    assertRollingGoalUnique(peers, { id, period_type: payload.period_type, metric: payload.metric });
    assertCustomGoalsNoOverlap(peers, {
      id,
      period_type: payload.period_type,
      metric: payload.metric,
      custom_start: payload.custom_start,
      custom_end: payload.custom_end,
    });

    let q = supabase
      .from("company_performance_goals")
      .update({
        name: payload.name.trim(),
        period_type: payload.period_type,
        metric: payload.metric,
        target_value: payload.target_value,
        custom_start: payload.period_type === "custom" ? payload.custom_start : null,
        custom_end: payload.period_type === "custom" ? payload.custom_end : null,
      })
      .eq("id", id)
      .eq("company_id", companyId);

    if (options?.expectedUpdatedAt) {
      q = q.eq("updated_at", options.expectedUpdatedAt);
    }

    const { data, error } = await q.select("*").maybeSingle();

    if (error) return { data: null, error };
    if (!data) {
      return {
        data: null,
        error: new BusinessRuleError(
          "Não foi possível salvar: a meta pode ter sido alterada por outro usuário.",
          "GOAL_CONFLICT"
        ),
      };
    }
    return { data: rowToStored(data as Record<string, unknown>), error: null };
  },

  async deleteGoal(companyId: string, id: string): Promise<{ ok: boolean; error: unknown }> {
    requireCompanyId(companyId);
    requireUuid(id);
    const { error } = await supabase
      .from("company_performance_goals")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) return { ok: false, error };
    return { ok: true, error: null };
  },

  async enrichStoredGoals(
    companyId: string,
    range: DashboardRange,
    goals: StoredPerformanceGoal[]
  ): Promise<PerformanceGoalWithProgress[]> {
    requireCompanyId(companyId);
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
    requireCompanyId(companyId);
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
