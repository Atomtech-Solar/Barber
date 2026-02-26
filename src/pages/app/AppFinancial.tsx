import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CardWidget from "@/components/shared/CardWidget";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/contexts/TenantContext";
import { financialService } from "@/services/financial.service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AppFinancial = () => {
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ["financial", "stats", companyId],
    queryFn: () => financialService.getStats(companyId),
    enabled: !!companyId,
    retry: false,
  });

  const { data: recordsData, isError: recordsError } = useQuery({
    queryKey: ["financial", "records", companyId],
    queryFn: () => financialService.listByCompany(companyId),
    enabled: !!companyId,
    retry: false,
  });

  const records = recordsData?.data ?? [];
  const { incomeToday = 0, expenseToday = 0, balanceToday = 0 } = stats?.data ?? {};
  const hasError = statsError || recordsError;

  if (!companyId) {
    return (
      <PageContainer title="Financeiro" description="Controle de receitas e despesas">
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          Selecione uma empresa para visualizar o financeiro.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Financeiro" description="Controle de receitas e despesas (fonte: agendamentos e registros manuais)">
      {hasError && (
        <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          Erro ao carregar dados financeiros. Verifique se a tabela financial_records existe no banco.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <CardWidget
          title="Entradas Hoje"
          value={`R$ ${incomeToday.toFixed(2)}`}
          icon={TrendingUp}
          trend="up"
        />
        <CardWidget title="Saídas Hoje" value={`R$ ${expenseToday.toFixed(2)}`} icon={TrendingDown} trend="down" />
        <CardWidget title="Saldo Hoje" value={`R$ ${balanceToday.toFixed(2)}`} icon={DollarSign} />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  Nenhum registro financeiro. Receitas são geradas automaticamente quando um agendamento é marcado como &quot;Concluído&quot;.
                </TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.description ?? "—"}
                    {r.client_name_snapshot && (
                      <p className="text-xs text-muted-foreground font-normal">
                        Cliente: {r.client_name_snapshot}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {r.source === "appointment" ? "Agendamento" : r.source}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      r.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {r.type === "income" ? "+" : "-"}R$ {Math.abs(Number(r.amount)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
};

export default AppFinancial;
