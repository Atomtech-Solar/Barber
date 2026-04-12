import { supabase } from "@/lib/supabase";
import { requireCompanyId, requireUuid } from "@/lib/companyScope";
import type { CompanyClient } from "@/types/database.types";

export interface CompanyClientWithVisitCount extends CompanyClient {
  visit_count: number;
  /** Data do último atendimento (yyyy-MM-dd) */
  last_visit: string | null;
}

export const clientService = {
  async listByCompany(companyId: string) {
    requireCompanyId(companyId);
    const { data: clients, error } = await supabase.rpc("list_company_clients", {
      p_company_id: companyId,
    });

    if (error) return { data: [] as CompanyClientWithVisitCount[], error };

    const { data: appointments } = await supabase
      .from("appointments")
      .select("client_phone, client_id, date, status")
      .eq("company_id", companyId);

    const ACTIVE_STATUSES = ["pending", "confirmed", "completed", "blocked"] as const;
    const visitByPhone: Record<string, number> = {};
    const lastVisitByPhone: Record<string, string> = {};

    (appointments ?? []).forEach((a) => {
      const isActive = ACTIVE_STATUSES.includes(a.status as (typeof ACTIVE_STATUSES)[number]);
      if (!isActive) return;

      const dateStr = a.date ?? "";

      if (a.client_phone) {
        const norm = a.client_phone.replace(/\D/g, "");
        if (norm) {
          visitByPhone[norm] = (visitByPhone[norm] ?? 0) + 1;
          if (
            dateStr &&
            (!lastVisitByPhone[norm] || dateStr > lastVisitByPhone[norm])
          ) {
            lastVisitByPhone[norm] = dateStr;
          }
        }
      }
    });

    const result = (clients ?? []).map((c) => {
      const phoneNorm = (c.phone ?? "").replace(/\D/g, "");
      const byPhone = phoneNorm ? visitByPhone[phoneNorm] ?? 0 : 0;
      const visit_count = byPhone;
      const last_visit = phoneNorm ? lastVisitByPhone[phoneNorm] ?? null : null;
      return { ...c, visit_count, last_visit } as CompanyClientWithVisitCount;
    });

    return { data: result.sort((a, b) => b.visit_count - a.visit_count), error: null };
  },

  async getById(id: string) {
    requireUuid(id);
    const { data, error } = await supabase
      .from("company_clients")
      .select("*")
      .eq("id", id)
      .single();
    return { data: data as CompanyClient | null, error };
  },

  async create(companyId: string, params: { full_name: string; phone?: string; email?: string; cpf?: string; notes?: string }) {
    requireCompanyId(companyId);
    const { data: rpcResult, error: rpcError } = await supabase.rpc("create_company_client", {
      p_company_id: companyId,
      p_full_name: params.full_name,
      p_phone: params.phone || null,
      p_email: params.email || null,
      p_cpf: params.cpf || null,
      p_notes: params.notes || null,
    });

    if (rpcError) return { data: null, error: rpcError };

    const res = rpcResult as { success?: boolean; error?: string; client_id?: string } | null;
    if (!res?.success || !res.client_id) {
      return {
        data: null,
        error: new Error(res?.error ?? "Erro ao criar cliente"),
      };
    }

    return this.getById(res.client_id);
  },

  async update(
    id: string,
    params: { full_name?: string; phone?: string; email?: string; cpf?: string; notes?: string }
  ) {
    requireUuid(id);
    const { data: rpcResult, error: rpcError } = await supabase.rpc("update_company_client", {
      p_client_id: id,
      p_full_name: params.full_name ?? null,
      p_phone: params.phone ?? null,
      p_email: params.email ?? null,
      p_cpf: params.cpf ?? null,
      p_notes: params.notes ?? null,
    });

    if (rpcError) return { data: null, error: rpcError };

    const res = rpcResult as { success?: boolean; error?: string } | null;
    if (!res?.success) {
      return { data: null, error: new Error(res?.error ?? "Erro ao atualizar cliente") };
    }
    return this.getById(id);
  },

  async delete(id: string) {
    requireUuid(id);
    const { data: rpcResult, error: rpcError } = await supabase.rpc("delete_company_client", {
      p_client_id: id,
    });

    if (rpcError) return { error: rpcError };

    const res = rpcResult as { success?: boolean; error?: string } | null;
    if (!res?.success) {
      return { error: new Error(res?.error ?? "Erro ao remover cliente") };
    }
    return { error: null };
  },

  /**
   * Histórico do cliente: info, estatísticas e atendimentos.
   * Requer migration 041 (get_client_history).
   */
  async getClientHistory(companyId: string, companyClientId: string) {
    requireCompanyId(companyId);
    requireUuid(companyClientId);
    const { data, error } = await supabase.rpc("get_client_history", {
      p_company_id: companyId,
      p_company_client_id: companyClientId,
    });

    if (error) return { data: null, error };

    const res = data as {
      success?: boolean;
      error?: string;
      client?: Record<string, unknown>;
      stats?: Record<string, unknown>;
      history?: Array<{
        appointment_id: string;
        date: string;
        service_names: string;
        professional_name: string;
        valor: number;
      }>;
    } | null;

    if (!res?.success) {
      return { data: null, error: new Error(res?.error ?? "Erro ao carregar histórico") };
    }

    return {
      data: {
        client: res.client,
        stats: res.stats,
        history: res.history ?? [],
      },
      error: null,
    };
  },

  /**
   * Vincula o usuário autenticado à empresa (após criar conta pela landing).
   * Multi-tenant: cada empresa tem seus próprios clientes.
   */
  async linkUserToCompany(
    companyId: string,
    params: { full_name: string; phone?: string; email?: string }
  ) {
    requireCompanyId(companyId);
    const { data, error } = await supabase.rpc("register_client_for_company", {
      p_company_id: companyId,
      p_full_name: params.full_name,
      p_phone: params.phone ?? null,
      p_email: params.email ?? null,
    });

    if (error) return { success: false, error };
    const res = data as { success?: boolean; error?: string; client_id?: string } | null;
    if (!res?.success) return { success: false, error: res?.error ?? "Erro ao vincular" };
    return { success: true };
  },
};
