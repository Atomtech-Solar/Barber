import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface AppGuardProps {
  children: React.ReactNode;
}

/**
 * Acesso à dashboard (/app) é permitido apenas para:
 * - owner (super admin)
 * - usuários adicionados ao time da empresa pelo admin (company_admin / employee em company_members).
 * Contas criadas pelo agendamento (role = client) nunca podem acessar a dashboard.
 */
export function AppGuard({ children }: AppGuardProps) {
  const { initialized, isAuthenticated, profile } = useAuth();
  const { currentCompany, isLoading: tenantLoading } = useTenant();

  if (!initialized) return null;

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login?returnTo=%2Fapp&loginOnly=1" replace />;
  }

  const role = (profile?.role ?? "").toLowerCase();

  // Conta de cliente (criada pelo agendamento) nunca acessa a dashboard.
  if (role === "client") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="flex justify-center">
            <ShieldAlert className="size-12 text-amber-500" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold">Você não tem acesso</h1>
          <p className="text-muted-foreground text-sm">
            Sua conta não tem permissão para acessar a área da empresa. O acesso à dashboard é
            concedido apenas pelo administrador da plataforma.
          </p>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/client">Ir para minha área</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = role === "owner";
  const hasCompany = profile?.company_id || currentCompany;

  if (!hasCompany) {
    if (isOwner) {
      return <Navigate to="/owner/dashboard" replace />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground text-center">
          Você não tem acesso a nenhuma empresa. Entre em contato com o administrador.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
