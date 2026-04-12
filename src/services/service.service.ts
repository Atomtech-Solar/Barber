import { supabase } from "@/lib/supabase";
import { requireCompanyId, requireUuid } from "@/lib/companyScope";
import { BusinessRuleError } from "@/lib/businessRules";
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

const MAX_SERVICE_NAME = 200;

async function assertUniqueServiceName(
  companyId: string,
  name: string,
  excludeServiceId?: string
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new BusinessRuleError("Nome do serviço é obrigatório.", "SERVICE_NAME");
  const { data: rows, error } = await supabase.from("services").select("id, name").eq("company_id", companyId);
  if (error) throw error;
  const lower = trimmed.toLowerCase();
  const dup = (rows ?? []).find(
    (r) => (r as { name: string }).name.trim().toLowerCase() === lower && (r as { id: string }).id !== excludeServiceId
  );
  if (dup) {
    throw new BusinessRuleError("Já existe um serviço com este nome nesta empresa.", "SERVICE_DUP");
  }
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
    const name = params.name?.trim() ?? "";
    if (name.length > MAX_SERVICE_NAME) {
      return { data: null, error: new BusinessRuleError("Nome do serviço muito longo.", "SERVICE_NAME") };
    }
    const duration = Number(params.duration_minutes);
    if (!Number.isFinite(duration) || duration <= 0) {
      return { data: null, error: new BusinessRuleError("Duração deve ser maior que zero.", "SERVICE_DURATION") };
    }
    const price = Number(params.price);
    if (!Number.isFinite(price) || price < 0) {
      return { data: null, error: new BusinessRuleError("Preço inválido.", "SERVICE_PRICE") };
    }
    try {
      await assertUniqueServiceName(params.company_id, name);
    } catch (e) {
      return { data: null, error: e };
    }
    const { data, error } = await supabase
      .from("services")
      .insert({
        company_id: params.company_id,
        name,
        duration_minutes: duration,
        price,
        category: params.category?.trim() || null,
      })
      .select()
      .single();
    return { data: data as Service | null, error };
  },

  async update(companyId: string, id: string, params: UpdateServiceParams) {
    requireCompanyId(companyId);
    requireUuid(id);
    const existing = await this.getById(id);
    if (existing.error || !existing.data) {
      return { data: null, error: existing.error ?? new BusinessRuleError("Serviço não encontrado.", "SERVICE_NOT_FOUND") };
    }
    if (existing.data.company_id !== companyId) {
      return { data: null, error: new BusinessRuleError("Serviço não pertence a esta empresa.", "SERVICE_TENANT") };
    }
    const nextName = params.name !== undefined ? params.name.trim() : existing.data.name;
    if (nextName.length > MAX_SERVICE_NAME) {
      return { data: null, error: new BusinessRuleError("Nome do serviço muito longo.", "SERVICE_NAME") };
    }
    if (params.name !== undefined) {
      try {
        await assertUniqueServiceName(companyId, nextName, id);
      } catch (e) {
        return { data: null, error: e };
      }
    }
    if (params.duration_minutes !== undefined) {
      const d = Number(params.duration_minutes);
      if (!Number.isFinite(d) || d <= 0) {
        return { data: null, error: new BusinessRuleError("Duração deve ser maior que zero.", "SERVICE_DURATION") };
      }
    }
    if (params.price !== undefined) {
      const p = Number(params.price);
      if (!Number.isFinite(p) || p < 0) {
        return { data: null, error: new BusinessRuleError("Preço inválido.", "SERVICE_PRICE") };
      }
    }
    const { data, error } = await supabase
      .from("services")
      .update({ ...params, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();
    return { data: data as Service | null, error };
  },

  async delete(companyId: string, id: string) {
    requireCompanyId(companyId);
    requireUuid(id);
    const { data, error } = await supabase.rpc("safe_delete_service", {
      p_service_id: id,
      p_company_id: companyId,
    });
    if (error) return { error };
    const res = data as { success?: boolean; error?: string } | null;
    if (!res?.success) {
      return { error: new BusinessRuleError(res?.error ?? "Não foi possível excluir o serviço.", "SERVICE_DELETE") };
    }
    return { error: null };
  },
};
