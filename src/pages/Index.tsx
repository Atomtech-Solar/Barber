import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors, Shield, Building2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const getDashboardByRole = (role: string) => {
  if (role === "owner") return "/owner/dashboard";
  if (role === "company_admin" || role === "employee") return "/app";
  if (role === "client") return "/client";
  return null;
};

const Index = () => {
  const { initialized, isAuthenticated, profile } = useAuth();

  // Aguarda auth antes de decidir redirect (evita flash da tela de escolha)
  if (!initialized) return null;

  // Redireciona usuário autenticado para o painel correto
  if (isAuthenticated && profile?.role) {
    const dest = getDashboardByRole(profile.role);
    if (dest) return <Navigate to={dest} replace />;
  }

  return (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
      <div>
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Scissors className="text-primary" size={32} />
        </div>
        <h1 className="text-4xl font-bold mb-2">brynex</h1>
        <p className="text-muted-foreground">Plataforma SaaS para gestão de negócios de beleza</p>
      </div>
      <div className="space-y-3">
        <Link to="/auth/login?returnTo=%2Fowner%2Fdashboard&loginOnly=1" className="block">
          <Button variant="outline" className="w-full justify-start gap-3 h-14">
            <Shield size={20} className="text-primary shrink-0" />
            <div className="text-left">
              <p className="font-medium">Painel Admin</p>
              <p className="text-xs text-muted-foreground">Gestão da plataforma</p>
            </div>
          </Button>
        </Link>
        <Link to="/auth/login?returnTo=%2Fapp&loginOnly=1" className="block">
          <Button variant="outline" className="w-full justify-start gap-3 h-14">
            <Building2 size={20} className="text-primary shrink-0" />
            <div className="text-left">
              <p className="font-medium">Dashboard Empresa</p>
              <p className="text-xs text-muted-foreground">Gestão do negócio</p>
            </div>
          </Button>
        </Link>
        <div className="block relative">
          <Button variant="outline" className="w-full justify-start gap-3 h-14 opacity-60 cursor-not-allowed" disabled>
            <Scissors size={20} className="text-primary shrink-0" />
            <div className="text-left">
              <p className="font-medium">Landing Page</p>
              <p className="text-xs text-muted-foreground">Página pública da empresa</p>
            </div>
          </Button>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
            futuro
          </span>
        </div>
        <div className="block relative">
          <Button variant="outline" className="w-full justify-start gap-3 h-14 opacity-60 cursor-not-allowed" disabled>
            <User size={20} className="text-primary shrink-0" />
            <div className="text-left">
              <p className="font-medium">Área do Cliente</p>
              <p className="text-xs text-muted-foreground">Agendamentos e perfil</p>
            </div>
          </Button>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
            futuro
          </span>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Index;
