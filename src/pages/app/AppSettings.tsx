import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTenant } from "@/contexts/TenantContext";
import { companyService } from "@/services/company.service";

const DEFAULT_OPENING_TIME = "09:00";
const DEFAULT_CLOSING_TIME = "19:00";

function isThirtyMinuteTime(time: string) {
  const minutes = Number(time.split(":")[1] ?? "0");
  return minutes === 0 || minutes === 30;
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const AppSettings = () => {
  const { currentCompany, setCurrentCompany } = useTenant();
  const [openingTime, setOpeningTime] = useState(DEFAULT_OPENING_TIME);
  const [closingTime, setClosingTime] = useState(DEFAULT_CLOSING_TIME);

  useEffect(() => {
    setOpeningTime((currentCompany?.opening_time ?? DEFAULT_OPENING_TIME).slice(0, 5));
    setClosingTime((currentCompany?.closing_time ?? DEFAULT_CLOSING_TIME).slice(0, 5));
  }, [currentCompany]);

  const saveBusinessHoursMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany) return;

      if (!isThirtyMinuteTime(openingTime) || !isThirtyMinuteTime(closingTime)) {
        throw new Error("Os horários devem seguir intervalos de 30 minutos.");
      }

      if (toMinutes(closingTime) <= toMinutes(openingTime)) {
        throw new Error("O horário de fechamento deve ser maior que o de abertura.");
      }

      const { data, error } = await companyService.update(currentCompany.id, {
        opening_time: openingTime,
        closing_time: closingTime,
      });
      if (error) throw error;
      if (data) setCurrentCompany(data);
    },
    onSuccess: () => {
      toast.success("Horário de funcionamento atualizado.");
    },
    onError: (error) => {
      const fallback = "Não foi possível salvar o horário de funcionamento.";
      const message = error instanceof Error ? error.message : fallback;
      toast.error(message);
    },
  });

  return (
    <PageContainer title="Configurações" description="Configure sua empresa">
      <div className="max-w-2xl space-y-8">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold">Dados da Empresa</h3>
          <p className="text-sm text-muted-foreground">
            Estes dados são gerenciados apenas pelo Super Admin.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Nome da Empresa</p>
              <p className="font-medium">{currentCompany?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CNPJ</p>
              <p className="font-medium">{currentCompany?.cnpj ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsável</p>
              <p className="font-medium">{currentCompany?.owner_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="font-medium">{currentCompany?.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{currentCompany?.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telefone do Responsável</p>
              <p className="font-medium">{currentCompany?.owner_phone ?? "—"}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold">Horário de Funcionamento</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Abertura</Label>
              <Input
                type="time"
                step={1800}
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Fechamento</Label>
              <Input
                type="time"
                step={1800}
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Esses horários impactam diretamente os agendamentos disponíveis (sempre em blocos de 30 minutos).
          </p>
          <Button
            onClick={() => saveBusinessHoursMutation.mutate()}
            disabled={!currentCompany || saveBusinessHoursMutation.isPending}
          >
            {saveBusinessHoursMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Ativar Customização</h3>
              <p className="text-sm text-muted-foreground">Permite personalizar cores e layout da landing page</p>
            </div>
            <Switch />
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default AppSettings;
