import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useCompanyStaffMembership } from "@/hooks/useCompanyStaffMembership";
import { AuthLoadingScreen } from "@/components/shared/AuthLoadingScreen";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface AppGuardProps {
  children: React.ReactNode;
}

/**
 * Acesso à dashboard (/app) é permitido apenas para:
 * - owner (super admin)
 * - usuários adicionados ao time da empresa pelo admin (company_members), com role employee/company_admin;
 * - exceção: role client no perfil mas com linha em company_members (equipe promovida; ver migration 053).
 * Contas somente cliente (role client e sem company_members) não acessam a dashboard.
 */
export function AppGuard({ children }: AppGuardProps) {
  const { initialized, isAuthenticated, profile } = useAuth();
  const { currentCompany, isLoading: tenantLoading } = useTenant();
  const { isStaffViaMembership, isResolvingStaff, staffCheckFailed } = useCompanyStaffMembership();

  if (!initialized) return <AuthLoadingScreen />;

  if (tenantLoading || isResolvingStaff) {
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

  // Cliente final (sem vínculo de equipe) não acessa a dashboard da empresa.
  if (role === "client" && !isStaffViaMembership) {
    if (staffCheckFailed) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <p className="text-muted-foreground text-center text-sm">
            Não foi possível verificar seu acesso. Atualize a página ou tente novamente.
          </p>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="flex justify-center">
            <ShieldAlert className="size-12 text-amber-500" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold">Área da empresa</h1>
          <p className="text-muted-foreground text-sm">
            Esta conta é de <strong className="text-foreground">cliente</strong> (agendamentos). A
            gestão do negócio fica na dashboard — acesso liberado só para quem a equipe cadastrou como
            funcionário.
          </p>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/client">Ir para minha área de cliente</Link>
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
