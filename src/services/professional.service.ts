import { supabase } from "@/lib/supabase";
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
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("company_id", companyId)
      .order("name");
    return { data: (data ?? []) as Professional[], error };
  },

  async listByCompanyWithServices(companyId: string) {
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

  async getById(id: string) {
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("id", id)
      .single();
    return { data: data as Professional | null, error };
  },

  async getProfessionalsByServiceIds(companyId: string, serviceIds: string[]) {
    if (serviceIds.length === 0) return { data: [] as Professional[], error: null };

    const { data: links, error: linkError } = await supabase
      .from("professional_services")
      .select("professional_id")
      .in("service_id", serviceIds);

    if (linkError) return { data: [], error: linkError };

    const proIds = [...new Set((links ?? []).map((l) => l.professional_id))];
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

  async update(id: string, params: UpdateProfessionalParams, serviceIds?: string[], workingHours?: WorkingHourInput[]) {
    const { data, error } = await supabase
      .from("professionals")
      .update({ ...params, updated_at: new Date().toISOString() })
      .eq("id", id)
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

  async delete(id: string) {
    const { error } = await supabase.from("professionals").delete().eq("id", id);
    return { error };
  },
};
