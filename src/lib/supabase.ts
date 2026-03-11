import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseDisabled = import.meta.env.VITE_SUPABASE_DISABLED === "true";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment");
}

/** Remove sessão Supabase do localStorage para interromper loop de refresh quando o backend está inacessível */
function clearSupabaseAuthStorage(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("sb-"));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Circuit breaker: após erro de rede em auth, evita novas tentativas (interrompe console spam) */
let authCircuitOpen = false;

const customFetch: typeof fetch = (input, init?) => {
  const url = typeof input === "string" ? input : (input as Request)?.url ?? "";
  const isAuthRequest = url.includes("/auth/v1/");

  if (authCircuitOpen && isAuthRequest) {
    return Promise.reject(new Error("Supabase auth unreachable (circuit open)"));
  }

  return fetch(input, init).catch((err) => {
    if (
      isAuthRequest &&
      (err?.message?.includes("fetch") ||
        err?.message?.includes("Failed to fetch") ||
        err?.message?.includes("ERR_NAME_NOT_RESOLVED") ||
        err?.name === "TypeError")
    ) {
      authCircuitOpen = true;
      clearSupabaseAuthStorage();
    }
    throw err;
  });
};

// Quando Supabase está desabilitado ou URL é placeholder, não persistir sessão
const isPlaceholderUrl =
  !supabaseUrl ||
  supabaseUrl.includes("seu-projeto.supabase.co") ||
  supabaseUrl.includes("example.supabase.co");

if (supabaseDisabled || isPlaceholderUrl) {
  clearSupabaseAuthStorage();
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: customFetch },
  auth: {
    persistSession: !supabaseDisabled && !isPlaceholderUrl,
    autoRefreshToken: !supabaseDisabled && !isPlaceholderUrl,
    detectSessionInUrl: true,
  },
});
