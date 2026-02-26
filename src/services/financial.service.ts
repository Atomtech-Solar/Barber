import { supabase } from "@/lib/supabase";
import type { FinancialRecord } from "@/types/database.types";

export interface CreateFromAppointmentParams {
  company_id: string;
  appointment_id: string;
  service_name_snapshot: string;
  professional_name_snapshot: string;
  client_name_snapshot: string;
  amount: number;
  created_by: string;
}

export interface FinancialStats {
  incomeToday: number;
  expenseToday: number;
  balanceToday: number;
}

export const financialService = {
  async createFromAppointment(params: CreateFromAppointmentParams) {
    const { data, error } = await supabase
      .from("financial_records")
      .insert({
        company_id: params.company_id,
        appointment_id: params.appointment_id,
        type: "income",
        source: "appointment",
        description: `${params.service_name_snapshot} - ${params.client_name_snapshot}`,
        amount: params.amount,
        service_name_snapshot: params.service_name_snapshot,
        client_name_snapshot: params.client_name_snapshot,
        professional_name_snapshot: params.professional_name_snapshot,
        created_by: params.created_by,
        is_valid: true,
      })
      .select()
      .single();
    return { data: data as FinancialRecord, error };
  },

  async invalidateByAppointmentId(appointmentId: string) {
    const { error } = await supabase
      .from("financial_records")
      .update({ is_valid: false })
      .eq("appointment_id", appointmentId)
      .eq("source", "appointment");
    return { error };
  },

  async hasValidRecordForAppointment(appointmentId: string): Promise<boolean> {
    const { data } = await supabase
      .from("financial_records")
      .select("id")
      .eq("appointment_id", appointmentId)
      .eq("is_valid", true)
      .limit(1);
    return (data?.length ?? 0) > 0;
  },

  async listByCompany(
    companyId: string,
    opts?: { startDate?: string; endDate?: string; validOnly?: boolean }
  ) {
    let query = supabase
      .from("financial_records")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (opts?.validOnly !== false) {
      query = query.eq("is_valid", true);
    }
    if (opts?.startDate) {
      query = query.gte("created_at", `${opts.startDate}T00:00:00`);
    }
    if (opts?.endDate) {
      query = query.lte("created_at", `${opts.endDate}T23:59:59`);
    }

    const { data, error } = await query;
    return { data: (data ?? []) as FinancialRecord[], error };
  },

  async getStats(companyId: string): Promise<{ data: FinancialStats; error: unknown }> {
    const today = new Date().toISOString().slice(0, 10);
    const start = `${today}T00:00:00`;
    const end = `${today}T23:59:59`;

    const { data: records, error } = await supabase
      .from("financial_records")
      .select("type, amount")
      .eq("company_id", companyId)
      .eq("is_valid", true)
      .gte("created_at", start)
      .lte("created_at", end);

    if (error) return { data: { incomeToday: 0, expenseToday: 0, balanceToday: 0 }, error };

    let incomeToday = 0;
    let expenseToday = 0;
    (records ?? []).forEach((r) => {
      if (r.type === "income") incomeToday += Number(r.amount);
      else expenseToday += Number(r.amount);
    });

    return {
      data: {
        incomeToday,
        expenseToday,
        balanceToday: incomeToday - expenseToday,
      },
      error: null,
    };
  },
};
