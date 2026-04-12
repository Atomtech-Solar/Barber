import { supabase } from "@/lib/supabase";
import {
  assertBoundedPositiveAmount,
  requireCompanyId,
  requireUuid,
} from "@/lib/companyScope";
import { BusinessRuleError } from "@/lib/businessRules";
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
  /** Saldo acumulado antes do período (entradas - saídas em registros anteriores) */
  openingBalance: number;
  /** Total de entradas no período */
  income: number;
  /** Total de saídas no período */
  expense: number;
  /** Saldo Atual = openingBalance + income - expense */
  balance: number;
}

export interface CreateManualParams {
  company_id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  created_at?: string; // ISO string, default now
  created_by?: string;
}

export interface CreateFromProductPurchaseParams {
  company_id: string;
  product_name: string;
  amount: number;
  created_by?: string | null;
}

export interface CreateFromProductSaleParams {
  company_id: string;
  product_name: string;
  amount: number;
  created_by?: string | null;
}

export const financialService = {
  async createFromAppointment(params: CreateFromAppointmentParams) {
    requireCompanyId(params.company_id);
    requireUuid(params.appointment_id);
    assertBoundedPositiveAmount(Math.abs(Number(params.amount)));
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

  /** Despesa: compra de produto (entrada de estoque com preço de custo). */
  async createFromProductPurchase(params: CreateFromProductPurchaseParams) {
    requireCompanyId(params.company_id);
    const amount = Math.abs(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { data: null, error: new Error("Valor inválido para compra de produto") };
    }
    assertBoundedPositiveAmount(amount);
    const { data, error } = await supabase
      .from("financial_records")
      .insert({
        company_id: params.company_id,
        appointment_id: null,
        type: "expense",
        source: "product_purchase",
        description: `Compra de produto - ${params.product_name}`,
        amount,
        created_by: params.created_by ?? null,
        is_valid: true,
      })
      .select()
      .single();
    return { data: data as FinancialRecord, error };
  },

  /** Receita: venda de produto. */
  async createFromProductSale(params: CreateFromProductSaleParams) {
    requireCompanyId(params.company_id);
    const amount = Math.abs(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { data: null, error: new Error("Valor inválido para venda de produto") };
    }
    assertBoundedPositiveAmount(amount);
    const { data, error } = await supabase
      .from("financial_records")
      .insert({
        company_id: params.company_id,
        appointment_id: null,
        type: "income",
        source: "product_sale",
        description: `Venda de produto - ${params.product_name}`,
        amount,
        created_by: params.created_by ?? null,
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
    requireCompanyId(companyId);
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

  async createManual(params: CreateManualParams) {
    requireCompanyId(params.company_id);
    if (params.type !== "income" && params.type !== "expense") {
      return { data: null, error: new BusinessRuleError("Tipo de lançamento inválido.", "FIN_TYPE") };
    }
    const amount = Math.abs(Number(params.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { data: null, error: new BusinessRuleError("O valor deve ser maior que zero.", "FIN_AMOUNT") };
    }
    assertBoundedPositiveAmount(amount);
    const desc = params.description?.trim() ?? "";
    if (!desc || desc.length > 2000) {
      return { data: null, error: new BusinessRuleError("Descrição obrigatória (máx. 2000 caracteres).", "FIN_DESC") };
    }
    const { data, error } = await supabase
      .from("financial_records")
      .insert({
        company_id: params.company_id,
        appointment_id: null,
        type: params.type,
        source: "manual",
        description: desc,
        amount,
        created_at: params.created_at ?? new Date().toISOString(),
        created_by: params.created_by ?? null,
        is_valid: true,
      })
      .select()
      .single();
    return { data: data as FinancialRecord, error };
  },

  async getStats(
    companyId: string,
    opts: { startDate: string; endDate: string }
  ): Promise<{ data: FinancialStats; error: unknown }> {
    requireCompanyId(companyId);
    const periodStart = `${opts.startDate}T00:00:00`;
    const periodEnd = `${opts.endDate}T23:59:59`;

    const { data: recordsBefore, error: errBefore } = await supabase
      .from("financial_records")
      .select("type, amount")
      .eq("company_id", companyId)
      .eq("is_valid", true)
      .lt("created_at", periodStart);

    if (errBefore) {
      return {
        data: { openingBalance: 0, income: 0, expense: 0, balance: 0 },
        error: errBefore,
      };
    }

    let openingBalance = 0;
    (recordsBefore ?? []).forEach((r) => {
      const amt = Math.abs(Number(r.amount));
      openingBalance += r.type === "income" ? amt : -amt;
    });

    const { data: recordsInPeriod, error } = await supabase
      .from("financial_records")
      .select("type, amount")
      .eq("company_id", companyId)
      .eq("is_valid", true)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    if (error) {
      return {
        data: { openingBalance, income: 0, expense: 0, balance: openingBalance },
        error,
      };
    }

    let income = 0;
    let expense = 0;
    (recordsInPeriod ?? []).forEach((r) => {
      if (r.type === "income") income += Number(r.amount);
      else expense += Math.abs(Number(r.amount));
    });

    return {
      data: {
        openingBalance,
        income,
        expense,
        balance: openingBalance + income - expense,
      },
      error: null,
    };
  },
};
