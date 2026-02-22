import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors, Shield, Building2, User } from "lucide-react";

const Index = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
      <div>
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Scissors className="text-primary" size={32} />
        </div>
        <h1 className="text-4xl font-bold mb-2">BeautyHub</h1>
        <p className="text-muted-foreground">Plataforma SaaS para gestão de negócios de beleza</p>
      </div>
      <div className="space-y-3">
        <Link to="/admin" className="block">
          <Button variant="outline" className="w-full justify-start gap-3 h-14">
            <Shield size={20} className="text-primary shrink-0" />
            <div className="text-left">
              <p className="font-medium">Painel Admin</p>
              <p className="text-xs text-muted-foreground">Gestão da plataforma</p>
            </div>
          </Button>
        </Link>
        <Link to="/app" className="block">
          <Button variant="outline" className="w-full justify-start gap-3 h-14">
            <Building2 size={20} className="text-primary shrink-0" />
            <div className="text-left">
              <p className="font-medium">Dashboard Empresa</p>
              <p className="text-xs text-muted-foreground">Gestão do negócio</p>
            </div>
          </Button>
        </Link>
        <Link to="/site/barbearia-premium" className="block">
          <Button variant="outline" className="w-full justify-start gap-3 h-14">
            <Scissors size={20} className="text-primary shrink-0" />
            <div className="text-left">
              <p className="font-medium">Landing Page</p>
              <p className="text-xs text-muted-foreground">Página pública da empresa</p>
            </div>
          </Button>
        </Link>
        <Link to="/client" className="block">
          <Button variant="outline" className="w-full justify-start gap-3 h-14">
            <User size={20} className="text-primary shrink-0" />
            <div className="text-left">
              <p className="font-medium">Área do Cliente</p>
              <p className="text-xs text-muted-foreground">Agendamentos e perfil</p>
            </div>
          </Button>
        </Link>
      </div>
    </div>
  </div>
);

export default Index;
