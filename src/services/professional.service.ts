import { supabase } from "@/lib/supabase";
import { requireCompanyId, requireUuid } from "@/lib/companyScope";
import { BusinessRuleError } from "@/lib/businessRules";
import type { Professional, WorkingHour } from "@/types/database.types";

export interface CreateProfessionalParams {
  company_id: string;
  name: string;
  photo_url?: string;
  specialty?: string;
  phone?: string;
  email?: string;
  profile_id?: string;
}

export interface UpdateProfessionalParams {
  name?: string;
  photo_url?: string;
  specialty?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
}

export interface WorkingHourInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export const professionalService = {
  async listByCompany(companyId: string) {
    requireCompanyId(companyId);
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("company_id", companyId)
      .order("name");
    return { data: (data ?? []) as Professional[], error };
  },

  async listByCompanyWithServices(companyId: string) {
    requireCompanyId(companyId);
    const { data: professionals, error: profError } = await supabase
      .from("professionals")
      .select(`
        *,
        professional_services(service_id)
      `)
      .eq("company_id", companyId)
      .order("name");

    if (profError) return { data: [], error: profError };

    const { data: workingHours } = await supabase
      .from("working_hours")
      .select("*")
      .in(
        "professional_id",
        (professionals ?? []).map((p) => p.id)
      );

    const whByPro = (workingHours ?? []).reduce<Record<string, WorkingHour[]>>(
      (acc, wh) => {
        if (!acc[wh.professional_id]) acc[wh.professional_id] = [];
        acc[wh.professional_id].push(wh as WorkingHour);
        return acc;
      },
      {}
    );

    const result = (professionals ?? []).map((p) => ({
      ...p,
      professional_services: (p as { professional_services?: { service_id: string }[] })
        .professional_services ?? [],
      working_hours: whByPro[p.id] ?? [],
    }));

    return { data: result, error: null };
  },

  /** Lista profissionais ativos com nomes dos serviços (para landing pública) */
  async listByCompanyForSite(companyId: string) {
    requireCompanyId(companyId);
    const { data: professionals, error: profError } = await supabase
      .from("professionals")
      .select(`
        *,
        professional_services(service_id)
      `)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name");

    if (profError) return { data: [], error: profError };
    const items = (professionals ?? []) as Array<Professional & {
      professional_services?: { service_id: string }[];
    }>;

    const serviceIds = [
      ...new Set(
        items.flatMap((p) => (p.professional_services ?? []).map((ps) => ps.service_id))
      ),
    ];
    let serviceNamesById: Record<string, string> = {};
    if (serviceIds.length > 0) {
      const { data: services } = await supabase
        .from("services")
        .select("id, name")
        .in("id", serviceIds);
      serviceNamesById = Object.fromEntries(
        ((services ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name])
      );
    }

    const result = items.map((p) => ({
      ...p,
      serviceNames: (p.professional_services ?? [])
        .map((ps) => serviceNamesById[ps.service_id])
        .filter(Boolean),
    }));
    return { data: result, error: null };
  },

  async getById(id: string) {
    requireUuid(id);
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("id", id)
      .single();
    return { data: data as Professional | null, error };
  },

  /**
   * Retorna profissionais que fazem TODOS os serviços selecionados.
   * Ex: se selecionou barba + cabelo, só mostra quem faz os dois.
   */
  async getProfessionalsByServiceIds(companyId: string, serviceIds: string[]) {
    requireCompanyId(companyId);
    if (serviceIds.length === 0) return { data: [] as Professional[], error: null };
    serviceIds.forEach((sid) => requireUuid(sid));

    const { data: links, error: linkError } = await supabase
      .from("professional_services")
      .select("professional_id, service_id")
      .in("service_id", serviceIds);

    if (linkError) return { data: [], error: linkError };

    const byPro = (links ?? []).reduce<Record<string, Set<string>>>(
      (acc, row) => {
        const pid = row.professional_id;
        if (!acc[pid]) acc[pid] = new Set();
        acc[pid].add(row.service_id);
        return acc;
      },
      {}
    );

    const proIds = Object.entries(byPro)
      .filter(([, ids]) => ids.size === serviceIds.length)
      .map(([pid]) => pid);

    if (proIds.length === 0) return { data: [], error: null };

    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("company_id", companyId)
      .in("id", proIds)
      .eq("is_active", true)
      .order("name");

    return { data: (data ?? []) as Professional[], error };
  },

  async create(params: CreateProfessionalParams, serviceIds?: string[], workingHours?: WorkingHourInput[]) {
    requireCompanyId(params.company_id);
    serviceIds?.forEach((sid) => requireUuid(sid));
    const { data: prof, error: profError } = await supabase
      .from("professionals")
      .insert({
        company_id: params.company_id,
        name: params.name,
        photo_url: params.photo_url ?? null,
        specialty: params.specialty ?? null,
        phone: params.phone ?? null,
        email: params.email ?? null,
        profile_id: params.profile_id ?? null,
      })
      .select()
      .single();

    if (profError) return { data: null, error: profError };
    const professional = prof as Professional;

    if (serviceIds?.length && professional) {
      await supabase.from("professional_services").insert(
        serviceIds.map((sid) => ({
          professional_id: professional.id,
          service_id: sid,
        }))
      );
    }

    if (workingHours?.length && professional) {
      await supabase.from("working_hours").insert(
        workingHours.map((wh) => ({
          professional_id: professional.id,
          day_of_week: wh.day_of_week,
          start_time: wh.start_time,
          end_time: wh.end_time,
        }))
      );
    }

    return { data: professional, error: null };
  },

  async update(
    companyId: string,
    id: string,
    params: UpdateProfessionalParams,
    serviceIds?: string[],
    workingHours?: WorkingHourInput[]
  ) {
    requireCompanyId(companyId);
    requireUuid(id);
    serviceIds?.forEach((sid) => requireUuid(sid));
    const existing = await this.getById(id);
    if (existing.error || !existing.data) {
      return { data: null, error: existing.error ?? new BusinessRuleError("Profissional não encontrado.", "PRO_NOT_FOUND") };
    }
    if (existing.data.company_id !== companyId) {
      return { data: null, error: new BusinessRuleError("Profissional não pertence a esta empresa.", "PRO_TENANT") };
    }
    const { data, error } = await supabase
      .from("professionals")
      .update({ ...params, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) return { data: null, error };

    if (serviceIds !== undefined) {
      await supabase.from("professional_services").delete().eq("professional_id", id);
      if (serviceIds.length > 0) {
        await supabase.from("professional_services").insert(
          serviceIds.map((sid) => ({ professional_id: id, service_id: sid }))
        );
      }
    }

    if (workingHours !== undefined) {
      await supabase.from("working_hours").delete().eq("professional_id", id);
      if (workingHours.length > 0) {
        await supabase.from("working_hours").insert(
          workingHours.map((wh) => ({
            professional_id: id,
            day_of_week: wh.day_of_week,
            start_time: wh.start_time,
            end_time: wh.end_time,
          }))
        );
      }
    }

    return { data: data as Professional, error: null };
  },

  async delete(companyId: string, id: string) {
    requireCompanyId(companyId);
    requireUuid(id);
    const { data, error } = await supabase.rpc("safe_delete_professional", {
      p_professional_id: id,
      p_company_id: companyId,
    });
    if (error) return { error };
    const res = data as { success?: boolean; error?: string } | null;
    if (!res?.success) {
      return { error: new BusinessRuleError(res?.error ?? "Não foi possível excluir o profissional.", "PRO_DELETE") };
    }
    return { error: null };
  },
};
