import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { initialized, user } = useAuth();
  const location = useLocation();

  if (!initialized) return null;

  if (!user) {
    const returnTo = location.pathname + location.search;
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
