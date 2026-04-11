import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import CardWidget from "@/components/shared/CardWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Scissors,
  XCircle,
  Percent,
  Download,
  Package,
  Wallet,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { reportsService } from "@/services/reports.service";
import { professionalService } from "@/services/professional.service";
import { serviceService } from "@/services/service.service";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const QUICK_FILTERS = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "this_month", label: "Este mês" },
  { id: "last_month", label: "Mês passado" },
  { id: "custom", label: "Personalizado" },
] as const;

function getDateRange(filterId: string): { start: string; end: string } {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  switch (filterId) {
    case "today":
      return { start: todayStr, end: todayStr };
    case "7d":
      return {
        start: format(subDays(today, 6), "yyyy-MM-dd"),
        end: todayStr,
      };
    case "30d":
      return {
        start: format(subDays(today, 29), "yyyy-MM-dd"),
        end: todayStr,
      };
    case "this_month":
      return {
        start: format(startOfMonth(today), "yyyy-MM-dd"),
        end: format(endOfMonth(today), "yyyy-MM-dd"),
      };
    case "last_month":
      const last = subMonths(today, 1);
      return {
        start: format(startOfMonth(last), "yyyy-MM-dd"),
        end: format(endOfMonth(last), "yyyy-MM-dd"),
      };
    default:
      return {
        start: format(subDays(today, 29), "yyyy-MM-dd"),
        end: todayStr,
      };
  }
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendente",
  completed: "Concluído",
  cancelled: "Cancelado",
  blocked: "Bloqueado",
  no_show: "Não compareceu",
};

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

const AppReports = () => {
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";
  const companyName = currentCompany?.name ?? "Empresa";

  const [quickFilter, setQuickFilter] = useState<string>("30d");
  const [startDate, setStartDate] = useState(() =>
    format(subDays(new Date(), 29), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const ALL_VALUE = "__all__";
  const [professionalId, setProfessionalId] = useState<string>(ALL_VALUE);
  const [serviceId, setServiceId] = useState<string>(ALL_VALUE);
  const [page, setPage] = useState(0);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const toFilterId = (v: string) => (v && v !== "__all__" ? v : undefined);
  const filters = useMemo(() => {
    if (quickFilter === "custom") {
      return { startDate, endDate, professionalId: toFilterId(professionalId), serviceId: toFilterId(serviceId) };
    }
    const { start, end } = getDateRange(quickFilter);
    return {
      startDate: start,
      endDate: end,
      professionalId: toFilterId(professionalId),
      serviceId: toFilterId(serviceId),
    };
  }, [quickFilter, startDate, endDate, professionalId, serviceId]);

  const { data: professionalsData } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: () => professionalService.listByCompany(companyId),
    enabled: !!companyId,
  });
  const { data: servicesData } = useQuery({
    queryKey: ["services", companyId],
    queryFn: () => serviceService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const professionals = professionalsData?.data ?? [];
  const services = servicesData?.data ?? [];

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["reports-metrics", companyId, filters],
    queryFn: () => reportsService.getMetrics(companyId, filters),
    enabled: !!companyId,
  });

  const { data: faturamentoData, isLoading: fatLoading } = useQuery({
    queryKey: ["reports-faturamento", companyId, filters],
    queryFn: () => reportsService.getFaturamentoPorPeriodo(companyId, filters),
    enabled: !!companyId,
  });

  const { data: servicosData, isLoading: svcLoading } = useQuery({
    queryKey: ["reports-servicos", companyId, filters],
    queryFn: () => reportsService.getServicosMaisVendidos(companyId, filters),
    enabled: !!companyId,
  });

  const { data: produtividadeData, isLoading: prodLoading } = useQuery({
    queryKey: ["reports-produtividade", companyId, filters],
    queryFn: () => reportsService.getProdutividadeProfissionais(companyId, filters),
    enabled: !!companyId,
  });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["reports-status", companyId, filters],
    queryFn: () => reportsService.getStatusDistribuicao(companyId, filters),
    enabled: !!companyId,
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ["reports-table", companyId, filters, page],
    queryFn: () =>
      reportsService.getAppointmentsForTable(companyId, filters, {
        limit: 20,
        offset: page * 20,
      }),
    enabled: !!companyId,
  });

  const { data: rankingData } = useQuery({
    queryKey: ["reports-ranking", companyId, filters],
    queryFn: () => reportsService.getRankingProfissionais(companyId, filters),
    enabled: !!companyId,
  });
  const { data: horariosData } = useQuery({
    queryKey: ["reports-horarios", companyId, filters],
    queryFn: () => reportsService.getHorariosMaisMovimentados(companyId, filters),
    enabled: !!companyId,
  });

  const metrics = metricsData?.data ?? {
    faturamentoTotal: 0,
    faturamentoServicos: 0,
    faturamentoProdutos: 0,
    lucroEstimado: 0,
    totalAgendamentos: 0,
    ticketMedio: 0,
    servicosRealizados: 0,
    cancelamentos: 0,
    taxaConversao: 0,
  };
  const faturamentoPorPeriodo = faturamentoData?.data ?? [];
  const servicosMaisVendidos = servicosData?.data ?? [];
  const rankingProfissionais = rankingData?.data ?? [];
  const horariosMaisMovimentados = horariosData?.data ?? [];
  const produtividade = produtividadeData?.data ?? [];
  const statusDistribuicao = statusData?.data ?? [];
  const tableRows = tableData?.data ?? [];
  const tableTotal = tableData?.total ?? 0;

  const handleQuickFilter = (id: string) => {
    setQuickFilter(id);
    if (id !== "custom") {
      const { start, end } = getDateRange(id);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleExport = async (format: "pdf" | "excel") => {
    // Carrega libs de exportação sob demanda para não pesar o chunk inicial de relatórios
    const { exportReportPDF, exportReportExcel } = await import("@/lib/reportsExport");

    if (format === "pdf") {
      exportReportPDF({
        companyName,
        startDate: filters.startDate,
        endDate: filters.endDate,
        metrics,
        faturamentoPorPeriodo,
        servicosMaisVendidos,
        produtividade,
        statusDistribuicao,
        tableRows,
      });
    } else {
      exportReportExcel({
        companyName,
        startDate: filters.startDate,
        endDate: filters.endDate,
        metrics,
        faturamentoPorPeriodo,
        servicosMaisVendidos,
        produtividade,
        statusDistribuicao,
        tableRows,
      });
    }
    setExportModalOpen(false);
  };

  const hasData =
    metrics.totalAgendamentos > 0 ||
    faturamentoPorPeriodo.length > 0 ||
    servicosMaisVendidos.length > 0 ||
    produtividade.length > 0;

  return (
    <>
      <PageContainer
        actions={
          <Button onClick={() => setExportModalOpen(true)}>
            <Download size={16} className="mr-2" />
            Exportar Relatório
          </Button>
        }
      >
        {/* 1. Filtros */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h3 className="font-semibold mb-4">Filtros</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((f) => (
                <Button
                  key={f.id}
                  variant={quickFilter === f.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickFilter(f.id)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            {quickFilter === "custom" && (
              <div className="flex items-end gap-4">
                <div>
                  <Label className="text-xs">Data inicial</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Data final</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            )}
            <div className="w-48">
              <Label className="text-xs">Funcionário</Label>
              <Select value={professionalId} onValueChange={setProfessionalId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="text-xs">Serviço</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Período: {filters.startDate} a {filters.endDate}
          </p>
        </div>

        {/* 2. Cards de métricas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {metricsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : (
            <>
              <CardWidget
                title="Faturamento serviços"
                value={`R$ ${(metrics.faturamentoServicos ?? 0).toFixed(2)}`}
                icon={Scissors}
              />
              <CardWidget
                title="Faturamento produtos"
                value={`R$ ${(metrics.faturamentoProdutos ?? 0).toFixed(2)}`}
                icon={Package}
              />
              <CardWidget
                title="Faturamento total"
                value={`R$ ${(metrics.faturamentoTotal ?? 0).toFixed(2)}`}
                icon={DollarSign}
              />
              <CardWidget
                title="Lucro estimado"
                value={`R$ ${(metrics.lucroEstimado ?? 0).toFixed(2)}`}
                icon={Wallet}
              />
              <CardWidget
                title="Total agendamentos"
                value={String(metrics.totalAgendamentos)}
                icon={Calendar}
              />
              <CardWidget
                title="Ticket médio"
                value={`R$ ${(metrics.ticketMedio ?? 0).toFixed(2)}`}
                icon={TrendingUp}
              />
            </>
          )}
        </div>

        {!hasData && !metricsLoading && (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground mb-6">
            Nenhum dado encontrado neste período.
          </div>
        )}

        {/* 3. Gráficos */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Faturamento por Período</h3>
              {fatLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : faturamentoPorPeriodo.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={faturamentoPorPeriodo}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Faturamento"]} />
                    <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Horários mais movimentados</h3>
              {horariosMaisMovimentados.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={horariosMaisMovimentados} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip formatter={(v: number) => [v, "Atendimentos"]} />
                    <Bar dataKey="count" fill="#10b981" name="Atendimentos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
              <h3 className="font-semibold mb-4">Status dos Agendamentos</h3>
              {statusLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : statusDistribuicao.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusDistribuicao.map((s, i) => ({
                        ...s,
                        name: STATUS_LABELS[s.status] ?? s.status,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusDistribuicao.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "Quantidade"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* 4. Rankings (tabelas) */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <h3 className="font-semibold p-5 pb-3">Ranking de profissionais</h3>
              <div className="px-5 pb-5">
                {rankingProfissionais.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-6">Sem dados</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead className="text-right">Atendimentos</TableHead>
                        <TableHead className="text-right">Faturamento</TableHead>
                        <TableHead className="text-right">Ticket médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankingProfissionais.map((r) => (
                        <TableRow key={r.professionalId}>
                          <TableCell className="font-medium">{r.professionalName}</TableCell>
                          <TableCell className="text-right">{r.atendimentos}</TableCell>
                          <TableCell className="text-right">R$ {r.faturamentoGerado.toFixed(2)}</TableCell>
                          <TableCell className="text-right">R$ {r.ticketMedio.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <h3 className="font-semibold p-5 pb-3">Serviços mais vendidos</h3>
              <div className="px-5 pb-5">
                {servicosMaisVendidos.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-6">Sem dados</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Faturamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {servicosMaisVendidos.map((s) => (
                        <TableRow key={s.serviceId}>
                          <TableCell className="font-medium">{s.serviceName}</TableCell>
                          <TableCell className="text-right">{s.quantidade}</TableCell>
                          <TableCell className="text-right">
                            R$ {(s.faturamentoGerado ?? 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. Tabela detalhada de agendamentos */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
          <h3 className="font-semibold p-5 pb-0">Tabela detalhada de agendamentos</h3>
          <div className="p-5">
            {tableLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : tableRows.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                Nenhum agendamento no período.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell>{r.clientName}</TableCell>
                        <TableCell>{r.serviceNames}</TableCell>
                        <TableCell>{r.professionalName}</TableCell>
                        <TableCell className="text-right">
                          R$ {r.valor.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell>{STATUS_LABELS[r.status] ?? r.status}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">
                          {r.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {tableTotal > 20 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                      Página {page + 1} de {Math.ceil(tableTotal / 20)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.ceil(tableTotal / 20) - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </PageContainer>

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Relatório</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Exportar relatório do período {filters.startDate} a {filters.endDate}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleExport("pdf")}>Exportar PDF</Button>
            <Button onClick={() => void handleExport("excel")}>Exportar Excel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppReports;
