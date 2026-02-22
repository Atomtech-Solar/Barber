import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const AppSettings = () => (
  <PageContainer title="Configurações" description="Configure sua empresa">
    <div className="max-w-2xl space-y-8">
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold">Dados da Empresa</h3>
        <div className="grid gap-4">
          <div>
            <Label>Nome da Empresa</Label>
            <Input defaultValue="Barbearia Premium" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefone</Label>
              <Input defaultValue="(11) 99999-0001" className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input defaultValue="contato@barbpremium.com" className="mt-1" />
            </div>
          </div>
        </div>
        <Button>Salvar</Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold">Horário de Funcionamento</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Abertura</Label>
            <Input type="time" defaultValue="09:00" className="mt-1" />
          </div>
          <div>
            <Label>Fechamento</Label>
            <Input type="time" defaultValue="19:00" className="mt-1" />
          </div>
        </div>
        <Button>Salvar</Button>
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

export default AppSettings;
