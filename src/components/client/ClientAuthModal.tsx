import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm, type LoginFormValues } from "@/components/auth/LoginForm";
import { SignUpForm, type SignUpFormValues } from "@/components/auth/SignUpForm";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ClientAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string | null;
  companyName?: string | null;
  companySlug?: string | null;
  onSuccess?: () => void;
}

export function ClientAuthModal({
  open,
  onOpenChange,
  companyId,
  companyName,
  companySlug,
  onSuccess,
}: ClientAuthModalProps) {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("signup");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    setIsLoading(true);
    const { error: err } = await signIn(values.email, values.password);
    setIsLoading(false);
    if (err) {
      setError(err instanceof Error ? err.message : "Email ou senha incorretos.");
      return;
    }
    toast({ title: "Login realizado!", description: "Bem-vindo de volta." });
    onOpenChange(false);
    onSuccess?.();
  };

  const handleSignUp = async (values: SignUpFormValues) => {
    setError(null);
    setIsLoading(true);
    const { error: err } = await signUp({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      phone: values.phone?.trim() || undefined,
      company_name: companyName ?? undefined,
      company_slug: companySlug ?? undefined,
    });
    setIsLoading(false);
    if (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta. Tente novamente.");
      return;
    }
    // Vincular à empresa atual (multi-tenant: cada empresa tem seus próprios clientes)
    if (companyId) {
      try {
        const { clientService } = await import("@/services/client.service");
        await clientService.linkUserToCompany(companyId, {
          full_name: values.fullName,
          phone: values.phone?.trim() || undefined,
          email: values.email,
        });
      } catch (linkErr) {
        if (import.meta.env.DEV) {
          console.warn("[ClientAuthModal] Erro ao vincular cliente à empresa:", linkErr);
        }
      }
    }
    toast({ title: "Conta criada!", description: "Você já pode acessar seus agendamentos." });
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar conta ou entrar</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "login" | "signup"); setError(null); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
            <TabsTrigger value="login">Entrar</TabsTrigger>
          </TabsList>
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
          <TabsContent value="signup" className="mt-4">
            <SignUpForm
              onSubmit={handleSignUp}
              isLoading={isLoading}
            />
          </TabsContent>
          <TabsContent value="login" className="mt-4">
            <LoginForm
              onSubmit={handleLogin}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
