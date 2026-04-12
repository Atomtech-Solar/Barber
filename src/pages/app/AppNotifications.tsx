import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/contexts/TenantContext";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";
import { notificationsService } from "@/services/notifications.service";
import type { AppNotification } from "@/types/database.types";
import { BellOff } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const AppNotifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";
  const [limit, setLimit] = useState(PAGE_SIZE);

  useNotificationsRealtime(companyId, true);

  const {
    data: list = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["notifications", companyId, limit],
    queryFn: async () => {
      const r = await notificationsService.getNotifications(companyId, { limit, offset: 0 });
      if (r.error) throw new Error(r.error.message);
      return r.data;
    },
    enabled: !!companyId,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });

  const mentions = useMemo(() => list.filter((n) => n.type === "mention"), [list]);
  const globals = useMemo(() => list.filter((n) => n.type === "global"), [list]);

  const invalidateNotifs = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread", companyId] });
  }, [companyId, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: (_, id) => {
      void id;
      invalidateNotifs();
      toast.success("Marcada como lida.");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível marcar como lida."),
  });

  const handleMarkRead = useCallback(
    (n: AppNotification) => {
      markReadMutation.mutate(n.id);
    },
    [markReadMutation]
  );

  const handleOpen = useCallback(
    async (n: AppNotification) => {
      if (!n.is_read) {
        const { error: err } = await notificationsService.markAsRead(n.id);
        if (err) {
          toast.error(err.message || "Não foi possível marcar como lida.");
          return;
        }
        invalidateNotifs();
      }
      if (n.recado_id) {
        navigate(`/app/mural?recado=${n.recado_id}`);
      }
    },
    [invalidateNotifs, navigate]
  );

  if (!companyId) {
    return (
      <PageContainer>
        <p className="text-muted-foreground py-12 text-center">Selecione uma empresa.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {isError && (
        <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error instanceof Error ? error.message : "Erro ao carregar notificações."} Aplique as migrations{" "}
          <code className="text-xs">051_notifications</code> e{" "}
          <code className="text-xs">055_notifications_rename_read_is_read</code> no Supabase.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3 max-w-2xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl w-full" />
          ))}
        </div>
      ) : list.length === 0 && !isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 px-6 text-center max-w-2xl">
          <BellOff className="h-12 w-12 text-muted-foreground mb-4" aria-hidden />
          <h3 className="text-lg font-medium mb-1">Você não tem notificações ainda</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Quando alguém usar @ com seu nome ou @todos no mural, aparecerá aqui.
          </p>
        </div>
      ) : !isError ? (
        <div className="space-y-10 max-w-2xl">
          {mentions.length > 0 && (
            <section aria-labelledby="notif-mentions-heading">
              <h2 id="notif-mentions-heading" className="text-sm font-semibold text-muted-foreground mb-3">
                Menções
              </h2>
              <ul className="space-y-3">
                {mentions.map((n) => (
                  <li key={n.id}>
                    <NotificationCard
                      notification={n}
                      onOpen={handleOpen}
                      onMarkRead={handleMarkRead}
                      isMarkingRead={markReadMutation.isPending && markReadMutation.variables === n.id}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {globals.length > 0 && (
            <section aria-labelledby="notif-global-heading">
              <h2 id="notif-global-heading" className="text-sm font-semibold text-muted-foreground mb-3">
                Avisos gerais
              </h2>
              <ul className="space-y-3">
                {globals.map((n) => (
                  <li key={n.id}>
                    <NotificationCard
                      notification={n}
                      onOpen={handleOpen}
                      onMarkRead={handleMarkRead}
                      isMarkingRead={markReadMutation.isPending && markReadMutation.variables === n.id}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {list.length >= limit && (
            <Button variant="outline" onClick={() => setLimit((l) => l + PAGE_SIZE)} className="w-full sm:w-auto">
              Carregar mais
            </Button>
          )}
        </div>
      ) : null}
    </PageContainer>
  );
};

export default AppNotifications;
