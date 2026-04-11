import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenant } from "@/contexts/TenantContext";
import { paymentService } from "@/services/payment.service";
import { serviceService } from "@/services/service.service";
import type { ProfessionalWithPayment } from "@/services/payment.service";
import type { MonthPreview } from "@/services/payment.service";
import { Pencil, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const AppPayments = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalWithPayment | null>(null);
  const currentMonth = format(new Date(), "yyyy-MM");

  const { data: professionalsData, isLoading } = useQuery({
    queryKey: ["payment-professionals", companyId, currentMonth],
    queryFn: () => paymentService.listProfessionalsWithCurrentMonthPreview(companyId, currentMonth),
    enabled: !!companyId,
  });

  const professionals = professionalsData?.data ?? [];

  const openConfig = (p: ProfessionalWithPayment & MonthPreview) => {
    setSelectedProfessional(p);
    setConfigModalOpen(true);
  };

  const openMonthly = (p: ProfessionalWithPayment & MonthPreview) => {
    setSelectedProfessional(p);
    setMonthlyModalOpen(true);
  };

  return (
    <>
      <PageContainer>
        <div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : professionals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum profissional ativo. Cadastre profissionais em Profissionais para configurar
              pagamentos.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {professionals.map((p) => (
                <Card key={p.professional_id} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <h3 className="font-semibold text-lg truncate">{p.professional_name}</h3>
                      <Badge variant={p.fechado ? "secondary" : "default"}>
                        {p.fechado ? "Fechado" : "Aberto"}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Salário fixo</span>
                        <span>{formatCurrency(p.salario_fixo_mensal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Comissão padrão</span>
                        <span>{p.percentual_comissao_padrao}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Faturamento do mês</span>
                        <span>{formatCurrency(p.total_faturado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Atendimentos no mês</span>
                        <span>{p.atendimentos_count ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ticket médio</span>
                        <span>
                          {formatCurrency(
                            (p.atendimentos_count ?? 0) > 0
                              ? p.total_faturado / (p.atendimentos_count ?? 1)
                              : 0
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Comissão gerada</span>
                        <span className="text-green-600 dark:text-green-400">
                          {formatCurrency(p.total_comissao_excedente ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Valor estimado</span>
                        <span>{formatCurrency(p.valor_final)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openConfig(p)}
                      >
                        <Pencil size={14} className="mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openMonthly(p)}
                      >
                        <Calendar size={14} className="mr-1" />
                        Ver mês
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      {selectedProfessional && (
        <PaymentConfigModal
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
          companyId={companyId}
          professional={selectedProfessional}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["payment-professionals"] });
          }}
        />
      )}

      {selectedProfessional && (
        <PaymentMonthlyModal
          open={monthlyModalOpen}
          onOpenChange={setMonthlyModalOpen}
          companyId={companyId}
          professional={selectedProfessional}
          onClosed={() => {
            queryClient.invalidateQueries({ queryKey: ["payment-professionals"] });
          }}
        />
      )}
    </>
  );
};

interface PaymentConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  professional: ProfessionalWithPayment;
  onSaved: () => void;
}

function PaymentConfigModal({
  open,
  onOpenChange,
  companyId,
  professional,
  onSaved,
}: PaymentConfigModalProps) {
  const queryClient = useQueryClient();
  const [salarioFixo, setSalarioFixo] = useState(String(professional.salario_fixo_mensal));
  const [comissaoPadrao, setComissaoPadrao] = useState(
    String(professional.percentual_comissao_padrao)
  );
  const [fechamentoDia, setFechamentoDia] = useState(String(professional.fechamento_dia));
  const [ativo, setAtivo] = useState(professional.ativo);
  const [newServiceId, setNewServiceId] = useState("");
  const [newServicePercent, setNewServicePercent] = useState("");

  const { data: serviceCommissions } = useQuery({
    queryKey: ["payment-service-commissions", companyId, professional.professional_id],
    queryFn: () => paymentService.listServiceCommissions(companyId, professional.professional_id),
    enabled: open && !!companyId,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services", companyId],
    queryFn: () => serviceService.listByCompany(companyId),
    enabled: open && !!companyId,
  });

  const services = servicesData?.data ?? [];
  const customCommissions = serviceCommissions?.data ?? [];
  const usedServiceIds = new Set(customCommissions.map((c) => c.service_id));
  const availableServices = services.filter((s) => !usedServiceIds.has(s.id));

  const saveMutation = useMutation({
    mutationFn: async () => {
      await paymentService.updateSettings(companyId, professional.professional_id, {
        salario_fixo_mensal: parseFloat(salarioFixo) || 0,
        percentual_comissao_padrao: parseFloat(comissaoPadrao) || 20,
        fechamento_dia: parseInt(fechamentoDia, 10) || 30,
        ativo,
      });
    },
    onSuccess: () => {
      toast.success("Configuração salva!");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar."),
  });

  const addServiceMutation = useMutation({
    mutationFn: async () => {
      const pct = parseFloat(newServicePercent);
      if (!newServiceId || isNaN(pct) || pct < 0 || pct > 100) {
        throw new Error("Selecione um serviço e informe um percentual válido (0-100).");
      }
      await paymentService.setServiceCommission(
        companyId,
        professional.professional_id,
        newServiceId,
        pct
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payment-service-commissions", companyId, professional.professional_id],
      });
      setNewServiceId("");
      setNewServicePercent("");
      toast.success("Comissão personalizada adicionada!");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao adicionar."),
  });

  const removeServiceMutation = useMutation({
    mutationFn: (serviceId: string) =>
      paymentService.removeServiceCommission(companyId, professional.professional_id, serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payment-service-commissions", companyId, professional.professional_id],
      });
      toast.success("Comissão removida.");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao remover."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar pagamento — {professional.professional_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Salário fixo mensal (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={salarioFixo}
                onChange={(e) => setSalarioFixo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Percentual de comissão (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={comissaoPadrao}
                onChange={(e) => setComissaoPadrao(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Dia de fechamento (1-31)</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={fechamentoDia}
              onChange={(e) => setFechamentoDia(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            <Label htmlFor="ativo">Pagamento ativo</Label>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Comissão personalizada por serviço</h4>
            {customCommissions.length > 0 ? (
              <div className="space-y-2 mb-3">
                {customCommissions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                  >
                    <span>{c.service_name}</span>
                    <div className="flex items-center gap-2">
                      <span>{c.percentual}%</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeServiceMutation.mutate(c.service_id)}
                        disabled={removeServiceMutation.isPending}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {availableServices.length > 0 && (
              <div className="flex gap-2">
                <Select value={newServiceId} onValueChange={setNewServiceId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServices.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  placeholder="%"
                  value={newServicePercent}
                  onChange={(e) => setNewServicePercent(e.target.value)}
                  className="w-20"
                />
                <Button
                  size="sm"
                  onClick={() => addServiceMutation.mutate()}
                  disabled={addServiceMutation.isPending}
                >
                  Adicionar
                </Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentMonthlyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  professional: ProfessionalWithPayment;
  onClosed: () => void;
}

function PaymentMonthlyModal({
  open,
  onOpenChange,
  companyId,
  professional,
  onClosed,
}: PaymentMonthlyModalProps) {
  const queryClient = useQueryClient();
  const today = new Date();
  const [monthKey, setMonthKey] = useState(format(today, "yyyy-MM"));

  const { data: summary, isLoading } = useQuery({
    queryKey: ["payment-monthly", companyId, professional.professional_id, monthKey],
    queryFn: () => paymentService.getMonthlySummary(companyId, professional.professional_id, monthKey),
    enabled: open && !!companyId,
  });

  const closeMonthMutation = useMutation({
    mutationFn: () => paymentService.closeMonth(companyId, professional.professional_id, monthKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payment-monthly", companyId, professional.professional_id],
      });
      toast.success("Mês fechado!");
      onClosed();
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao fechar mês."),
  });

  const s = summary?.data;
  const monthLabel = monthKey
    ? format(parseISO(monthKey + "-01"), "MMMM 'de' yyyy", { locale: ptBR })
    : "";

  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(today, i);
    months.push(format(d, "yyyy-MM"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Painel mensal — {professional.professional_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Selecionar mês</Label>
            <Select value={monthKey} onValueChange={setMonthKey}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {format(parseISO(m + "-01"), "MMMM 'de' yyyy", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando...</div>
          ) : s ? (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total faturado</span>
                <span className="font-medium">{formatCurrency(s.total_faturado)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ponto de equilíbrio</span>
                <span className="font-medium">{formatCurrency(s.ponto_equilibrio)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Excedente</span>
                <span className="font-medium">{formatCurrency(s.excedente)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Comissão sobre excedente</span>
                <span className="font-medium">{formatCurrency(s.total_comissao_excedente)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Salário fixo</span>
                <span className="font-medium">{formatCurrency(s.salario_fixo)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-medium">Valor final a pagar</span>
                <span className="font-bold text-lg">{formatCurrency(s.valor_final)}</span>
              </div>
              {s.fechado ? (
                <Badge className="w-full justify-center py-2">Mês fechado</Badge>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => closeMonthMutation.mutate()}
                  disabled={closeMonthMutation.isPending}
                >
                  {closeMonthMutation.isPending ? "Fechando..." : "Fechar mês"}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AppPayments;
