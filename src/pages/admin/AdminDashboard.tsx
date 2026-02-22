import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockCompanies } from "@/data/mockData";
import { Plus, Eye, Lock, Unlock } from "lucide-react";

const AdminDashboard = () => (
  <PageContainer
    title="Empresas"
    description="Gerencie as empresas da plataforma"
    actions={<Button><Plus size={16} className="mr-2" /> Nova Empresa</Button>}
  >
    <div className="grid gap-4">
      {mockCompanies.map((company) => (
        <div key={company.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
              {company.logo}
            </div>
            <div>
              <h3 className="font-semibold">{company.name}</h3>
              <p className="text-sm text-muted-foreground">{company.email} · {company.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={company.status === 'active' ? 'default' : 'destructive'}>
              {company.status === 'active' ? 'Ativo' : 'Bloqueado'}
            </Badge>
            <Button variant="outline" size="sm">
              <Eye size={14} className="mr-1" /> Acessar
            </Button>
            <Button variant="ghost" size="icon">
              {company.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
            </Button>
          </div>
        </div>
      ))}
    </div>
  </PageContainer>
);

export default AdminDashboard;
