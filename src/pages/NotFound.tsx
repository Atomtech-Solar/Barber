import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logClientError } from "@/lib/supabaseErrors";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      logClientError("route.notFound", new Error(location.pathname));
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center max-w-md">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="mb-6 text-muted-foreground">
          O endereço que você abriu não existe ou foi movido. Confira o link ou volte ao início.
        </p>
        <a href="/" className="text-primary font-medium underline underline-offset-4 hover:text-primary/90">
          Ir para o início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
