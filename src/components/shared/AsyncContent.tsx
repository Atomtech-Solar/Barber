import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getSafeClientMessage } from "@/lib/supabaseErrors";

export interface AsyncContentProps {
  isLoading: boolean;
  loading?: ReactNode;
  error: unknown;
  onRetry?: () => void;
  /** Conteúdo extra sob o erro (ex.: dica técnica só em desenvolvimento). */
  errorExtra?: ReactNode;
  isEmpty: boolean;
  empty?: ReactNode;
  children: ReactNode;
}

/**
 * Estados obrigatórios para listas/dados: carregando, erro (com retry), vazio ou conteúdo.
 */
export function AsyncContent({
  isLoading,
  loading,
  error,
  onRetry,
  errorExtra,
  isEmpty,
  empty,
  children,
}: AsyncContentProps) {
  if (isLoading) {
    return <>{loading ?? null}</>;
  }
  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-muted-foreground max-w-md">{getSafeClientMessage(error)}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void onRetry()}>
            Tentar novamente
          </Button>
        ) : null}
        {errorExtra ? <div className="text-xs text-muted-foreground max-w-lg">{errorExtra}</div> : null}
      </div>
    );
  }
  if (isEmpty) {
    return <>{empty ?? null}</>;
  }
  return <>{children}</>;
}
