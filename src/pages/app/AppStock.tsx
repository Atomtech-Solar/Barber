import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockProducts } from "@/data/mockData";
import { Plus } from "lucide-react";

const AppStock = () => (
  <PageContainer title="Estoque" description="Controle seus produtos" actions={<Button><Plus size={16} className="mr-2" /> Novo Produto</Button>}>
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Estoque</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockProducts.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>{p.stock} un</TableCell>
              <TableCell>R$ {p.price}</TableCell>
              <TableCell>
                <Badge variant={p.stock <= p.minStock ? "destructive" : "default"}>
                  {p.stock <= p.minStock ? "Baixo" : "OK"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </PageContainer>
);

export default AppStock;
