import PageContainer from "@/components/shared/PageContainer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockTransactions } from "@/data/mockData";
import CardWidget from "@/components/shared/CardWidget";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const AppFinancial = () => (
  <PageContainer title="Financeiro" description="Controle seu caixa">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <CardWidget title="Entradas Hoje" value="R$ 210" change="+15%" icon={TrendingUp} trend="up" />
      <CardWidget title="Saídas Hoje" value="R$ 25" icon={TrendingDown} trend="down" />
      <CardWidget title="Saldo" value="R$ 185" icon={DollarSign} />
    </div>
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockTransactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.description}</TableCell>
              <TableCell className="text-muted-foreground">{t.date}</TableCell>
              <TableCell className={cn("text-right font-medium", t.amount > 0 ? "text-success" : "text-destructive")}>
                {t.amount > 0 ? '+' : ''}R$ {Math.abs(t.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </PageContainer>
);

export default AppFinancial;
