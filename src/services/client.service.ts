import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database.types";

export interface ClientWithVisitCount extends Profile {
  visit_count: number;
}

export const clientService = {
  async listByCompany(companyId: string) {
    const { data: appointments } = await supabase
      .from("appointments")
      .select("client_id")
      .eq("company_id", companyId);

    const clientIds = [...new Set((appointments ?? []).map((a) => a.client_id))];
    if (clientIds.length === 0) return { data: [] as ClientWithVisitCount[], error: null };

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .in("id", clientIds)
      .eq("role", "client");

    if (error) return { data: [], error };

    const visitCounts: Record<string, number> = {};
    (appointments ?? []).forEach((a) => {
      visitCounts[a.client_id] = (visitCounts[a.client_id] ?? 0) + 1;
    });

    const result = (profiles ?? []).map((p) => ({
      ...p,
      visit_count: visitCounts[p.id] ?? 0,
    })) as ClientWithVisitCount[];

    return { data: result.sort((a, b) => b.visit_count - a.visit_count), error: null };
  },
};
