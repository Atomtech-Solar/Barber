import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";

interface AppGuardProps {
  children: React.ReactNode;
}

export function AppGuard({ children }: AppGuardProps) {
  const { isAuthenticated, isLoading: authLoading, profile } = useAuth();
  const { currentCompany, isLoading: tenantLoading } = useTenant();

  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login?returnTo=%2Fapp&loginOnly=1" replace />;
  }

  const isOwner = profile?.role === "owner";
  const hasCompany = profile?.company_id || currentCompany;

  if (!hasCompany) {
    if (isOwner) {
      return <Navigate to="/admin" replace />;
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
