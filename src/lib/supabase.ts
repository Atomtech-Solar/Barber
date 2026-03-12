import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseDisabled = import.meta.env.VITE_SUPABASE_DISABLED === "true";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment");
}

// Quando Supabase está desabilitado ou URL é placeholder, não persistir sessão
const isPlaceholderUrl =
  !supabaseUrl ||
  supabaseUrl.includes("seu-projeto.supabase.co") ||
  supabaseUrl.includes("example.supabase.co");

if (supabaseDisabled || isPlaceholderUrl) {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("sb-"));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: !supabaseDisabled && !isPlaceholderUrl,
    autoRefreshToken: !supabaseDisabled && !isPlaceholderUrl,
    detectSessionInUrl: true,
  },
});
