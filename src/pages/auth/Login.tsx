import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scissors } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/client";
  const loginOnly = searchParams.get("loginOnly") === "1";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setError(null);
    setIsLoading(true);
    const { error: err } = await signIn(values.email, values.password);
    if (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Email ou senha incorretos. Tente novamente.");
      return;
    }
    const path = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
    navigate(path, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative">
      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={18} />
        Voltar para seleção
      </Link>
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Scissors className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acesse sua conta para continuar
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          {error && (
            <p className="text-destructive text-sm mb-4">{error}</p>
          )}
          <LoginForm onSubmit={handleSubmit} isLoading={isLoading} />
          {!loginOnly && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Não tem conta?{" "}
              <Link
                to={`/auth/signup?returnTo=${encodeURIComponent(returnTo)}`}
                className="text-primary hover:underline"
              >
                Criar conta
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
