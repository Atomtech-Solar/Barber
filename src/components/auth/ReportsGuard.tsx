import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ReportsGuardProps {
  children: ReactNode;
}

/** Apenas company_admin (admin da mini empresa) pode acessar Relatórios */
export function ReportsGuard({ children }: ReportsGuardProps) {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (profile?.role !== "company_admin" && profile?.role !== "owner") {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
