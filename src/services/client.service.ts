import { supabase } from "@/lib/supabase";
import type { CompanyClient } from "@/types/database.types";

export interface CompanyClientWithVisitCount extends CompanyClient {
  visit_count: number;
}

export const clientService = {
  async listByCompany(companyId: string) {
    const { data: clients, error } = await supabase
      .from("company_clients")
      .select("*")
      .eq("company_id", companyId)
      .order("full_name");

    if (error) return { data: [] as CompanyClientWithVisitCount[], error };

    const { data: appointments } = await supabase
      .from("appointments")
      .select("client_phone, client_id")
      .eq("company_id", companyId);

    const visitByPhone: Record<string, number> = {};
    const visitByClientId: Record<string, number> = {};
    (appointments ?? []).forEach((a) => {
      if (a.client_phone) {
        const norm = a.client_phone.replace(/\D/g, "");
        visitByPhone[norm] = (visitByPhone[norm] ?? 0) + 1;
      }
      if (a.client_id) {
        visitByClientId[a.client_id] = (visitByClientId[a.client_id] ?? 0) + 1;
      }
    });

    const result = (clients ?? []).map((c) => {
      const phoneNorm = (c.phone ?? "").replace(/\D/g, "");
      const visit_count = phoneNorm ? (visitByPhone[phoneNorm] ?? 0) : 0;
      return { ...c, visit_count } as CompanyClientWithVisitCount;
    });

    return { data: result.sort((a, b) => b.visit_count - a.visit_count), error: null };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("company_clients")
      .select("*")
      .eq("id", id)
      .single();
    return { data: data as CompanyClient | null, error };
  },

  async create(companyId: string, params: { full_name: string; phone?: string; email?: string; cpf?: string; notes?: string }) {
    const { data, error } = await supabase
      .from("company_clients")
      .insert({
        company_id: companyId,
        full_name: params.full_name,
        phone: params.phone || null,
        email: params.email || null,
        cpf: params.cpf || null,
        notes: params.notes || null,
      })
      .select()
      .single();
    return { data: data as CompanyClient, error };
  },

  async update(
    id: string,
    params: { full_name?: string; phone?: string; email?: string; cpf?: string; notes?: string }
  ) {
    const { data, error } = await supabase
      .from("company_clients")
      .update({
        ...params,
        cpf: params.cpf || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    return { data: data as CompanyClient, error };
  },

  async delete(id: string) {
    const { error } = await supabase.from("company_clients").delete().eq("id", id);
    return { error };
  },
};
