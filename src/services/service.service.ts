import { supabase } from "@/lib/supabase";
import { requireCompanyId, requireUuid } from "@/lib/companyScope";
import type { Service } from "@/types/database.types";

export interface CreateServiceParams {
  company_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  category?: string;
}

export interface UpdateServiceParams {
  name?: string;
  duration_minutes?: number;
  price?: number;
  category?: string;
}

export const serviceService = {
  async listByCompany(companyId: string) {
    requireCompanyId(companyId);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("company_id", companyId)
      .order("name");
    return { data: (data ?? []) as Service[], error };
  },

  async getById(id: string) {
    requireUuid(id);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .single();
    return { data: data as Service | null, error };
  },

  async create(params: CreateServiceParams) {
    requireCompanyId(params.company_id);
    const { data, error } = await supabase
      .from("services")
      .insert({
        company_id: params.company_id,
        name: params.name,
        duration_minutes: params.duration_minutes,
        price: params.price,
        category: params.category ?? null,
      })
      .select()
      .single();
    return { data: data as Service | null, error };
  },

  async update(id: string, params: UpdateServiceParams) {
    requireUuid(id);
    const { data, error } = await supabase
      .from("services")
      .update({ ...params, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return { data: data as Service | null, error };
  },

  async delete(id: string) {
    requireUuid(id);
    const { error } = await supabase.from("services").delete().eq("id", id);
    return { error };
  },
};
