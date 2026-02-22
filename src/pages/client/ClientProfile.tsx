import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ClientProfile = () => (
  <div className="space-y-6 animate-fade-in">
    <h1 className="text-2xl font-bold">Meu Perfil</h1>
    <div className="space-y-4">
      <div>
        <Label>Nome</Label>
        <Input defaultValue="João Mendes" className="mt-1" />
      </div>
      <div>
        <Label>Email</Label>
        <Input defaultValue="joao@email.com" className="mt-1" />
      </div>
      <div>
        <Label>Telefone</Label>
        <Input defaultValue="(11) 98888-0001" className="mt-1" />
      </div>
      <Button className="w-full">Salvar Alterações</Button>
      <Button variant="ghost" className="w-full text-destructive">Sair da Conta</Button>
    </div>
  </div>
);

export default ClientProfile;
