import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RecadoCard } from "@/components/mural/RecadoCard";
import { RecadoModal, type RecadoModalMode } from "@/components/mural/RecadoModal";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { recadosService } from "@/services/recados.service";
import { supabase } from "@/lib/supabase";
import { parseMentionedUserIdsFromMessage } from "@/lib/mural-mentions";
import type { Recado } from "@/types/database.types";
import { Plus, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

const AppMural = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const focusRecadoId = searchParams.get("recado");
  const { currentCompany } = useTenant();
  const { user, profile } = useAuth();
  const companyId = currentCompany?.id ?? "";
  const autorNome = profile?.full_name?.trim() || "Equipe";

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<RecadoModalMode>("create");
  const [editingRecado, setEditingRecado] = useState<Recado | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recado | null>(null);

  const { data: mentionProfilesRes } = useQuery({
    queryKey: ["mural-mention-profiles", companyId],
    queryFn: () => recadosService.listMuralMentionProfiles(companyId),
    enabled: !!companyId,
  });

  const mentionCandidates = useMemo(
    () =>
      (mentionProfilesRes?.data ?? []).map((r) => ({
        id: r.user_id,
        full_name: r.full_name?.trim() || "Sem nome",
      })),
    [mentionProfilesRes?.data]
  );

  const { data: memberSelfRes } = useQuery({
    queryKey: ["company-member-role", companyId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("role")
        .eq("company_id", companyId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!user?.id,
  });

  const canModerateComments =
    memberSelfRes?.role === "owner" || memberSelfRes?.role === "admin";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["recados", companyId],
    queryFn: () => recadosService.getRecados(companyId),
    enabled: !!companyId,
  });

  const recados = data?.data ?? [];

  useEffect(() => {
    if (!focusRecadoId || isLoading || recados.length === 0) return;
    const el = document.getElementById(`recado-card-${focusRecadoId}`);
    if (!el) return;
    let timeoutId = 0;
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
      timeoutId = window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
      }, 2800);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [focusRecadoId, isLoading, recados.length]);

  const createMutation = useMutation({
    mutationFn: (values: Parameters<typeof recadosService.createRecado>[1]) =>
      recadosService.createRecado(companyId, {
        ...values,
        autor: autorNome,
        created_by: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recados", companyId] });
      queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread", companyId] });
      toast.success("Recado publicado!");
      setModalOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível publicar."),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Parameters<typeof recadosService.updateRecado>[2];
    }) => recadosService.updateRecado(companyId, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recados", companyId] });
      queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread", companyId] });
      toast.success("Recado atualizado!");
      setModalOpen(false);
      setEditingRecado(null);
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível salvar."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recadosService.deleteRecado(companyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recados", companyId] });
      toast.success("Recado removido.");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível excluir."),
  });

  const openCreate = () => {
    setModalMode("create");
    setEditingRecado(null);
    setModalOpen(true);
  };

  const openEdit = (r: Recado) => {
    setModalMode("edit");
    setEditingRecado(r);
    setModalOpen(true);
  };

  const handleModalSubmit = (values: {
    titulo: string;
    mensagem: string;
    prioridade: Recado["prioridade"];
    fixado: boolean;
  }) => {
    const mentioned_user_ids = parseMentionedUserIdsFromMessage(values.mensagem, mentionCandidates);
    if (modalMode === "create") {
      createMutation.mutate({ ...values, mentioned_user_ids });
    } else if (editingRecado) {
      updateMutation.mutate({
        id: editingRecado.id,
        values: { ...values, mentioned_user_ids },
      });
    }
  };

  if (!companyId) {
    return (
      <PageContainer>
        <p className="text-muted-foreground py-12 text-center">Selecione uma empresa.</p>
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo recado
          </Button>
        }
      >
        {isError && (
          <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            Erro ao carregar recados. Verifique se as migrations{" "}
            <code className="text-xs">049_recados</code> e{" "}
            <code className="text-xs">050_recados_comments_mentions_team</code> foram aplicadas no Supabase.
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : recados.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 px-6 text-center">
            <MessageSquareText className="h-12 w-12 text-muted-foreground mb-4" aria-hidden />
            <h3 className="text-lg font-medium mb-1">Nenhum recado ainda</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Seja o primeiro a publicar um aviso para a equipe. Use prioridade e fixar para destacar o que é
              importante.
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo recado
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recados.map((r) => (
              <RecadoCard
                key={r.id}
                recado={r}
                companyId={companyId}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                currentUserId={user?.id}
                canModerateComments={canModerateComments}
              />
            ))}
          </div>
        )}
      </PageContainer>

      <RecadoModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setEditingRecado(null);
        }}
        mode={modalMode}
        recado={editingRecado ?? undefined}
        defaultAutor={autorNome}
        mentionCandidates={mentionCandidates}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleModalSubmit}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O recado &quot;{deleteTarget?.titulo}&quot; será removido do
              mural.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppMural;
