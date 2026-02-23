import { supabase } from "@/lib/supabase";
import { addMinutes, parse, format, setHours, setMinutes } from "date-fns";
import type { Appointment } from "@/types/database.types";

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

export interface AvailableSlot {
  startTime: string;
  endTime: string;
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

    const norm = (t: string) => (typeof t === "string" ? t.slice(0, 5) : "09:00");

    for (const w of wh) {
      const [sh, sm] = norm(w.start_time).split(":").map(Number);
      const [eh, em] = norm(w.end_time).split(":").map(Number);
      let current = setMinutes(setHours(new Date(dateStr), sh), sm);
      const end = setMinutes(setHours(new Date(dateStr), eh), em);

      while (addMinutes(current, totalDuration) <= end) {
        const startTime = format(current, "HH:mm");
        const endTime = format(addMinutes(current, totalDuration), "HH:mm");

        const overlaps = (existing ?? []).some((apt) => {
          const aptStart = parse(norm(apt.start_time), "HH:mm", new Date());
          const aptEnd = addMinutes(aptStart, apt.duration_minutes);
          const slotStart = parse(startTime, "HH:mm", new Date());
          const slotEnd = parse(endTime, "HH:mm", new Date());
          return slotStart < aptEnd && slotEnd > aptStart;
        });

        if (!overlaps) {
          slots.push({ startTime, endTime });
        }

        current = addMinutes(current, 30);
      }
    }

    return { data: slots, error: null };
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
