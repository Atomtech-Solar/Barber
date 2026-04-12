import type { PerformanceGoalMetric, PerformanceGoalPeriodType } from "@/types/performanceGoals";

/** Erro de regra de negócio (mensagem segura para exibir ao usuário). */
export class BusinessRuleError extends Error {
  readonly isBusinessRule = true;
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

export function isBusinessRuleError(e: unknown): e is BusinessRuleError {
  return typeof e === "object" && e !== null && (e as BusinessRuleError).isBusinessRule === true;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidYmd(value: string | null | undefined): boolean {
  if (!value || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime());
}

export interface PerformanceGoalPayload {
  name: string;
  period_type: PerformanceGoalPeriodType;
  metric: PerformanceGoalMetric;
  target_value: number;
  custom_start?: string | null;
  custom_end?: string | null;
}

export function validatePerformanceGoalPayload(input: PerformanceGoalPayload): void {
  const name = input.name?.trim() ?? "";
  if (!name) {
    throw new BusinessRuleError("Informe o nome da meta.", "GOAL_NAME");
  }
  if (name.length > 200) {
    throw new BusinessRuleError("Nome da meta muito longo (máx. 200 caracteres).", "GOAL_NAME");
  }

  const allowedPeriod: PerformanceGoalPeriodType[] = ["daily", "weekly", "monthly", "custom"];
  if (!allowedPeriod.includes(input.period_type)) {
    throw new BusinessRuleError("Tipo de período inválido.", "GOAL_PERIOD");
  }

  const allowedMetric: PerformanceGoalMetric[] = ["revenue", "appointments", "average_ticket"];
  if (!allowedMetric.includes(input.metric)) {
    throw new BusinessRuleError("Indicador inválido.", "GOAL_METRIC");
  }

  const target = Number(input.target_value);
  if (!Number.isFinite(target) || target <= 0) {
    throw new BusinessRuleError("O valor alvo deve ser maior que zero.", "GOAL_TARGET");
  }

  if (input.period_type === "custom") {
    const a = input.custom_start?.trim() ?? "";
    const b = input.custom_end?.trim() ?? "";
    if (!a || !b) {
      throw new BusinessRuleError("Informe início e fim do período personalizado.", "GOAL_DATES");
    }
    if (!isValidYmd(a) || !isValidYmd(b)) {
      throw new BusinessRuleError("Datas inválidas. Use o formato AAAA-MM-DD.", "GOAL_DATES");
    }
    if (a > b) {
      throw new BusinessRuleError("A data inicial não pode ser maior que a final.", "GOAL_DATES");
    }
  } else if (input.custom_start != null || input.custom_end != null) {
    throw new BusinessRuleError("Metas fixas (diária/semanal/mensal) não devem ter intervalo de datas.", "GOAL_DATES");
  }
}

/** Sobreposição de intervalos [a1,b1] e [a2,b2] inclusive. */
export function dateRangesOverlap(
  a1: string,
  b1: string,
  a2: string,
  b2: string
): boolean {
  return a1 <= b2 && a2 <= b1;
}

export interface GoalPeer {
  id: string;
  period_type: PerformanceGoalPeriodType;
  metric: PerformanceGoalMetric;
  custom_start?: string | null;
  custom_end?: string | null;
}

/** Evita duas metas “fixas” (daily/weekly/monthly) com o mesmo indicador na empresa. */
export function assertRollingGoalUnique(peers: GoalPeer[], candidate: Omit<GoalPeer, "custom_start" | "custom_end">): void {
  const rolling = new Set(["daily", "weekly", "monthly"]);
  if (!rolling.has(candidate.period_type)) return;
  const clash = peers.find(
    (p) =>
      p.id !== candidate.id &&
      p.metric === candidate.metric &&
      p.period_type === candidate.period_type &&
      rolling.has(p.period_type)
  );
  if (clash) {
    throw new BusinessRuleError(
      "Já existe uma meta deste período para o mesmo indicador. Edite ou remova a existente.",
      "GOAL_DUP_ROLLING"
    );
  }
}

/** Sobreposição de metas personalizadas (mesmo indicador). */
export function assertCustomGoalsNoOverlap(peers: GoalPeer[], candidate: GoalPeer): void {
  if (candidate.period_type !== "custom") return;
  const cs = candidate.custom_start?.trim();
  const ce = candidate.custom_end?.trim();
  if (!cs || !ce) return;
  for (const p of peers) {
    if (p.id === candidate.id || p.period_type !== "custom" || p.metric !== candidate.metric) continue;
    const ps = p.custom_start?.trim();
    const pe = p.custom_end?.trim();
    if (!ps || !pe) continue;
    if (dateRangesOverlap(cs, ce, ps, pe)) {
      throw new BusinessRuleError(
        "Já existe outra meta personalizada neste período para o mesmo indicador.",
        "GOAL_OVERLAP"
      );
    }
  }
}
