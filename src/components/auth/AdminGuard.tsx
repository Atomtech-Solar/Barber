import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface AdminGuardProps {
  children: React.ReactNode;
}

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Carregando...</div>
  </div>
);

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, isLoading, profile, profileLoadError, refreshProfile, signOut } = useAuth();

  // 1. Aguarda conclusão da checagem de auth (evita redirect prematuro)
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login?returnTo=%2Fowner%2Fdashboard&loginOnly=1" replace />;
  }

  // 2. Crítico: não redirecionar quando profile ainda é null
  // profile null = perfil carregando OU falha ao carregar (RLS/rede)
  // Redirecionar aqui causaria loop: volta para Index mesmo sendo owner
  if (!profile) {
    if (profileLoadError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 max-w-md">
          <p className="text-muted-foreground text-center">
            Não foi possível carregar seu perfil. Verifique suas permissões.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Se você é owner, execute a migração <code className="bg-muted px-1 rounded">002_get_own_profile_rpc.sql</code> no Supabase.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refreshProfile()}>
              Tentar novamente
            </Button>
            <Button variant="ghost" onClick={() => signOut()}>
              Sair
            </Button>
          </div>
        </div>
      );
    }
    return <LoadingScreen />;
  }

  // 3. Segurança: validação real deve ocorrer na API
  // Normaliza role (enum PostgreSQL pode variar)
  const role = String(profile.role ?? "").toLowerCase();
  if (role !== "owner") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
