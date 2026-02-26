import { supabase } from "@/lib/supabase";
import { addMinutes, parse, format, setHours, setMinutes } from "date-fns";
import type { Appointment, Service } from "@/types/database.types";
import { financialService } from "@/services/financial.service";

export interface CreateAppointmentParams {
  company_id: string;
  client_id: string;
  professional_id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  service_ids: string[];
  status?: "pending" | "confirmed" | "blocked";
  notes?: string;
}

/** Params para admin criar agendamento (cliente walk-in, sem conta) */
export interface CreateAdminAppointmentParams {
  company_id: string;
  client_name: string;
  client_phone: string;
  professional_id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  service_ids: string[];
  status?: Appointment["status"];
  notes?: string | null;
  created_by: string;
}

/** Params para atualizar agendamento */
export interface UpdateAppointmentParams {
  client_name?: string;
  client_phone?: string;
  professional_id?: string;
  date?: string;
  start_time?: string;
  duration_minutes?: number;
  status?: Appointment["status"];
  notes?: string | null;
  service_ids?: string[];
  /** Usuário que alterou (para auditoria financeira) */
  updated_by?: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
}

const SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_OPENING_TIME = "09:00";
const DEFAULT_CLOSING_TIME = "19:00";

function normalizeTime(value: string | null | undefined, fallback = "00:00") {
  return typeof value === "string" ? value.slice(0, 5) : fallback;
}

function timeToMinutes(value: string) {
  const [h, m] = normalizeTime(value, "00:00").split(":").map(Number);
  return h * 60 + m;
}

function ceilToSlotBoundary(minutes: number, step: number) {
  return Math.ceil(minutes / step) * step;
}

export const bookingService = {
  async listByCompany(companyId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from("appointments")
      .select("*")
      .eq("company_id", companyId)
      .order("date")
      .order("start_time");

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query;
    return { data: (data ?? []) as Appointment[], error };
  },

  async listByClient(clientId: string) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("client_id", clientId)
      .order("date", { ascending: false })
      .order("start_time");
    return { data: data ?? [], error };
  },

  async listByProfessionalAndDate(professionalId: string, date: string) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("professional_id", professionalId)
      .eq("date", date)
      .in("status", ["pending", "confirmed", "blocked"])
      .order("start_time");
    return { data: (data ?? []) as Appointment[], error };
  },

  async getAvailableSlots(
    companyId: string,
    professionalId: string,
    date: string,
    serviceIds: string[],
    serviceDurations: Record<string, number>
  ): Promise<{ data: AvailableSlot[]; error: unknown }> {
    const totalDuration = serviceIds.reduce((acc, sid) => acc + (serviceDurations[sid] ?? 0), 0);
    if (totalDuration <= 0) return { data: [], error: null };

    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("opening_time, closing_time")
      .eq("id", companyId)
      .single();

    if (companyError) return { data: [], error: companyError };

    const companyOpen = timeToMinutes(
      normalizeTime(companyData?.opening_time, DEFAULT_OPENING_TIME)
    );
    const companyClose = timeToMinutes(
      normalizeTime(companyData?.closing_time, DEFAULT_CLOSING_TIME)
    );

    if (companyClose <= companyOpen) return { data: [], error: null };

    const { data: wh, error: whError } = await supabase
      .from("working_hours")
      .select("*")
      .eq("professional_id", professionalId)
      .eq("day_of_week", new Date(date).getDay());

    if (whError) return { data: [], error: whError };
    if (!wh?.length) return { data: [], error: null };

    const { data: existing } = await this.listByProfessionalAndDate(professionalId, date);

    const slots: AvailableSlot[] = [];
    const dateStr = date;

    for (const w of wh) {
      const profStart = timeToMinutes(normalizeTime(w.start_time, DEFAULT_OPENING_TIME));
      const profEnd = timeToMinutes(normalizeTime(w.end_time, DEFAULT_CLOSING_TIME));

      const effectiveStart = ceilToSlotBoundary(
        Math.max(profStart, companyOpen),
        SLOT_INTERVAL_MINUTES
      );
      const effectiveEnd = Math.min(profEnd, companyClose);

      if (effectiveEnd <= effectiveStart) continue;

      let current = setMinutes(
        setHours(new Date(dateStr), Math.floor(effectiveStart / 60)),
        effectiveStart % 60
      );
      const end = setMinutes(
        setHours(new Date(dateStr), Math.floor(effectiveEnd / 60)),
        effectiveEnd % 60
      );

      while (addMinutes(current, totalDuration) <= end) {
        const startTime = format(current, "HH:mm");
        const endTime = format(addMinutes(current, totalDuration), "HH:mm");

        const overlaps = (existing ?? []).some((apt) => {
          const aptStart = parse(normalizeTime(apt.start_time), "HH:mm", new Date());
          const aptEnd = addMinutes(aptStart, apt.duration_minutes);
          const slotStart = parse(startTime, "HH:mm", new Date());
          const slotEnd = parse(endTime, "HH:mm", new Date());
          return slotStart < aptEnd && slotEnd > aptStart;
        });

        if (!overlaps) {
          slots.push({ startTime, endTime });
        }

        current = addMinutes(current, SLOT_INTERVAL_MINUTES);
      }
    }

    const ordered = slots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const deduped = ordered.filter(
      (slot, index, arr) => index === 0 || arr[index - 1].startTime !== slot.startTime
    );

    return { data: deduped, error: null };
  },

  async create(params: CreateAppointmentParams) {
    const { data: apt, error: aptError } = await supabase
      .from("appointments")
      .insert({
        company_id: params.company_id,
        client_id: params.client_id,
        professional_id: params.professional_id,
        date: params.date,
        start_time: params.start_time,
        duration_minutes: params.duration_minutes,
        status: params.status ?? "confirmed",
        notes: params.notes ?? null,
      })
      .select()
      .single();

    if (aptError) return { data: null, error: aptError };

    if (params.service_ids.length > 0) {
      await supabase.from("appointment_services").insert(
        params.service_ids.map((sid) => ({
          appointment_id: (apt as Appointment).id,
          service_id: sid,
        }))
      );
    }

    return { data: apt as Appointment, error: null };
  },

  async updateStatus(id: string, status: Appointment["status"]) {
    const { data, error } = await supabase
      .from("appointments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return { data: data as Appointment | null, error };
  },

  async getById(id: string) {
    const { data: apt, error: aptError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();
    if (aptError || !apt) return { data: null, error: aptError };
    const { data: svcLinks } = await supabase
      .from("appointment_services")
      .select("service_id")
      .eq("appointment_id", id);
    const serviceIds = (svcLinks ?? []).map((s) => s.service_id);
    let client_name = (apt as Appointment).client_name;
    let client_phone = (apt as Appointment).client_phone;
    if (
      ((apt as Appointment).client_id && !client_name) ||
      ((apt as Appointment).client_id && !client_phone)
    ) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", (apt as Appointment).client_id)
        .single();
      if (prof) {
        client_name = client_name ?? prof?.full_name ?? null;
        client_phone = client_phone ?? prof?.phone ?? null;
      }
    }
    return {
      data: {
        ...apt,
        client_name,
        client_phone,
        service_ids: serviceIds,
      } as Appointment & { service_ids: string[] },
      error: null,
    };
  },

  async createAdmin(params: CreateAdminAppointmentParams) {
    const { data: apt, error: aptError } = await supabase
      .from("appointments")
      .insert({
        company_id: params.company_id,
        client_id: null,
        client_name: params.client_name,
        client_phone: params.client_phone,
        professional_id: params.professional_id,
        date: params.date,
        start_time: params.start_time,
        duration_minutes: params.duration_minutes,
        status: params.status ?? "confirmed",
        notes: params.notes ?? null,
        created_by: params.created_by,
      })
      .select()
      .single();

    if (aptError) return { data: null, error: aptError };

    if (params.service_ids?.length) {
      await supabase.from("appointment_services").insert(
        params.service_ids.map((sid) => ({
          appointment_id: (apt as Appointment).id,
          service_id: sid,
        }))
      );
    }

    if (params.status === "completed") {
      const serviceIds = params.service_ids ?? [];
      const { data: servicesData } = serviceIds.length
        ? await supabase.from("services").select("id, name, price").in("id", serviceIds)
        : { data: [] as { id: string; name: string; price: number }[] };
      const services = (servicesData ?? []) as (Service & { price?: number })[];
      const { data: profData } = await supabase
        .from("professionals")
        .select("name")
        .eq("id", params.professional_id)
        .single();
      const professionalName = (profData as { name?: string } | null)?.name ?? "—";
      const clientName = params.client_name ?? "Cliente";
      const serviceNames = services.map((s) => s.name).filter(Boolean).join(" + ") || "Atendimento";
      const amount = services.reduce((sum, s) => sum + (Number(s.price) ?? 0), 0);
      await financialService.createFromAppointment({
        company_id: params.company_id,
        appointment_id: (apt as Appointment).id,
        service_name_snapshot: serviceNames,
        professional_name_snapshot: professionalName,
        client_name_snapshot: clientName,
        amount,
        created_by: params.created_by ?? "",
      });
    }

    return { data: apt as Appointment, error: null };
  },

  async update(id: string, params: UpdateAppointmentParams) {
    const { data: oldApt, error: fetchErr } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", id)
      .single();
    const oldStatus = fetchErr ? null : (oldApt?.status as Appointment["status"] | null);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      ...(params.client_name !== undefined && { client_name: params.client_name }),
      ...(params.client_phone !== undefined && { client_phone: params.client_phone }),
      ...(params.professional_id !== undefined && { professional_id: params.professional_id }),
      ...(params.date !== undefined && { date: params.date }),
      ...(params.start_time !== undefined && { start_time: params.start_time }),
      ...(params.duration_minutes !== undefined && { duration_minutes: params.duration_minutes }),
      ...(params.status !== undefined && { status: params.status }),
      ...(params.notes !== undefined && { notes: params.notes }),
    };

    const { data: apt, error: aptError } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (aptError) return { data: null, error: aptError };

    if (params.service_ids !== undefined) {
      await supabase.from("appointment_services").delete().eq("appointment_id", id);
      if (params.service_ids.length > 0) {
        await supabase.from("appointment_services").insert(
          params.service_ids.map((sid) => ({ appointment_id: id, service_id: sid }))
        );
      }
    }

    const newStatus = (apt as Appointment).status;

    if (params.status !== undefined && oldStatus !== newStatus) {
      if (newStatus === "completed") {
        const hasValid = await financialService.hasValidRecordForAppointment(id);
        if (!hasValid) {
          const fullApt = await this.getById(id);
          if (fullApt.data) {
            const aptData = fullApt.data as Appointment & { service_ids?: string[] };
            const serviceIds = aptData.service_ids ?? [];
            const { data: servicesData } = serviceIds.length
              ? await supabase.from("services").select("id, name, price").in("id", serviceIds)
              : { data: [] as { id: string; name: string; price: number }[] };
            const services = (servicesData ?? []) as (Service & { price?: number })[];
            const { data: profData } = await supabase
              .from("professionals")
              .select("name")
              .eq("id", aptData.professional_id)
              .single();
            const professionalName = (profData as { name?: string } | null)?.name ?? "—";
            const clientName = aptData.client_name ?? "Cliente";
            const serviceNames = services.map((s) => s.name).filter(Boolean).join(" + ") || "Atendimento";
            const amount = services.reduce((sum, s) => sum + (Number(s.price) ?? 0), 0);
            await financialService.createFromAppointment({
              company_id: aptData.company_id,
              appointment_id: id,
              service_name_snapshot: serviceNames,
              professional_name_snapshot: professionalName,
              client_name_snapshot: clientName,
              amount,
              created_by: params.updated_by ?? aptData.created_by ?? "",
            });
          }
        }
      } else if (oldStatus === "completed") {
        await financialService.invalidateByAppointmentId(id);
      }
    }

    return { data: apt as Appointment, error: null };
  },

  async delete(id: string) {
    await financialService.invalidateByAppointmentId(id);
    await supabase.from("appointment_services").delete().eq("appointment_id", id);
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    return { error };
  },

  async getTodayStats(companyId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, status, duration_minutes")
      .eq("company_id", companyId)
      .eq("date", today)
      .in("status", ["pending", "confirmed"]);

    if (error) return { appointmentsToday: 0, totalDuration: 0 };

    const appointmentsToday = appointments?.length ?? 0;
    const totalDuration =
      appointments?.reduce((acc, a) => acc + (a.duration_minutes ?? 0), 0) ?? 0;

    return { appointmentsToday, totalDuration };
  },
};
