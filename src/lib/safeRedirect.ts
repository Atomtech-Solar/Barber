const MAX_RETURN_LEN = 512;

/**
 * Impede open redirect (ex.: `returnTo=//site.com`) e destinos não relativos ao app.
 * Segurança: só caminhos relativos ao origin; validação real de sessão/permissão no backend.
 */
export function sanitizeInternalReturnTo(
  raw: string | null | undefined,
  fallback = "/client"
): string {
  if (raw == null || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return fallback;
  if (t.includes("://") || t.includes("\\")) return fallback;
  if (t.length > MAX_RETURN_LEN) return fallback;
  const pathPart = t.split("#")[0] ?? t;
  if (pathPart.includes("..")) return fallback;
  return t;
}
