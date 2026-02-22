import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { mockProfessionals } from "@/data/mockData";
import { Plus } from "lucide-react";

const AppProfessionals = () => (
  <PageContainer title="Profissionais" description="Gerencie sua equipe" actions={<Button><Plus size={16} className="mr-2" /> Novo Profissional</Button>}>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {mockProfessionals.map((p) => (
        <div key={p.id} className="bg-card border border-border rounded-xl p-5 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl mx-auto mb-3">
            {p.avatar}
          </div>
          <h3 className="font-semibold">{p.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">{p.role}</p>
          <p className="text-xs text-muted-foreground">{p.services.length} serviços atribuídos</p>
          <Button variant="outline" size="sm" className="mt-3 w-full">Editar</Button>
        </div>
      ))}
    </div>
  </PageContainer>
);

export default AppProfessionals;
