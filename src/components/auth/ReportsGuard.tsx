import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCompanyPageAccess } from "@/hooks/useCompanyPageAccess";

interface ReportsGuardProps {
  children: ReactNode;
}

/** Controle de acesso a Relatórios via allowed_pages em company_members */
export function ReportsGuard({ children }: ReportsGuardProps) {
  const { hasAccessToPage, isLoading } = useCompanyPageAccess();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!hasAccessToPage("reports")) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
