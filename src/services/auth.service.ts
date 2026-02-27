import { supabase } from "@/lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/database.types";

// Segurança: validação real deve ocorrer na API
export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: "client" | "company_admin" | "employee";
}

export interface SignInParams {
  email: string;
  password: string;
}

export const authService = {
  async signUp(params: SignUpParams) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          phone: params.phone ?? "",
          role: params.role ?? "client",
        },
      },
    });
    return { data, error };
  },

  async signIn(params: SignInParams) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });
    return { data, error };
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getSession() {
    return supabase.auth.getSession();
  },

  async getUser() {
    return supabase.auth.getUser();
  },

  /**
   * Carrega o perfil do usuário autenticado.
   * Usa RPC get_own_profile (SECURITY DEFINER) para evitar edge cases de RLS.
   * Fallback para query direta se RPC não existir.
   */
  async getProfile(userId: string): Promise<{ data: Profile | null; error: unknown }> {
    const result = await this._getProfileViaRpc();
    if (result !== null) return result;

    // Fallback: query direta (pode falhar por RLS em alguns cenários)
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[auth.service] getProfile error:", JSON.stringify(error, null, 2));
      return { data: null, error };
    }
    if (!data) {
      console.warn("[auth.service] getProfile: perfil não encontrado para userId:", userId);
      return { data: null, error: null };
    }

    return { data: this._normalizeProfile(data as Profile), error: null };
  },

  async _getProfileViaRpc(): Promise<{ data: Profile | null; error: unknown } | null> {
    const { data, error } = await supabase.rpc("get_own_profile");
    if (error) {
      if (error.code === "42883") return null; // function does not exist - fallback
      console.error("[auth.service] get_own_profile RPC error:", JSON.stringify(error, null, 2));
      return { data: null, error };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { data: null, error: null };
    return { data: this._normalizeProfile(row as Profile), error: null };
  },

  _normalizeProfile(raw: Profile): Profile {
    return {
      ...raw,
      role: (String(raw.role ?? "").toLowerCase() || "client") as Profile["role"],
    };
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
