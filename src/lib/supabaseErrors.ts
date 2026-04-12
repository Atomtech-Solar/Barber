import type { PostgrestError } from "@supabase/supabase-js";
import { isBusinessRuleError } from "@/lib/businessRules";

function isPostgrestError(e: unknown): e is PostgrestError {
  return typeof e === "object" && e !== null && "code" in e && typeof (e as PostgrestError).code === "string";
}

/**
 * Mensagem segura para o usuário final — nunca expor SQL, stack ou detalhes internos do PostgREST.
 * Segurança: mensagens genéricas; diagnóstico real fica no servidor / logs de backend.
 */
export function getSafeClientMessage(error: unknown): string {
  if (error == null) return "Não foi possível concluir a operação.";

  if (isBusinessRuleError(error)) {
    return error.message;
  }

  if (isPostgrestError(error)) {
    const code = error.code;
    if (code === "42501" || code === "PGRST301" || code === "PGRST302") {
      return "Você não tem permissão para esta ação.";
    }
    if (code === "23505") return "Este registro já existe ou viola uma regra de unicidade.";
    if (code === "23503") return "Referência inválida. Verifique os dados e tente novamente.";
    if (code === "23514") {
      const hint = error.hint?.trim();
      if (hint) return hint;
      const msg = (error.message ?? "").toLowerCase();
      if (msg.includes("perf_goal_overlap")) {
        return "Já existe outra meta personalizada neste período para o mesmo indicador.";
      }
      return "Os dados violam uma regra do sistema. Verifique períodos e valores.";
    }
    if (code === "PGRST116") return "Registro não encontrado.";
    if (code === "22P02") return "Dados em formato inválido.";
  }

  if (error instanceof Error) {
    const m = error.message;
    const lower = m.toLowerCase();
    if (
      lower.includes("invalid login credentials") ||
      lower.includes("invalid email or password") ||
      lower.includes("invalid credentials")
    ) {
      return "Email ou senha incorretos. Tente novamente.";
    }
    if (
      m === "Empresa inválida." ||
      m === "Identificador inválido." ||
      m.includes("obrigatório") ||
      m.includes("Valor fora do intervalo") ||
      m.includes("Valor inválido") ||
      m.includes("Mensagem vazia")
    ) {
      return m;
    }
  }

  return "Não foi possível concluir a operação. Tente novamente mais tarde.";
}

/**
 * Registro para análise: em SPA só há console estruturado em DEV.
 * Futuro: enviar para endpoint de logs no backend (sem dados sensíveis).
 */
export function logClientError(context: string, error: unknown): void {
  if (!import.meta.env.DEV) return;
  const code = isPostgrestError(error) ? error.code : undefined;
  const hint = isPostgrestError(error) ? error.hint : undefined;
  console.warn(`[${context}]`, { code, hint, message: getSafeClientMessage(error) });
}
