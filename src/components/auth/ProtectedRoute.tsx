import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingScreen } from "@/components/shared/AuthLoadingScreen";
import { Button } from "@/components/ui/button";
import { sanitizeInternalReturnTo } from "@/lib/safeRedirect";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { initialized, user, profile, profileLoadError, refreshProfile } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return <AuthLoadingScreen />;
  }

  if (user && profileLoadError && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 max-w-md mx-auto text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar os dados da sua conta. Verifique a conexão e tente de novo.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="default" onClick={() => void refreshProfile()}>
            Tentar novamente
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href="/">Ir ao início</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    const returnTo = sanitizeInternalReturnTo(location.pathname + location.search, "/client");
    return (
      <Navigate
        to={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
}
