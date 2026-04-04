export interface MentionCandidate {
  id: string;
  full_name: string;
}

/** Token inserido no texto; o trigger de notificações globais procura `@todos` na mensagem. */
export const MURAL_GLOBAL_TODOS_TOKEN = "todos";

/**
 * Extrai user ids mencionados no texto como @Nome Completo (nome deve bater com candidatos).
 * Ordena por nome mais longo primeiro para evitar match parcial incorreto.
 */
export function parseMentionedUserIdsFromMessage(
  message: string,
  candidates: MentionCandidate[]
): string[] {
  const sorted = [...candidates].sort((a, b) => b.full_name.length - a.full_name.length);
  const found = new Set<string>();
  for (const c of sorted) {
    const needle = `@${c.full_name}`;
    if (message.includes(needle)) found.add(c.id);
  }
  return [...found];
}
