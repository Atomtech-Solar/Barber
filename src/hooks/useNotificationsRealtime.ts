import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Invalida queries de notificações quando há mudanças na tabela (requer Realtime ativo no Supabase).
 * Database → Replication → habilitar `notifications` na publicação `supabase_realtime`.
 */
export function useNotificationsRealtime(companyId: string | undefined, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !companyId) return;

    const channel = supabase
      .channel(`notifications-realtime:${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `company_id=eq.${companyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });
          queryClient.invalidateQueries({ queryKey: ["notifications-unread", companyId] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, enabled, queryClient]);
}
