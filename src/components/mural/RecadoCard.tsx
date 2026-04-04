import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Recado, RecadoPrioridade } from "@/types/database.types";
import { recadoCommentsService } from "@/services/recado-comments.service";
import { CommentList } from "@/components/mural/CommentList";
import { CommentInput } from "@/components/mural/CommentInput";
import { toast } from "sonner";

const PRIORIDADE_LABEL: Record<RecadoPrioridade, string> = {
  normal: "Normal",
  importante: "Importante",
  urgente: "Urgente",
};

interface RecadoCardProps {
  recado: Recado;
  companyId: string;
  onEdit: (r: Recado) => void;
  onDelete: (r: Recado) => void;
  currentUserId: string | undefined;
  canModerateComments: boolean;
}

export function RecadoCard({
  recado,
  companyId,
  onEdit,
  onDelete,
  currentUserId,
  canModerateComments,
}: RecadoCardProps) {
  const queryClient = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const prioridade = recado.prioridade ?? "normal";

  const commentsKey = ["recado-comments", recado.id] as const;

  const { data: commentsRes, isLoading: commentsLoading } = useQuery({
    queryKey: commentsKey,
    queryFn: () => recadoCommentsService.listByRecado(recado.id),
    enabled: commentsOpen,
  });

  const comments = commentsRes?.data ?? [];

  const createCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await recadoCommentsService.createComment(recado.id, text);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
      toast.success("Comentário publicado.");
      setCommentsOpen(true);
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível comentar."),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await recadoCommentsService.deleteComment(id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
      toast.success("Comentário removido.");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível excluir."),
  });

  return (
    <article
      id={`recado-card-${recado.id}`}
      className={cn(
        "group relative flex flex-col rounded-xl border p-5 shadow-sm transition-all duration-200 min-h-0 scroll-mt-24",
        "hover:shadow-md hover:-translate-y-0.5",
        prioridade === "normal" && "border-border bg-card/80 dark:bg-card/60",
        prioridade === "importante" &&
          "border-amber-400/50 bg-amber-500/[0.08] dark:border-amber-500/40 dark:bg-amber-500/10",
        prioridade === "urgente" &&
          "border-red-500/50 bg-red-500/[0.08] dark:border-red-500/40 dark:bg-red-500/10"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {recado.fixado && (
            <Badge
              variant="secondary"
              className="shrink-0 gap-1 bg-primary/15 text-primary border-primary/20"
            >
              <Pin className="h-3 w-3" aria-hidden />
              Fixado
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 font-normal",
              prioridade === "normal" && "border-muted-foreground/40 text-muted-foreground",
              prioridade === "importante" && "border-amber-600/60 text-amber-800 dark:text-amber-400",
              prioridade === "urgente" && "border-red-600/60 text-red-800 dark:text-red-400"
            )}
          >
            {PRIORIDADE_LABEL[prioridade]}
          </Badge>
        </div>
        <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(recado)}
            aria-label="Editar recado"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(recado)}
            aria-label="Excluir recado"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <h3 className="text-lg font-semibold leading-tight mb-2 pr-2">{recado.titulo}</h3>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words mb-4 flex-1">
        {recado.mensagem}
      </p>
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground border-t border-border/60 pt-3 mb-1">
        <span>
          Por <span className="font-medium text-foreground">{recado.autor}</span>
        </span>
        <span aria-hidden>·</span>
        <time dateTime={recado.criado_em}>
          {format(new Date(recado.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </time>
      </footer>

      <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen} className="mt-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground hover:text-foreground h-9 px-2"
          >
            <span className="text-sm font-medium">Ver comentários</span>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 transition-transform", commentsOpen && "rotate-180")}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <CommentList
            comments={comments}
            isLoading={commentsLoading}
            currentUserId={currentUserId}
            canModerate={canModerateComments}
            onDelete={(id) => deleteCommentMutation.mutate(id)}
            isDeletingId={
              deleteCommentMutation.isPending ? (deleteCommentMutation.variables as string) ?? null : null
            }
          />
        </CollapsibleContent>
      </Collapsible>

      <CommentInput
        onSubmit={(t) => createCommentMutation.mutate(t)}
        disabled={!companyId}
        isSubmitting={createCommentMutation.isPending}
      />
    </article>
  );
}
