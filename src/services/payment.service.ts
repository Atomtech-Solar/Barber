import { supabase } from "@/lib/supabase";
import { requireCompanyId, requireUuid } from "@/lib/companyScope";
import type {
  ProfessionalPaymentSettings,
  ProfessionalServiceCommission,
  MonthlyProfessionalSummary,
} from "@/types/database.types";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

export interface PaymentSettingsWithProfessional extends ProfessionalPaymentSettings {
  professional_name?: string;
}

export interface ProfessionalWithPayment extends PaymentSettingsWithProfessional {
  professional_name: string;
}

export interface ServiceCommissionWithName extends ProfessionalServiceCommission {
  service_name?: string;
}

export interface MonthPreview {
  total_faturado: number;
  ponto_equilibrio: number;
  excedente: number;
  total_comissao_excedente: number;
  salario_fixo: number;
  valor_final: number;
  fechado: boolean;
  /** Número de agendamentos com status = completed no mês */
  atendimentos_count: number;
}

function toIsoMonth(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function calcPaymentValues(
  totalFaturado: number,
  salarioFixo: number,
  percentual: number
): {
  ponto_equilibrio: number;
  excedente: number;
  total_comissao_excedente: number;
  valor_final: number;
} {
  if (percentual <= 0) {
    return {
      ponto_equilibrio: 0,
      excedente: 0,
      total_comissao_excedente: 0,
      valor_final: salarioFixo,
    };
  }
  const pontoEquilibrio = salarioFixo / (percentual / 100);
  if (totalFaturado <= pontoEquilibrio) {
    return {
      ponto_equilibrio: pontoEquilibrio,
      excedente: 0,
      total_comissao_excedente: 0,
      valor_final: salarioFixo,
    };
  }
  const excedente = totalFaturado - pontoEquilibrio;
  const totalComissaoExcedente = excedente * (percentual / 100);
  const valorFinal = salarioFixo + totalComissaoExcedente;
  return {
    ponto_equilibrio: pontoEquilibrio,
    excedente,
    total_comissao_excedente: totalComissaoExcedente,
    valor_final: valorFinal,
  };
}

export const paymentService = {
  async listProfessionalsWithSettings(companyId: string) {
    requireCompanyId(companyId);
    const [{ data: professionals, error: profError }, { data: settings }] = await Promise.all([
      supabase
        .from("professionals")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("professional_payment_settings")
        .select("*")
        .eq("company_id", companyId),
    ]);

    if (profError) return { data: [] as ProfessionalWithPayment[], error: profError };

    const settingsByProf = Object.fromEntries(
      (settings ?? []).map((s) => [s.professional_id, s as ProfessionalPaymentSettings])
    );

    const result: ProfessionalWithPayment[] = (professionals ?? []).map((p) => {
      const s = settingsByProf[p.id];
      return {
        id: s?.id ?? "",
        company_id: companyId,
        professional_id: p.id,
        salario_fixo_mensal: s?.salario_fixo_mensal ?? 0,
        percentual_comissao_padrao: s?.percentual_comissao_padrao ?? 20,
        fechamento_dia: s?.fechamento_dia ?? 30,
        ativo: s?.ativo ?? true,
        created_at: s?.created_at ?? "",
        updated_at: s?.updated_at ?? "",
        professional_name: p.name,
      };
    });

    return { data: result, error: null };
  },

  async listProfessionalsWithCurrentMonthPreview(companyId: string, monthStr?: string) {
    requireCompanyId(companyId);
    const month = monthStr ?? format(new Date(), "yyyy-MM");
    const { data: list, error } = await this.listProfessionalsWithSettings(companyId);
    if (error || !list) return { data: [] as (ProfessionalWithPayment & MonthPreview)[], error };

    const withPreview = await Promise.all(
      list.map(async (p) => {
        const preview = await this.getMonthlyPreview(companyId, p.professional_id, month);
        return { ...p, ...preview };
      })
    );
    return { data: withPreview, error: null };
  },

  async updateSettings(
    companyId: string,
    professionalId: string,
    params: {
      salario_fixo_mensal?: number;
      percentual_comissao_padrao?: number;
      fechamento_dia?: number;
      ativo?: boolean;
    }
  ) {
    requireCompanyId(companyId);
    requireUuid(professionalId);
    const { data, error } = await supabase
      .from("professional_payment_settings")
      .upsert(
        {
          company_id: companyId,
          professional_id: professionalId,
          ...params,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,professional_id" }
      )
      .select()
      .single();
    return { data: data as ProfessionalPaymentSettings | null, error };
  },

  async listServiceCommissions(companyId: string, professionalId: string) {
    requireCompanyId(companyId);
    requireUuid(professionalId);
    const { data: rows, error } = await supabase
      .from("professional_service_commissions")
      .select("id, service_id, percentual, created_at")
      .eq("company_id", companyId)
      .eq("professional_id", professionalId);

    if (error) return { data: [] as ServiceCommissionWithName[], error };

    const serviceIds = [...new Set((rows ?? []).map((r) => r.service_id))];
    const { data: services } =
      serviceIds.length > 0
        ? await supabase.from("services").select("id, name").in("id", serviceIds)
        : { data: [] as { id: string; name: string }[] };

    const nameById = Object.fromEntries((services ?? []).map((s) => [s.id, s.name]));

    const result: ServiceCommissionWithName[] = (rows ?? []).map((r) => ({
      ...r,
      company_id: companyId,
      professional_id: professionalId,
      service_name: nameById[r.service_id] ?? "—",
    }));

    return { data: result, error: null };
  },

  async setServiceCommission(
    companyId: string,
    professionalId: string,
    serviceId: string,
    percentual: number
  ) {
    requireCompanyId(companyId);
    requireUuid(professionalId);
    requireUuid(serviceId);
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
      throw new Error("Percentual inválido.");
    }
    const { data, error } = await supabase
      .from("professional_service_commissions")
      .upsert(
        {
          company_id: companyId,
          professional_id: professionalId,
          service_id: serviceId,
          percentual,
        },
        { onConflict: "company_id,professional_id,service_id" }
      )
      .select()
      .single();
    return { data: data as ProfessionalServiceCommission | null, error };
  },

  async removeServiceCommission(companyId: string, professionalId: string, serviceId: string) {
    requireCompanyId(companyId);
    requireUuid(professionalId);
    requireUuid(serviceId);
    const { error } = await supabase
      .from("professional_service_commissions")
      .delete()
      .eq("company_id", companyId)
      .eq("professional_id", professionalId)
      .eq("service_id", serviceId);
    return { error };
  },

  /**
   * Faturamento do profissional no mês: soma dos valores de financial_records
   * (type=income, source=appointment, is_valid=true) cujo agendamento pertence ao profissional.
   * Fluxo: financial_records → appointment_id → appointments → professional_id.
   * Apenas dados reais; sem mocks.
   */
  async getMonthlyRevenue(companyId: string, professionalId: string, monthStr: string): Promise<number> {
    requireCompanyId(companyId);
    requireUuid(professionalId);
    const mes = parseISO(monthStr + "-01");
    const periodStart = `${format(startOfMonth(mes), "yyyy-MM-dd")}T00:00:00`;
    const periodEnd = `${format(endOfMonth(mes), "yyyy-MM-dd")}T23:59:59`;

    const { data: records, error: errRecords } = await supabase
      .from("financial_records")
      .select("appointment_id, amount")
      .eq("company_id", companyId)
      .eq("type", "income")
      .eq("source", "appointment")
      .eq("is_valid", true)
      .not("appointment_id", "is", null)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    if (errRecords || !records?.length) return 0;

    const appointmentIds = [...new Set(records.map((r) => r.appointment_id).filter(Boolean) as string[])];

    const { data: appointments, error: errAppointments } = await supabase
      .from("appointments")
      .select("id, professional_id")
      .eq("company_id", companyId)
      .in("id", appointmentIds);

    if (errAppointments || !appointments?.length) return 0;

    const professionalAppointmentIds = new Set(
      appointments.filter((a) => a.professional_id === professionalId).map((a) => a.id)
    );

    const amountByAppointmentId = new Map<string, number>();
    for (const r of records) {
      if (!r.appointment_id) continue;
      const amt = Number(r.amount);
      if (!Number.isFinite(amt)) continue;
      amountByAppointmentId.set(r.appointment_id, (amountByAppointmentId.get(r.appointment_id) ?? 0) + amt);
    }

    let total = 0;
    for (const aptId of professionalAppointmentIds) {
      total += amountByAppointmentId.get(aptId) ?? 0;
    }
    return total;
  },

  /**
   * Conta quantos agendamentos concluídos o profissional realizou no mês.
   * appointments.professional_id = profissional, status = 'completed', date no mês.
   */
  async getMonthlyCompletedCount(
    companyId: string,
    professionalId: string,
    monthStr: string
  ): Promise<number> {
    requireCompanyId(companyId);
    requireUuid(professionalId);
    const mes = parseISO(monthStr + "-01");
    const start = format(startOfMonth(mes), "yyyy-MM-dd");
    const end = format(endOfMonth(mes), "yyyy-MM-dd");

    const { count, error } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("professional_id", professionalId)
      .eq("status", "completed")
      .gte("date", start)
      .lte("date", end);

    if (error) return 0;
    return count ?? 0;
  },

  async getMonthlyPreview(
    companyId: string,
    professionalId: string,
    monthStr: string
  ): Promise<MonthPreview> {
    requireCompanyId(companyId);
    requireUuid(professionalId);
    const mes = parseISO(monthStr + "-01");
    const start = toIsoMonth(startOfMonth(mes));

    const { data: settings } = await supabase
      .from("professional_payment_settings")
      .select("salario_fixo_mensal, percentual_comissao_padrao")
      .eq("company_id", companyId)
      .eq("professional_id", professionalId)
      .maybeSingle();

    const salarioFixo = Number(settings?.salario_fixo_mensal ?? 0);
    const percentual = Number(settings?.percentual_comissao_padrao ?? 20);

    const [totalFaturado, atendimentosCount] = await Promise.all([
      this.getMonthlyRevenue(companyId, professionalId, monthStr),
      this.getMonthlyCompletedCount(companyId, professionalId, monthStr),
    ]);
    const calc = calcPaymentValues(totalFaturado, salarioFixo, percentual);

    const { data: summary } = await supabase
      .from("monthly_professional_summary")
      .select("fechado")
      .eq("company_id", companyId)
      .eq("professional_id", professionalId)
      .eq("mes", start)
      .maybeSingle();

    return {
      total_faturado: totalFaturado,
      ponto_equilibrio: calc.ponto_equilibrio,
      excedente: calc.excedente,
      total_comissao_excedente: calc.total_comissao_excedente,
      salario_fixo: salarioFixo,
      valor_final: calc.valor_final,
      fechado: summary?.fechado ?? false,
      atendimentos_count: atendimentosCount,
    };
  },

  async closeMonth(companyId: string, professionalId: string, monthStr: string) {
    requireCompanyId(companyId);
    requireUuid(professionalId);
    const preview = await this.getMonthlyPreview(companyId, professionalId, monthStr);
    const mes = monthStr + "-01";

    const { data, error } = await supabase
      .from("monthly_professional_summary")
      .upsert(
        {
          company_id: companyId,
          professional_id: professionalId,
          mes,
          total_faturado: preview.total_faturado,
          ponto_equilibrio: preview.ponto_equilibrio,
          excedente: preview.excedente,
          total_comissao_excedente: preview.total_comissao_excedente,
          salario_fixo: preview.salario_fixo,
          valor_final: preview.valor_final,
          fechado: true,
        },
        { onConflict: "company_id,professional_id,mes" }
      )
      .select()
      .single();

    return { data: data as MonthlyProfessionalSummary | null, error };
  },

  async getMonthlySummary(companyId: string, professionalId: string, monthStr: string) {
    requireCompanyId(companyId);
    requireUuid(professionalId);
    const mes = monthStr + "-01";
    const { data, error } = await supabase
      .from("monthly_professional_summary")
      .select("*")
      .eq("company_id", companyId)
      .eq("professional_id", professionalId)
      .eq("mes", mes)
      .maybeSingle();

    if (error) return { data: null, error };
    if (data) return { data: data as MonthlyProfessionalSummary, error: null };

    const preview = await this.getMonthlyPreview(companyId, professionalId, monthStr);
    return {
      data: {
        id: "",
        company_id: companyId,
        professional_id: professionalId,
        mes,
        total_faturado: preview.total_faturado,
        ponto_equilibrio: preview.ponto_equilibrio,
        excedente: preview.excedente,
        total_comissao_excedente: preview.total_comissao_excedente,
        salario_fixo: preview.salario_fixo,
        valor_final: preview.valor_final,
        fechado: preview.fechado,
        created_at: "",
      } as MonthlyProfessionalSummary,
      error: null,
    };
  },
};
