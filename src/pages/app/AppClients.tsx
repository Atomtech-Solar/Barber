import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import { useTenant } from "@/contexts/TenantContext";
import { clientService } from "@/services/client.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AppClients = () => {
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";

  const { data: clientsData } = useQuery({
    queryKey: ["clients", companyId],
    queryFn: () => clientService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const clients = clientsData?.data ?? [];

  return (
    <PageContainer title="Clientes" description="Clientes que já agendaram na empresa">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Visitas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              clients.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-secondary/50">
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                  <TableCell>{c.visit_count}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
};

export default AppClients;
