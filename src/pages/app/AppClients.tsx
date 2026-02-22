import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockClients } from "@/data/mockData";
import { Plus } from "lucide-react";

const AppClients = () => (
  <PageContainer title="Clientes" description="Gerencie seus clientes" actions={<Button><Plus size={16} className="mr-2" /> Novo Cliente</Button>}>
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Visitas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockClients.map((c) => (
            <TableRow key={c.id} className="cursor-pointer hover:bg-secondary/50">
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="text-muted-foreground">{c.email}</TableCell>
              <TableCell className="text-muted-foreground">{c.phone}</TableCell>
              <TableCell>{c.visits}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </PageContainer>
);

export default AppClients;
