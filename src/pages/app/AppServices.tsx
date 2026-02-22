import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { mockServices } from "@/data/mockData";
import { Plus, Clock } from "lucide-react";

const AppServices = () => (
  <PageContainer title="Serviços" description="Cadastre e gerencie seus serviços" actions={<Button><Plus size={16} className="mr-2" /> Novo Serviço</Button>}>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {mockServices.map((s) => (
        <div key={s.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
          <h3 className="font-semibold mb-2">{s.name}</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <Clock size={14} /> {s.duration}min
          </div>
          <p className="text-xl font-bold text-primary">R$ {s.price}</p>
          <Button variant="outline" size="sm" className="mt-3 w-full">Editar</Button>
        </div>
      ))}
    </div>
  </PageContainer>
);

export default AppServices;
