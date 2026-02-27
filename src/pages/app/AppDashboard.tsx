import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

const AppDashboard = () => {
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";
  const [rangeKey, setRangeKey] = useState<DashboardRangeKey>("7d");
  const range = useMemo(() => getDashboardRange(rangeKey), [rangeKey]);

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

  const growthUp = summary.growthPercent >= 0;
  const growthLabel = `${growthUp ? "+" : ""}${summary.growthPercent.toFixed(1)}%`;

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
