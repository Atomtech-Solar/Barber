import { supabase } from "@/lib/supabase";
import type { Company } from "@/types/database.types";

export interface CreateCompanyParams {
  owner_id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  cnpj?: string | null;
  email: string;
  owner_name: string;
  owner_phone: string;
  slogan?: string | null;
  phone?: string | null;
}

export interface UpdateCompanyParams {
  name?: string;
  slug?: string;
  logo?: string | null;
  logo_url?: string | null;
  cnpj?: string | null;
  slogan?: string | null;
  phone?: string | null;
  email?: string;
  owner_name?: string;
  owner_phone?: string;
  opening_time?: string | null;
  closing_time?: string | null;
  status?: "active" | "blocked";
  /** Data em que o plano foi iniciado (admin) */
  active_from?: string | null;
  /** Quantidade de dias ativo (admin) */
  active_days?: number | null;
  /** Observações do admin */
  admin_obs?: string | null;
}

export const companyService = {
  /**
   * Lista empresas acessíveis ao usuário:
   * - Platform owner: todas
   * - Company owner: onde owner_id = auth.uid()
   * - Staff: onde existe em company_members
   * Usa RPC list_my_companies (SECURITY DEFINER) para maior confiabilidade.
   */
  async list() {
    const rpc = await supabase.rpc("list_my_companies");
    if (!rpc.error && Array.isArray(rpc.data)) {
      const sorted = (rpc.data as Company[]).sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "")
      );
      return { data: sorted, error: null };
    }
    // Fallback: query direta (RLS aplica)
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");
    return { data: (data ?? []) as Company[], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();
    return { data: data as Company | null, error };
  },

  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .single();
    return { data: data as Company | null, error };
  },

  async create(params: CreateCompanyParams) {
    if (!params.owner_id) {
      const err = new Error("owner_id é obrigatório. Usuário não autenticado.");
      if (import.meta.env.DEV) console.error("[company.service] create:", err.message);
      throw err;
    }

    const slug =
      (params.slug || params.name)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") || params.name.toLowerCase().replace(/\s+/g, "-");

    const payload = {
      owner_id: params.owner_id,
      name: params.name,
      slug,
      logo: params.logo_url ?? null,
      logo_url: params.logo_url ?? null,
      cnpj: params.cnpj || null,
      email: params.email,
      owner_name: params.owner_name,
      owner_phone: params.owner_phone,
      slogan: params.slogan || null,
      phone: params.phone ?? null,
    };

    if (import.meta.env.DEV) {
      console.log("[company.service] create payload:", { ...payload, owner_id: payload.owner_id });
    }

    const { data, error } = await supabase
      .from("companies")
      .insert([payload])
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[company.service] INSERT ERROR:", error);
      }
      throw new Error(
        error.message || "Falha ao inserir empresa. Verifique permissões (RLS) e dados."
      );
    }

    return { data: data as Company, error: null };
  },

  async update(id: string, params: UpdateCompanyParams) {
    const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() };
    if (params.slug) updates.slug = params.slug.toLowerCase().replace(/\s+/g, "-");
    const { data, error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    return { data: data as Company | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    return { error };
  },
};
