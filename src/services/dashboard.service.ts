import { supabase } from "@/lib/supabase";
import { addDays, differenceInCalendarDays, format, subDays } from "date-fns";

export type DashboardRangeKey = "today" | "7d" | "30d" | "month";

export interface DashboardRange {
  startDate: string;
  endDate: string;
}

export interface DashboardSummary {
  revenue: number;
  appointments: number;
  clientsServed: number;
  averageTicket: number;
  growthPercent: number;
}

export interface DashboardRevenuePoint {
  date: string;
  value: number;
}

export interface DashboardServicePoint {
  serviceName: string;
  quantity: number;
}

export interface DashboardPaymentPoint {
  method: "Pix" | "Dinheiro" | "Cartao" | "Outros";
  value: number;
}

export interface DashboardActivityItem {
  id: string;
  time: string;
  client: string;
  service: string;
  professional: string;
  amount: number;
  status: string;
}

function getRangeDays(range: DashboardRange) {
  return differenceInCalendarDays(new Date(range.endDate), new Date(range.startDate)) + 1;
}

function toIsoDay(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function getDashboardRange(key: DashboardRangeKey): DashboardRange {
  const today = new Date();
  const todayStr = toIsoDay(today);

  if (key === "today") {
    return { startDate: todayStr, endDate: todayStr };
  }
  if (key === "7d") {
    return { startDate: toIsoDay(subDays(today, 6)), endDate: todayStr };
  }
  if (key === "30d") {
    return { startDate: toIsoDay(subDays(today, 29)), endDate: todayStr };
  }

  return { startDate: format(today, "yyyy-MM-01"), endDate: todayStr };
}

function getPreviousRange(range: DashboardRange): DashboardRange {
  const days = getRangeDays(range);
  const start = subDays(new Date(range.startDate), days);
  const end = subDays(new Date(range.startDate), 1);
  return { startDate: toIsoDay(start), endDate: toIsoDay(end) };
}

function normalizeGrowth(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export const dashboardService = {
  async getSummary(companyId: string, range: DashboardRange) {
    const prevRange = getPreviousRange(range);

    const [{ data: appointments }, { data: revenueNow }, { data: revenuePrev }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, status")
        .eq("company_id", companyId)
        .gte("date", range.startDate)
        .lte("date", range.endDate),
      supabase
        .from("financial_records")
        .select("amount")
        .eq("company_id", companyId)
        .eq("type", "income")
        .eq("is_valid", true)
        .gte("created_at", `${range.startDate}T00:00:00`)
        .lte("created_at", `${range.endDate}T23:59:59`),
      supabase
        .from("financial_records")
        .select("amount")
        .eq("company_id", companyId)
        .eq("type", "income")
        .eq("is_valid", true)
        .gte("created_at", `${prevRange.startDate}T00:00:00`)
        .lte("created_at", `${prevRange.endDate}T23:59:59`),
    ]);

    const totalAppointments = appointments?.length ?? 0;
    const completed = (appointments ?? []).filter((a) => a.status === "completed").length;
    const revenue = (revenueNow ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
    const previousRevenue = (revenuePrev ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      data: {
        revenue,
        appointments: totalAppointments,
        clientsServed: completed,
        averageTicket: totalAppointments > 0 ? revenue / totalAppointments : 0,
        growthPercent: normalizeGrowth(revenue, previousRevenue),
      } as DashboardSummary,
      error: null,
    };
  },

  async getRevenue(companyId: string, range: DashboardRange) {
    const { data, error } = await supabase
      .from("financial_records")
      .select("amount, created_at")
      .eq("company_id", companyId)
      .eq("type", "income")
      .eq("is_valid", true)
      .gte("created_at", `${range.startDate}T00:00:00`)
      .lte("created_at", `${range.endDate}T23:59:59`);

    if (error) return { data: [] as DashboardRevenuePoint[], error };

    const days = getRangeDays(range);
    const byDate: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = toIsoDay(addDays(new Date(range.startDate), i));
      byDate[d] = 0;
    }

    (data ?? []).forEach((row) => {
      const d = String(row.created_at).slice(0, 10);
      byDate[d] = (byDate[d] ?? 0) + Number(row.amount);
    });

    return {
      data: Object.entries(byDate).map(([date, value]) => ({ date, value })),
      error: null,
    };
  },

  async getTopServices(companyId: string, range: DashboardRange) {
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("status, appointment_services(service_id)")
      .eq("company_id", companyId)
      .eq("status", "completed")
      .gte("date", range.startDate)
      .lte("date", range.endDate);

    if (error) return { data: [] as DashboardServicePoint[], error };

    const countByService: Record<string, number> = {};
    (appointments ?? []).forEach((apt: { appointment_services?: { service_id: string }[] }) => {
      (apt.appointment_services ?? []).forEach((svc) => {
        countByService[svc.service_id] = (countByService[svc.service_id] ?? 0) + 1;
      });
    });

    const ids = Object.keys(countByService);
    if (ids.length === 0) return { data: [] as DashboardServicePoint[], error: null };

    const { data: services } = await supabase.from("services").select("id, name").in("id", ids);
    const nameById = Object.fromEntries(
      ((services ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name])
    );

    const result = ids
      .map((id) => ({ serviceName: nameById[id] ?? "—", quantity: countByService[id] }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return { data: result, error: null };
  },

  async getPayments(companyId: string, range: DashboardRange) {
    const { data, error } = await supabase
      .from("financial_records")
      .select("source, amount")
      .eq("company_id", companyId)
      .eq("type", "income")
      .eq("is_valid", true)
      .gte("created_at", `${range.startDate}T00:00:00`)
      .lte("created_at", `${range.endDate}T23:59:59`);

    if (error) return { data: [] as DashboardPaymentPoint[], error };

    const totals: Record<DashboardPaymentPoint["method"], number> = {
      Pix: 0,
      Dinheiro: 0,
      Cartao: 0,
      Outros: 0,
    };

    // Como ainda não há payment_method persistido, usamos source como proxy temporário.
    (data ?? []).forEach((row) => {
      const source = String(row.source ?? "");
      const amount = Number(row.amount ?? 0);
      if (source === "product") totals.Pix += amount;
      else if (source === "manual") totals.Dinheiro += amount;
      else if (source === "appointment") totals.Cartao += amount;
      else totals.Outros += amount;
    });

    const result: DashboardPaymentPoint[] = [
      { method: "Pix", value: totals.Pix },
      { method: "Dinheiro", value: totals.Dinheiro },
      { method: "Cartao", value: totals.Cartao },
      { method: "Outros", value: totals.Outros },
    ];

    return { data: result, error: null };
  },

  async getRecentActivity(companyId: string, range: DashboardRange) {
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, date, start_time, client_name, professional_id, status, appointment_services(service_id)")
      .eq("company_id", companyId)
      .gte("date", range.startDate)
      .lte("date", range.endDate)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(10);

    if (error) return { data: [] as DashboardActivityItem[], error };

    const aptIds = (appointments ?? []).map((a) => a.id);
    const profIds = [...new Set((appointments ?? []).map((a) => a.professional_id))];
    const serviceIds = [
      ...new Set(
        (appointments ?? []).flatMap((a) =>
          ((a as { appointment_services?: { service_id: string }[] }).appointment_services ?? []).map(
            (s) => s.service_id
          )
        )
      ),
    ];

    const [{ data: professionals }, { data: services }, { data: revenue }] = await Promise.all([
      profIds.length
        ? supabase.from("professionals").select("id, name").in("id", profIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      serviceIds.length
        ? supabase.from("services").select("id, name").in("id", serviceIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      aptIds.length
        ? supabase
            .from("financial_records")
            .select("appointment_id, amount")
            .eq("company_id", companyId)
            .eq("type", "income")
            .eq("is_valid", true)
            .in("appointment_id", aptIds)
        : Promise.resolve({ data: [] as { appointment_id: string; amount: number }[] }),
    ]);

    const profById = Object.fromEntries(
      ((professionals ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
    );
    const serviceById = Object.fromEntries(
      ((services ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name])
    );
    const revenueByApt = Object.fromEntries(
      ((revenue ?? []) as { appointment_id: string; amount: number }[]).map((r) => [
        r.appointment_id,
        Number(r.amount),
      ])
    );

    const items: DashboardActivityItem[] = (appointments ?? []).map((apt) => {
      const serviceName =
        ((apt as { appointment_services?: { service_id: string }[] }).appointment_services ?? [])
          .map((s) => serviceById[s.service_id] ?? "—")
          .join(" + ") || "—";

      return {
        id: apt.id,
        time: `${apt.date} ${String(apt.start_time).slice(0, 5)}`,
        client: apt.client_name ?? "Cliente",
        service: serviceName,
        professional: profById[apt.professional_id] ?? "—",
        amount: revenueByApt[apt.id] ?? 0,
        status: apt.status,
      };
    });

    return { data: items, error: null };
  },
};
