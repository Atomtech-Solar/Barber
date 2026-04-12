import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Download,
  Minus,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { dashboardService, type DashboardRangeKey } from "@/services/dashboard.service";
import {
  performanceService,
  getPerformanceRange,
  type PerformanceGoalMetric,
  type PerformanceGoalPeriodType,
  type PerformanceGoalStatus,
  type PerformanceGoalWithProgress,
  type PerformancePeriodPreset,
  type RankingMetricMode,
  type StoredPerformanceGoal,
} from "@/services/performance.service";
import { companyService } from "@/services/company.service";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PERIOD_FILTERS: { id: PerformancePeriodPreset; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "custom", label: "Personalizado" },
];

const GOAL_PERIOD_LABELS: Record<PerformanceGoalPeriodType, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  custom: "Personalizada",
};

const GOAL_METRIC_LABELS: Record<PerformanceGoalMetric, string> = {
  revenue: "Faturamento",
  appointments: "Atendimentos concluídos",
  average_ticket: "Ticket médio",
};

const STATUS_LABELS: Record<PerformanceGoalStatus, string> = {
  in_progress: "Em andamento",
  achieved: "Atingida",
  behind: "Atrasada",
};

const STATUS_BADGE: Record<PerformanceGoalStatus, string> = {
  in_progress: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  achieved: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  behind: "bg-destructive/15 text-destructive",
};

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMetricValue(metric: PerformanceGoalMetric, value: number) {
  if (metric === "appointments") return String(Math.round(value));
  return formatCurrency(value);
}

function mapPrimaryGoalStatus(status: "danger" | "warning" | "success"): PerformanceGoalStatus {
  if (status === "success") return "achieved";
  if (status === "warning") return "in_progress";
  return "behind";
}

function formatPercentVsPrevious(pct: number) {
  const rounded = pct.toFixed(1);
  if (pct > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

function IndicatorCard({
  title,
  icon: Icon,
  value,
  changePct,
  formatValue,
  loading,
}: {
  title: string;
  icon: typeof DollarSign;
  value: number;
  changePct: number;
  formatValue: (n: number) => string;
  loading: boolean;
}) {
  const neutral = Math.abs(changePct) < 0.05;
  const up = changePct > 0.05;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
        {title}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-32" />
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{formatValue(value)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
            {neutral ? (
              <>
                <Minus className="size-4 text-muted-foreground" aria-hidden />
                <span className="text-muted-foreground">Estável</span>
              </>
            ) : up ? (
              <>
                <ArrowUpRight className="size-4 shrink-0 text-emerald-600" aria-hidden />
                <span className="font-medium text-emerald-600 tabular-nums">
                  {formatPercentVsPrevious(changePct)}
                </span>
              </>
            ) : (
              <>
                <ArrowDownRight className="size-4 shrink-0 text-destructive" aria-hidden />
                <span className="font-medium text-destructive tabular-nums">
                  {formatPercentVsPrevious(changePct)}
                </span>
              </>
            )}
            <span className="text-xs text-muted-foreground">vs. período anterior</span>
          </div>
        </>
      )}
    </div>
  );
}

function RankDelta({ delta }: { delta: number | null }) {
  if (delta == null) {
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5">
        <Minus className="size-3.5" aria-hidden />
        —
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="text-xs font-medium text-emerald-600 inline-flex items-center gap-0.5">
        <ArrowUpRight className="size-3.5" aria-hidden />
        {delta} pos.
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="text-xs font-medium text-destructive inline-flex items-center gap-0.5">
        <ArrowDownRight className="size-3.5" aria-hidden />
        {Math.abs(delta)} pos.
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5">
      <Minus className="size-3.5" aria-hidden />
      estável
    </span>
  );
}

const defaultCustomRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: toIso(start), endDate: toIso(end) };
};

const emptyGoalForm = {
  name: "",
  period_type: "monthly" as PerformanceGoalPeriodType,
  metric: "revenue" as PerformanceGoalMetric,
  target_value: "",
  custom_start: "",
  custom_end: "",
};

const AppPerformance = () => {
  const queryClient = useQueryClient();
  const { currentCompany, setCurrentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";

  const [periodPreset, setPeriodPreset] = useState<PerformancePeriodPreset>("7d");
  const [customRange, setCustomRange] = useState(() => defaultCustomRange());

  const range = useMemo(
    () =>
      periodPreset === "custom"
        ? getPerformanceRange("custom", customRange)
        : getPerformanceRange(periodPreset),
    [periodPreset, customRange]
  );

  const [goalTypeFilter, setGoalTypeFilter] = useState<PerformanceGoalPeriodType | "all">("all");
  const [goalStatusFilter, setGoalStatusFilter] = useState<PerformanceGoalStatus | "all">("all");
  const [rankingMetric, setRankingMetric] = useState<RankingMetricMode>("revenue");

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StoredPerformanceGoal | null>(null);
  const [goalForm, setGoalForm] = useState(emptyGoalForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [primaryDialogOpen, setPrimaryDialogOpen] = useState(false);
  const [primaryAmount, setPrimaryAmount] = useState("");
  const [primaryPeriod, setPrimaryPeriod] = useState<PerformanceGoalPeriodType>("weekly");
  const [primaryStart, setPrimaryStart] = useState("");
  const [primaryEnd, setPrimaryEnd] = useState("");

  const performanceRangeKey: DashboardRangeKey | "custom" =
    periodPreset === "custom" ? "custom" : (periodPreset as DashboardRangeKey);

  const { data: performanceRes, isLoading: performanceLoading } = useQuery({
    queryKey: ["dashboard-performance", companyId, range.startDate, range.endDate, performanceRangeKey],
    queryFn: () => dashboardService.getBusinessPerformance(companyId, range),
    enabled: !!companyId,
  });

  const performance = performanceRes?.data;

  const { data: enrichedGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["performance-goals-block", companyId, range.startDate, range.endDate],
    queryFn: async () => {
      const { data: raw, error } = await performanceService.listGoals(companyId);
      if (error) throw error;
      return performanceService.enrichStoredGoals(companyId, range, raw);
    },
    enabled: !!companyId,
  });

  const { data: rankingsData, isLoading: rankingsLoading } = useQuery({
    queryKey: ["performance-rankings-trend", companyId, range.startDate, range.endDate],
    queryFn: () => performanceService.getRankingsWithTrend(companyId, range),
    enabled: !!companyId,
  });

  const { data: indicatorsRes, isLoading: indicatorsLoading } = useQuery({
    queryKey: ["performance-indicators", companyId, range.startDate, range.endDate],
    queryFn: () => performanceService.getPerformanceIndicators(companyId, range),
    enabled: !!companyId,
  });
  const indicators = indicatorsRes?.data;

  const filteredExtraGoals = useMemo(() => {
    return enrichedGoals.filter((g) => {
      if (goalTypeFilter !== "all" && g.period_type !== goalTypeFilter) return false;
      if (goalStatusFilter !== "all" && g.status !== goalStatusFilter) return false;
      return true;
    });
  }, [enrichedGoals, goalTypeFilter, goalStatusFilter]);

  const sortedServices = useMemo(() => {
    const rows = [...(rankingsData?.services ?? [])];
    rows.sort((a, b) =>
      rankingMetric === "revenue" ? b.revenue - a.revenue : b.quantity - a.quantity
    );
    return rows.map((r, i) => ({
      ...r,
      displayRank: i + 1,
      rank_delta:
        rankingMetric === "revenue" ? r.rank_delta_revenue : r.rank_delta_quantity,
    }));
  }, [rankingsData?.services, rankingMetric]);

  const sortedProfessionals = useMemo(() => {
    const rows = [...(rankingsData?.professionals ?? [])];
    rows.sort((a, b) =>
      rankingMetric === "revenue" ? b.revenue - a.revenue : b.quantity - a.quantity
    );
    return rows.map((r, i) => ({
      ...r,
      displayRank: i + 1,
      rank_delta:
        rankingMetric === "revenue" ? r.rank_delta_revenue : r.rank_delta_quantity,
    }));
  }, [rankingsData?.professionals, rankingMetric]);

  const invalidateGoals = () => {
    void queryClient.invalidateQueries({ queryKey: ["performance-goals-block", companyId] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-performance", companyId] });
    void queryClient.invalidateQueries({ queryKey: ["performance-indicators", companyId] });
  };

  const saveStoredMutation = useMutation({
    mutationFn: async () => {
      const target = Number(String(goalForm.target_value).replace(",", "."));
      const payload = {
        name: goalForm.name.trim(),
        period_type: goalForm.period_type,
        metric: goalForm.metric,
        target_value: target,
        custom_start: goalForm.period_type === "custom" ? goalForm.custom_start : null,
        custom_end: goalForm.period_type === "custom" ? goalForm.custom_end : null,
      };

      if (editingGoal) {
        const { data, error } = await performanceService.updateGoal(
          companyId,
          editingGoal.id,
          payload,
          { expectedUpdatedAt: editingGoal.updated_at ?? null }
        );
        if (error) throw error;
        if (!data) throw new Error("Não foi possível salvar a meta.");
      } else {
        const { data, error } = await performanceService.createGoal(companyId, payload);
        if (error) throw error;
        if (!data) throw new Error("Não foi possível criar a meta.");
      }
    },
    onSuccess: () => {
      invalidateGoals();
      toast.success(editingGoal ? "Meta atualizada." : "Meta criada.");
      setGoalDialogOpen(false);
      setEditingGoal(null);
      setGoalForm(emptyGoalForm);
    },
    onError: (e: Error) => toast.error(e.message ?? "Não foi possível salvar."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { ok, error } = await performanceService.deleteGoal(companyId, id);
      if (error) throw error;
      if (!ok) throw new Error("Meta não encontrada.");
    },
    onSuccess: () => {
      invalidateGoals();
      toast.success("Meta removida.");
      setDeleteId(null);
    },
    onError: () => toast.error("Não foi possível remover a meta."),
  });

  const savePrimaryMutation = useMutation({
    mutationFn: async () => {
      const parsed = Number(primaryAmount.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Valor de meta inválido.");
      if (primaryPeriod === "custom") {
        if (!primaryStart || !primaryEnd) throw new Error("Informe início e fim da meta personalizada.");
        if (primaryStart > primaryEnd) throw new Error("Período inválido.");
      }
      const { data, error } = await companyService.update(companyId, {
        revenue_goal_amount: parsed,
        revenue_goal_period: primaryPeriod,
        revenue_goal_custom_start_date: primaryPeriod === "custom" ? primaryStart : null,
        revenue_goal_custom_end_date: primaryPeriod === "custom" ? primaryEnd : null,
      });
      if (error) throw error;
      if (data) setCurrentCompany(data);
    },
    onSuccess: () => {
      invalidateGoals();
      toast.success("Meta de faturamento da empresa atualizada.");
      setPrimaryDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao salvar."),
  });

  const openCreateGoal = () => {
    setEditingGoal(null);
    setGoalForm(emptyGoalForm);
    setGoalDialogOpen(true);
  };

  const openEditGoal = (g: PerformanceGoalWithProgress) => {
    setEditingGoal(g);
    setGoalForm({
      name: g.name,
      period_type: g.period_type,
      metric: g.metric,
      target_value: String(g.target_value),
      custom_start: g.custom_start ?? "",
      custom_end: g.custom_end ?? "",
    });
    setGoalDialogOpen(true);
  };

  const openPrimaryDialog = () => {
    const amount = Number(currentCompany?.revenue_goal_amount ?? 0);
    setPrimaryAmount(amount > 0 ? amount.toFixed(2) : "");
    setPrimaryPeriod((currentCompany?.revenue_goal_period as PerformanceGoalPeriodType) ?? "weekly");
    setPrimaryStart(currentCompany?.revenue_goal_custom_start_date ?? "");
    setPrimaryEnd(currentCompany?.revenue_goal_custom_end_date ?? "");
    setPrimaryDialogOpen(true);
  };

  const primaryGoal = performance?.goal;
  const primaryBarClass =
    primaryGoal?.status === "success"
      ? "bg-emerald-500"
      : primaryGoal?.status === "warning"
        ? "bg-amber-500"
        : "bg-destructive";

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground md:max-w-xl">
          Indicadores, metas extras e rankings usam o mesmo período selecionado na barra abaixo.
        </p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled title="Exportação em breve">
            <Download className="mr-1.5 size-4 opacity-60" aria-hidden />
            Exportar
          </Button>
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link to="/app">Voltar ao resumo</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-2 py-2 sm:px-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div
            className="flex min-h-[40px] min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:gap-2 md:pb-0"
            role="tablist"
            aria-label="Período global"
          >
            {PERIOD_FILTERS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={periodPreset === p.id ? "default" : "outline"}
                className="shrink-0"
                onClick={() => {
                  setPeriodPreset(p.id);
                  if (p.id === "custom" && !customRange.startDate) {
                    setCustomRange(defaultCustomRange());
                  }
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {periodPreset === "custom" ? (
            <div className="flex shrink-0 flex-wrap items-end gap-2 border-t border-border/50 pt-3 md:border-t-0 md:pt-0">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input
                  type="date"
                  value={customRange.startDate}
                  onChange={(e) => setCustomRange((c) => ({ ...c, startDate: e.target.value }))}
                  className="h-9 w-[11rem] bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  type="date"
                  value={customRange.endDate}
                  onChange={(e) => setCustomRange((c) => ({ ...c, endDate: e.target.value }))}
                  className="h-9 w-[11rem] bg-background"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="perf-indicadores-heading">
        <div>
          <h2 id="perf-indicadores-heading" className="text-lg font-semibold tracking-tight">
            Indicadores
          </h2>
          <p className="text-sm text-muted-foreground">
            Leitura rápida do período selecionado e da evolução em relação ao intervalo anterior de mesma
            duração.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <IndicatorCard
            title="Faturamento total"
            icon={DollarSign}
            value={indicators?.revenue.value ?? 0}
            changePct={indicators?.revenue.changePct ?? 0}
            formatValue={formatCurrency}
            loading={indicatorsLoading}
          />
          <IndicatorCard
            title="Atendimentos concluídos"
            icon={Calendar}
            value={indicators?.appointments.value ?? 0}
            changePct={indicators?.appointments.changePct ?? 0}
            formatValue={(n) => String(Math.round(n))}
            loading={indicatorsLoading}
          />
          <IndicatorCard
            title="Ticket médio"
            icon={TrendingUp}
            value={indicators?.averageTicket.value ?? 0}
            changePct={indicators?.averageTicket.changePct ?? 0}
            formatValue={formatCurrency}
            loading={indicatorsLoading}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-5" aria-labelledby="metas-heading">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 id="metas-heading" className="text-lg font-semibold tracking-tight">
              Metas
            </h2>
            <p className="text-sm text-muted-foreground">
              Meta principal da empresa e metas extras — estas últimas ficam salvas neste navegador até
              existir API dedicada.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Tipo</Label>
              <Select
                value={goalTypeFilter}
                onValueChange={(v) => setGoalTypeFilter(v as PerformanceGoalPeriodType | "all")}
              >
                <SelectTrigger className="h-9 w-[min(100%,11rem)] sm:w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(Object.keys(GOAL_PERIOD_LABELS) as PerformanceGoalPeriodType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {GOAL_PERIOD_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Status</Label>
              <Select
                value={goalStatusFilter}
                onValueChange={(v) => setGoalStatusFilter(v as PerformanceGoalStatus | "all")}
              >
                <SelectTrigger className="h-9 w-[min(100%,12rem)] sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(Object.keys(STATUS_LABELS) as PerformanceGoalStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {STATUS_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" size="sm" className="w-full sm:w-auto" onClick={openCreateGoal}>
              <Plus className="mr-1.5 size-4" aria-hidden />
              Criar nova meta
            </Button>
          </div>
        </div>

        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="size-4 text-primary shrink-0" aria-hidden />
                Meta principal (empresa)
              </CardTitle>
              <CardDescription>
                Usa a meta de faturamento cadastrada na empresa. O progresso segue o período da meta
                (diária, semanal, etc.), não só o filtro acima.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={openPrimaryDialog}>
              <Pencil className="mr-1.5 size-4" aria-hidden />
              Configurar
            </Button>
          </CardHeader>
          <CardContent>
            {performanceLoading || !primaryGoal ? (
              <p className="text-sm text-muted-foreground py-6">Carregando meta principal…</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="secondary">
                      Tipo: {GOAL_PERIOD_LABELS[primaryGoal.goalType as PerformanceGoalPeriodType] ?? "—"}
                    </Badge>
                    <Badge className={cn(STATUS_BADGE[mapPrimaryGoalStatus(primaryGoal.status)])}>
                      {STATUS_LABELS[mapPrimaryGoalStatus(primaryGoal.status)]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground text-xs">Valor alvo</p>
                      <p className="font-semibold">{formatCurrency(primaryGoal.goalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Valor atual</p>
                      <p className="font-semibold">{formatCurrency(primaryGoal.currentRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Progresso</p>
                      <p className="font-semibold">{primaryGoal.percent.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className={cn("h-2 rounded-full overflow-hidden bg-muted")}>
                    <div
                      className={cn("h-full transition-all", primaryBarClass)}
                      style={{ width: `${primaryGoal.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Metas adicionais</h3>
          {goalsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : filteredExtraGoals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12 px-4 text-center">
                <p className="text-sm text-muted-foreground max-w-md">
                  {enrichedGoals.length === 0
                    ? "Você ainda não criou metas extras. Use para acompanhar ticket médio, volume de atendimentos ou outros focos além da meta principal."
                    : "Nenhuma meta corresponde aos filtros de tipo ou status. Ajuste os filtros ou crie uma nova meta."}
                </p>
                <Button type="button" size="sm" onClick={openCreateGoal}>
                  <Plus className="mr-1.5 size-4" aria-hidden />
                  Criar nova meta
                </Button>
              </CardContent>
            </Card>
          ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredExtraGoals.map((g) => (
              <Card key={g.id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{g.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {GOAL_METRIC_LABELS[g.metric]} · período {GOAL_PERIOD_LABELS[g.period_type]}
                    </CardDescription>
                  </div>
                  <Badge className={cn("shrink-0", STATUS_BADGE[g.status])}>{STATUS_LABELS[g.status]}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Alvo</p>
                      <p className="font-medium">{formatMetricValue(g.metric, g.target_value)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Atual</p>
                      <p className="font-medium">{formatMetricValue(g.metric, g.current_value)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progresso</span>
                      <span>{g.progress_percent.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(100, g.progress_percent)} className="h-2" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEditGoal(g)}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(g.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </section>

      <Separator />

      <section className="space-y-4" aria-labelledby="rankings-heading">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="rankings-heading" className="text-lg font-semibold tracking-tight">
              Rankings
            </h2>
            <p className="text-sm text-muted-foreground">
              Mesmo período da barra acima. A coluna “Variação” compara sua posição com o período
              anterior (subiu ou desceu), conforme a métrica ativa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={rankingMetric === "revenue" ? "default" : "outline"}
              onClick={() => setRankingMetric("revenue")}
            >
              Faturamento
            </Button>
            <Button
              type="button"
              size="sm"
              variant={rankingMetric === "quantity" ? "default" : "outline"}
              onClick={() => setRankingMetric("quantity")}
            >
              Quantidade
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking de serviços</CardTitle>
              <CardDescription>Top performers por serviço no período.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {rankingsLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
              ) : sortedServices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-right">
                        {rankingMetric === "revenue" ? "Faturamento" : "Atendimentos"}
                      </TableHead>
                      <TableHead className="w-28">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedServices.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.displayRank}</TableCell>
                        <TableCell className="font-medium truncate max-w-[140px]">{row.name}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {rankingMetric === "revenue"
                            ? formatCurrency(row.revenue)
                            : row.quantity}
                        </TableCell>
                        <TableCell>
                          <RankDelta delta={row.rank_delta} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking de profissionais</CardTitle>
              <CardDescription>Equipe ordenada pelo desempenho no período.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {rankingsLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
              ) : sortedProfessionals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-right">
                        {rankingMetric === "revenue" ? "Faturamento" : "Atendimentos"}
                      </TableHead>
                      <TableHead className="w-28">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProfessionals.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.displayRank}</TableCell>
                        <TableCell className="font-medium truncate max-w-[140px]">{row.name}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {rankingMetric === "revenue"
                            ? formatCurrency(row.revenue)
                            : row.quantity}
                        </TableCell>
                        <TableCell>
                          <RankDelta delta={row.rank_delta} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Editar meta" : "Nova meta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="goal-name">Nome</Label>
              <Input
                id="goal-name"
                value={goalForm.name}
                onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Ticket médio — pacote premium"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={goalForm.period_type}
                  onValueChange={(v) =>
                    setGoalForm((f) => ({ ...f, period_type: v as PerformanceGoalPeriodType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GOAL_PERIOD_LABELS) as PerformanceGoalPeriodType[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {GOAL_PERIOD_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Métrica</Label>
                <Select
                  value={goalForm.metric}
                  onValueChange={(v) => setGoalForm((f) => ({ ...f, metric: v as PerformanceGoalMetric }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GOAL_METRIC_LABELS) as PerformanceGoalMetric[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {GOAL_METRIC_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="goal-target">Valor alvo no período do filtro</Label>
              <Input
                id="goal-target"
                inputMode="decimal"
                value={goalForm.target_value}
                onChange={(e) => setGoalForm((f) => ({ ...f, target_value: e.target.value }))}
                placeholder="0,00"
              />
              <p className="text-[11px] text-muted-foreground">
                Em produção, metas e limites devem ser validados na API.
              </p>
            </div>
            {goalForm.period_type === "custom" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Início (meta)</Label>
                  <Input
                    type="date"
                    value={goalForm.custom_start}
                    onChange={(e) => setGoalForm((f) => ({ ...f, custom_start: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Fim (meta)</Label>
                  <Input
                    type="date"
                    value={goalForm.custom_end}
                    onChange={(e) => setGoalForm((f) => ({ ...f, custom_end: e.target.value }))}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGoalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => saveStoredMutation.mutate()} disabled={saveStoredMutation.isPending}>
              {saveStoredMutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={primaryDialogOpen} onOpenChange={setPrimaryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Meta de faturamento da empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="primary-amt">Valor alvo</Label>
              <Input
                id="primary-amt"
                inputMode="decimal"
                value={primaryAmount}
                onChange={(e) => setPrimaryAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Período da meta</Label>
              <Select
                value={primaryPeriod}
                onValueChange={(v) => setPrimaryPeriod(v as PerformanceGoalPeriodType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(GOAL_PERIOD_LABELS) as PerformanceGoalPeriodType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {GOAL_PERIOD_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {primaryPeriod === "custom" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Início</Label>
                  <Input type="date" value={primaryStart} onChange={(e) => setPrimaryStart(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Fim</Label>
                  <Input type="date" value={primaryEnd} onChange={(e) => setPrimaryEnd(e.target.value)} />
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPrimaryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => savePrimaryMutation.mutate()}
              disabled={savePrimaryMutation.isPending}
            >
              {savePrimaryMutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover meta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AppPerformance;
