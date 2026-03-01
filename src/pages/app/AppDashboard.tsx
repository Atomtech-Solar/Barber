import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CardWidget from "@/components/shared/CardWidget";
import { DollarSign, Users, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTenant } from "@/contexts/TenantContext";
import { dashboardService, getDashboardRange, type DashboardRangeKey } from "@/services/dashboard.service";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { companyService } from "@/services/company.service";
import { toast } from "sonner";

const FILTERS: { id: DashboardRangeKey; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "month", label: "Este mês" },
];

const STATUS_LABELS: Record<string, string> = {
  completed: "Concluído",
  confirmed: "Confirmado",
  pending: "Pendente",
  cancelled: "Cancelado",
  blocked: "Bloqueado",
  no_show: "Não compareceu",
};

const GOAL_LABELS: Record<"daily" | "weekly" | "monthly" | "custom", string> = {
  daily: "diária",
  weekly: "semanal",
  monthly: "mensal",
  custom: "personalizada",
};

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

type RankingItem = {
  id: string;
  name: string;
  appointments: number;
  revenue: number;
};

function PerformanceRankingCard({
  title,
  emptyMessage,
  rows,
}: {
  title: string;
  emptyMessage: string;
  rows: RankingItem[];
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  #{idx + 1} {row.name}
                </p>
                <p className="text-xs text-muted-foreground">{row.appointments} atendimentos</p>
              </div>
              <p className="text-sm font-semibold whitespace-nowrap">{formatCurrency(row.revenue)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const AppDashboard = () => {
  const { currentCompany, setCurrentCompany } = useTenant();
  const queryClient = useQueryClient();
  const companyId = currentCompany?.id ?? "";
  const [rangeKey, setRangeKey] = useState<DashboardRangeKey>("7d");
  const range = useMemo(() => getDashboardRange(rangeKey), [rangeKey]);
  const [goalAmountInput, setGoalAmountInput] = useState("");
  const [goalPeriodInput, setGoalPeriodInput] = useState<"daily" | "weekly" | "monthly" | "custom">("weekly");
  const [goalCustomStartInput, setGoalCustomStartInput] = useState("");
  const [goalCustomEndInput, setGoalCustomEndInput] = useState("");

  const { data: summaryRes, isLoading: summaryLoading, isError: summaryError } = useQuery({
    queryKey: ["dashboard-summary", companyId, range],
    queryFn: () => dashboardService.getSummary(companyId, range),
    enabled: !!companyId,
  });

  const { data: revenueRes, isLoading: revenueLoading } = useQuery({
    queryKey: ["dashboard-revenue", companyId, range],
    queryFn: () => dashboardService.getRevenue(companyId, range),
    enabled: !!companyId && !!summaryRes,
  });

  const { data: servicesRes, isLoading: servicesLoading } = useQuery({
    queryKey: ["dashboard-services", companyId, range],
    queryFn: () => dashboardService.getTopServices(companyId, range),
    enabled: !!companyId && !!summaryRes,
  });

  const { data: activityRes, isLoading: activityLoading } = useQuery({
    queryKey: ["dashboard-activity", companyId, range],
    queryFn: () => dashboardService.getRecentActivity(companyId, range),
    enabled: !!companyId,
  });

  const { data: performanceRes, isLoading: performanceLoading } = useQuery({
    queryKey: ["dashboard-performance", companyId, range, rangeKey],
    queryFn: () => dashboardService.getBusinessPerformance(companyId, range),
    enabled: !!companyId,
  });

  const summary = summaryRes?.data ?? {
    revenue: 0,
    appointments: 0,
    clientsServed: 0,
    averageTicket: 0,
    growthPercent: 0,
  };
  const revenue = revenueRes?.data ?? [];
  const topServices = servicesRes?.data ?? [];
  const activity = activityRes?.data ?? [];
  const performance = performanceRes?.data ?? {
    goal: {
      goalType: "weekly" as const,
      goalAmount: 0,
      currentRevenue: 0,
      percent: 0,
      progressPercent: 0,
      status: "danger" as const,
    },
    topServices: [],
    topProfessionals: [],
  };

  const growthUp = summary.growthPercent >= 0;
  const growthLabel = `${growthUp ? "+" : ""}${summary.growthPercent.toFixed(1)}%`;
  const goalStatusClass =
    performance.goal.status === "success"
      ? "bg-emerald-500"
      : performance.goal.status === "warning"
      ? "bg-yellow-500"
      : "bg-destructive";
  const goalTextClass =
    performance.goal.status === "success"
      ? "text-emerald-600"
      : performance.goal.status === "warning"
      ? "text-yellow-600"
      : "text-destructive";

  useEffect(() => {
    if (!currentCompany) return;
    const amount = Number(currentCompany.revenue_goal_amount ?? 0);
    setGoalAmountInput(amount > 0 ? amount.toFixed(2) : "");
    setGoalPeriodInput(currentCompany.revenue_goal_period ?? "weekly");
    setGoalCustomStartInput(currentCompany.revenue_goal_custom_start_date ?? "");
    setGoalCustomEndInput(currentCompany.revenue_goal_custom_end_date ?? "");
  }, [currentCompany]);

  const saveGoalMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      const parsedAmount = Number(goalAmountInput.replace(",", "."));
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Informe um valor de meta válido maior que zero.");
      }

      if (goalPeriodInput === "custom") {
        if (!goalCustomStartInput || !goalCustomEndInput) {
          throw new Error("Informe data de início e término para a meta personalizada.");
        }
        if (goalCustomStartInput > goalCustomEndInput) {
          throw new Error("A data de início da meta deve ser menor ou igual à data de término.");
        }
      }

      const { data, error } = await companyService.update(companyId, {
        revenue_goal_amount: parsedAmount,
        revenue_goal_period: goalPeriodInput,
        revenue_goal_custom_start_date: goalPeriodInput === "custom" ? goalCustomStartInput : null,
        revenue_goal_custom_end_date: goalPeriodInput === "custom" ? goalCustomEndInput : null,
      });
      if (error) throw error;
      if (data) setCurrentCompany(data);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard-performance", companyId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary", companyId] }),
      ]);
      toast.success("Meta de faturamento atualizada.");
    },
    onError: (error) => {
      const fallback = "Não foi possível salvar a meta de faturamento.";
      const message = error instanceof Error ? error.message : fallback;
      toast.error(message);
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Central estratégica do negócio</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              variant={rangeKey === f.id ? "default" : "outline"}
              size="sm"
              onClick={() => setRangeKey(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {summaryError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          Erro ao carregar dados do dashboard. Tente novamente em instantes.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {summaryLoading ? (
          Array.from({ length: 5 }).map((_, idx) => <Skeleton key={idx} className="h-28 rounded-xl" />)
        ) : (
          <>
            <CardWidget
              title="Faturamento"
              value={formatCurrency(summary.revenue)}
              icon={DollarSign}
              change={`${growthLabel} vs período anterior`}
              trend={growthUp ? "up" : "down"}
            />
            <CardWidget
              title="Agendamentos"
              value={String(summary.appointments)}
              icon={Calendar}
              change={`${growthLabel} vs período anterior`}
              trend={growthUp ? "up" : "down"}
            />
            <CardWidget
              title="Clientes Atendidos"
              value={String(summary.clientsServed)}
              icon={Users}
              change={`${growthLabel} vs período anterior`}
              trend={growthUp ? "up" : "down"}
            />
            <CardWidget
              title="Ticket Médio"
              value={formatCurrency(summary.averageTicket)}
              icon={TrendingUp}
              change={`${growthLabel} vs período anterior`}
              trend={growthUp ? "up" : "down"}
            />
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Crescimento</span>
                {growthUp ? (
                  <ArrowUpRight size={18} className="text-success" />
                ) : (
                  <ArrowDownRight size={18} className="text-destructive" />
                )}
              </div>
              <p className={`text-2xl font-bold ${growthUp ? "text-success" : "text-destructive"}`}>
                {growthLabel}
              </p>
              <p className="text-xs mt-1 text-muted-foreground">Comparado ao período anterior</p>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Performance do Negócio</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe metas e os principais motores de faturamento da empresa.
          </p>
        </div>

        {performanceLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold mb-4">Meta de Faturamento</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta {GOAL_LABELS[performance.goal.goalType]}</span>
                  <span className="font-medium">{formatCurrency(performance.goal.goalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Faturamento atual</span>
                  <span className="font-medium">{formatCurrency(performance.goal.currentRevenue)}</span>
                </div>

                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${goalStatusClass}`}
                    style={{ width: `${performance.goal.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className={`text-2xl font-bold ${goalTextClass}`}>{performance.goal.percent.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">atingido</p>
                </div>

                <div className="pt-2 border-t border-border space-y-2">
                  <p className="text-xs text-muted-foreground">Configurar meta</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={goalPeriodInput === "daily" ? "default" : "outline"}
                      onClick={() => setGoalPeriodInput("daily")}
                      disabled={saveGoalMutation.isPending}
                      className="w-full"
                    >
                      Diária
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={goalPeriodInput === "weekly" ? "default" : "outline"}
                      onClick={() => setGoalPeriodInput("weekly")}
                      disabled={saveGoalMutation.isPending}
                      className="w-full"
                    >
                      Semanal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={goalPeriodInput === "monthly" ? "default" : "outline"}
                      onClick={() => setGoalPeriodInput("monthly")}
                      disabled={saveGoalMutation.isPending}
                      className="w-full"
                    >
                      Mensal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={goalPeriodInput === "custom" ? "default" : "outline"}
                      onClick={() => setGoalPeriodInput("custom")}
                      disabled={saveGoalMutation.isPending}
                      className="w-full"
                    >
                      Personalizada
                    </Button>
                  </div>
                  {goalPeriodInput === "custom" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={goalCustomStartInput}
                        onChange={(e) => setGoalCustomStartInput(e.target.value)}
                        disabled={saveGoalMutation.isPending}
                      />
                      <Input
                        type="date"
                        value={goalCustomEndInput}
                        onChange={(e) => setGoalCustomEndInput(e.target.value)}
                        disabled={saveGoalMutation.isPending}
                      />
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={goalAmountInput}
                      onChange={(e) => setGoalAmountInput(e.target.value)}
                      placeholder="Valor da meta"
                      disabled={saveGoalMutation.isPending}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveGoalMutation.mutate()}
                      disabled={saveGoalMutation.isPending || !companyId}
                      className="w-full sm:w-auto"
                    >
                      {saveGoalMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <PerformanceRankingCard
              title="Ranking de Serviços"
              emptyMessage="Sem dados de serviços concluídos no período."
              rows={performance.topServices.map((item) => ({
                id: item.serviceId,
                name: item.serviceName,
                appointments: item.appointments,
                revenue: item.revenue,
              }))}
            />

            <PerformanceRankingCard
              title="Ranking de Profissionais"
              emptyMessage="Sem dados de profissionais no período."
              rows={performance.topProfessionals.map((item) => ({
                id: item.professionalId,
                name: item.professionalName,
                appointments: item.appointments,
                revenue: item.revenue,
              }))}
            />
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Faturamento por período</h3>
        {revenueLoading ? (
          <Skeleton className="h-72 w-full rounded-lg" />
        ) : revenue.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            Sem dados de faturamento para o período selecionado.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(v: number) => [formatCurrency(v), "Faturamento"]} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Serviços Mais Vendidos</h3>
          {servicesLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : topServices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sem dados de serviços no período.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topServices}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="serviceName" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip formatter={(v: number) => [v, "Quantidade"]} />
                <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Formas de Pagamento</h3>
          <div className="h-[250px] rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center text-center p-4">
            <div>
              <p className="font-medium">Futuro</p>
              <p className="text-sm text-muted-foreground mt-1">
                A análise de formas de pagamento será implementada em uma próxima etapa.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Atividade Recente</h3>
        {activityLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma atividade recente no período selecionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.time}</TableCell>
                    <TableCell>{row.client}</TableCell>
                    <TableCell>{row.service}</TableCell>
                    <TableCell>{row.professional}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                    <TableCell>{STATUS_LABELS[row.status] ?? row.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppDashboard;
