import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SignUpForm, type SignUpFormValues } from "@/components/auth/SignUpForm";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Scissors } from "lucide-react";

export default function SignUp() {
  const { signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/client";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: SignUpFormValues) => {
    setError(null);
    setIsLoading(true);
    const { error: err } = await signUp({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      phone: values.phone,
    });
    setIsLoading(false);
    if (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao criar conta. Tente novamente."
      );
      return;
    }
    const path = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
    window.location.replace(path);
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
          <h1 className="text-2xl font-bold">Criar conta</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre-se para fazer agendamentos
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          {error && (
            <p className="text-destructive text-sm mb-4">{error}</p>
          )}
          <SignUpForm onSubmit={handleSubmit} isLoading={isLoading} />
          <p className="text-center text-sm text-muted-foreground mt-4">
            Já tem conta?{" "}
            <Link
              to={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
              className="text-primary hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
