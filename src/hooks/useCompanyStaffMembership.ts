import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

/**
 * Quando profiles.role ainda é 'client' mas o usuário está em company_members,
 * trata-se de equipe (ex.: conta promovida pelo admin antes da migration 053).
 * RLS: usuário só enxerga a própria linha em company_members.
 */
export function useCompanyStaffMembership() {
  const { user, profile, initialized } = useAuth();
  const isClient = profile?.role === "client";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-staff-membership", user?.id],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return Boolean(row);
    },
    enabled: initialized && !!user?.id && isClient,
    staleTime: 60_000,
  });

  return {
    /** true = tem vínculo de equipe (company_members), mesmo com role client no perfil */
    isStaffViaMembership: isClient ? Boolean(data) : false,
    /** Só aguarda query quando o perfil diz client */
    isResolvingStaff: isClient && isLoading,
    staffCheckFailed: isClient && isError,
  };
}
