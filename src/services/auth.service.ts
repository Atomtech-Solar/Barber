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
  /** Nome da empresa - usado no template de email de confirmação */
  company_name?: string;
  /** Slug da empresa - usado no template de email e para vincular ao profile */
  company_slug?: string;
  /** ID da empresa - para setar company_id no profile (aparece na dashboard) */
  company_id?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export const authService = {
  async signUp(params: SignUpParams) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            full_name: params.fullName,
            phone: params.phone ?? "",
            role: params.role ?? "client",
            company_name: params.company_name ?? "",
            company_slug: params.company_slug ?? "",
            company_id: params.company_id ?? "",
          },
        },
      });
      return { data, error };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isNetworkError =
        msg.includes("Failed to fetch") ||
        msg.includes("ERR_NAME_NOT_RESOLVED") ||
        msg.includes("unreachable") ||
        msg.includes("fetch");
      return {
        data: null,
        error: new Error(
          isNetworkError
            ? "Serviço temporariamente indisponível. Verifique sua conexão ou se o Supabase está ativo (projeto pode estar pausado)."
            : msg
        ),
      };
    }
  },

  async signIn(params: SignInParams) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });
      if (error || !data.user) {
        return { data, error };
      }

      const blocked = await this._isBlockedCompanyUser(data.user.id);
      if (blocked) {
        await supabase.auth.signOut();
        return {
          data: null,
          error: new Error(
            "Empresa bloqueada pelo administrador. Entre em contato com o suporte da empresa."
          ),
        };
      }

      return { data, error };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err);
      const isNetworkError =
        msg.includes("Failed to fetch") ||
        msg.includes("ERR_NAME_NOT_RESOLVED") ||
        msg.includes("unreachable") ||
        msg.includes("fetch");
      return {
        data: null,
        error: new Error(
          isNetworkError
            ? "Serviço temporariamente indisponível. Verifique sua conexão ou se o Supabase está ativo (projeto pode estar pausado)."
            : msg
        ),
      };
    }
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
      cpf: raw.cpf ?? null,
      role: (String(raw.role ?? "").toLowerCase() || "client") as Profile["role"],
    };
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async _isBlockedCompanyUser(userId: string): Promise<boolean> {
    const profileResult = await this.getProfile(userId);
    const role = String(profileResult.data?.role ?? "").toLowerCase();

    // Owner da plataforma nunca deve ser bloqueado por status de empresa
    if (role === "owner") return false;

    // 1) Fluxo principal: empresas acessíveis via RPC
    const companiesRpc = await supabase.rpc("list_my_companies");
    if (!companiesRpc.error && Array.isArray(companiesRpc.data) && companiesRpc.data.length > 0) {
      const hasActiveCompany = companiesRpc.data.some(
        (company: { status?: string | null }) => company.status === "active"
      );
      return !hasActiveCompany;
    }

    // 2) Fallback: perfil com vínculo direto de empresa
    if (profileResult.data?.company_id) {
      const companyStatus = await supabase
        .from("companies")
        .select("status")
        .eq("id", profileResult.data.company_id)
        .maybeSingle();
      if (!companyStatus.error && companyStatus.data?.status === "blocked") {
        return true;
      }
    }

    return false;
  },
};
