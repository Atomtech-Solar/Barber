/**
 * Defesa em profundidade no cliente: valida formato de IDs antes de chamar o Supabase.
 * Autoridade absoluta de isolamento multi-tenant = RLS + RPCs no Postgres (backend).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Limite superior razoável para valores monetários enviados pelo app (UX; validação real na API). */
export const MAX_FINANCIAL_RECORD_AMOUNT = 50_000_000;

export function isValidUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/**
 * Garante `companyId` utilizável em queries com `.eq("company_id", ...)`.
 * @throws Error com mensagem genérica (segura para exibir em UI se capturada)
 */
export function requireCompanyId(companyId: string | null | undefined): string {
  if (!isValidUuid(companyId)) {
    throw new Error("Empresa inválida.");
  }
  return companyId!.trim();
}

/** Valida UUID genérico (ex.: id de registro). */
export function requireUuid(value: string | null | undefined): string {
  if (!isValidUuid(value)) {
    throw new Error("Identificador inválido.");
  }
  return value!.trim();
}

export function assertBoundedPositiveAmount(
  value: number,
  max: number = MAX_FINANCIAL_RECORD_AMOUNT
): void {
  if (!Number.isFinite(value) || value <= 0 || value > max) {
    throw new Error("Valor fora do intervalo permitido.");
  }
}
