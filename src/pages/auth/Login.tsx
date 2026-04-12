import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetAppTheme } from "@/lib/companyTheme";
import { sanitizeInternalReturnTo } from "@/lib/safeRedirect";
import { getSafeClientMessage } from "@/lib/supabaseErrors";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scissors, Shield, Building2, User } from "lucide-react";

/** Elemento gráfico decorativo no lugar do botão inútil */
function LoginDecorativeGraphic() {
  return (
    <div className="mt-8 relative" aria-hidden>
      <div className="flex items-end gap-2">
        {/* Círculos concêntricos com tesoura central */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-primary/20 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border border-primary/30 flex items-center justify-center">
              <Scissors className="text-primary/50" size={24} strokeWidth={1.5} />
            </div>
          </div>
        </div>
        {/* Formas geométricas decorativas */}
        <div className="flex flex-col gap-2">
          <div className="w-8 h-8 rounded-lg border border-primary/20 rotate-12" />
          <div className="w-6 h-6 rounded border border-primary/15 -rotate-6 ml-2" />
        </div>
        <div className="flex flex-col gap-3 mb-1">
          <div className="w-3 h-3 rounded-full bg-primary/30" />
          <div className="w-4 h-4 rounded-full border border-primary/20" />
        </div>
      </div>
    </div>
  );
}

function getLoginTypeInfo(returnTo: string) {
  if (returnTo.includes("/owner")) {
    return {
      title: "Painel Admin",
      description: "Acesse o painel de administração da plataforma. Gerencie empresas, usuários e configurações do sistema.",
      icon: Shield,
    };
  }
  if (returnTo.includes("/app")) {
    return {
      title: "Dashboard Empresa",
      description: "Entre na área de gestão do seu negócio. Agende atendimentos, gerencie clientes e acompanhe seu faturamento.",
      icon: Building2,
    };
  }
  return {
    title: "Área do Cliente",
    description: "Acesse seus agendamentos e perfil. Veja histórico de atendimentos e gerencie suas reservas.",
    icon: User,
  };
}

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeInternalReturnTo(searchParams.get("returnTo"), "/client");
  const loginOnly = searchParams.get("loginOnly") === "1";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginInfo = getLoginTypeInfo(returnTo);
  const LoginIcon = loginInfo.icon;

  useEffect(() => {
    resetAppTheme();
  }, []);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setError(null);
    setIsLoading(true);
    const { error: err } = await signIn(values.email, values.password);
    if (err) {
      setIsLoading(false);
      setError(getSafeClientMessage(err));
      return;
    }
    navigate(returnTo, { replace: true });
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Fundo dinâmico - padrão diagonal e formas geométricas */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 -z-10" />
      <div
        className="absolute inset-0 opacity-20 -z-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.02) 40px,
              rgba(255,255,255,0.02) 41px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.015) 40px,
              rgba(255,255,255,0.015) 41px
            )
          `,
        }}
      />
      <div
        className="absolute top-20 right-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl -z-10"
        aria-hidden
      />
      <div
        className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl -z-10"
        aria-hidden
      />

      {/* Link voltar */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Voltar para seleção
      </Link>

      <div className="flex-1 flex flex-col lg:flex-row min-h-screen">
        {/* Lado esquerdo - Título e texto (oculto no mobile) */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-8 lg:p-16">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <LoginIcon className="text-primary" size={24} />
              </div>
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {loginInfo.title}
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Bem-vindo de volta
            </h1>
            <div className="w-16 h-0.5 bg-primary mb-6" />
            <p className="text-zinc-400 text-lg leading-relaxed">
              {loginInfo.description}
            </p>
            <LoginDecorativeGraphic />
          </div>
        </div>

        {/* Lado direito - Formulário (único bloco visível no mobile) */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-16 pt-16 lg:pt-8">
          <div className="w-full max-w-md animate-fade-in">
            <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              {/* Badge do tipo de login */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <LoginIcon className="text-primary" size={16} />
                </div>
                <span className="text-sm font-medium text-primary">
                  Login — {loginInfo.title}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-6">Entrar</h2>

              {error && (
                <p className="text-destructive text-sm mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  {error}
                </p>
              )}

              <LoginForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                variant="dark"
              />

              {!loginOnly && (
                <p className="text-center text-sm text-zinc-400 mt-6">
                  Não tem conta?{" "}
                  <Link
                    to={`/auth/signup?returnTo=${encodeURIComponent(returnTo)}`}
                    className="text-primary hover:underline font-medium"
                  >
                    Criar conta
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
