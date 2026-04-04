import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecadoCommentWithAuthor } from "@/services/recado-comments.service";

interface CommentListProps {
  comments: RecadoCommentWithAuthor[];
  isLoading: boolean;
  currentUserId: string | undefined;
  canModerate: boolean;
  onDelete: (commentId: string) => void;
  isDeletingId: string | null;
}

export function CommentList({
  comments,
  isLoading,
  currentUserId,
  canModerate,
  onDelete,
  isDeletingId,
}: CommentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 py-2" aria-busy="true">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-3 text-center border border-dashed rounded-lg bg-muted/20">
        Nenhum comentário ainda. Seja o primeiro a comentar.
      </p>
    );
  }

  return (
    <ul className="space-y-2 max-h-52 overflow-y-auto scrollbar-theme pr-1">
      {comments.map((c) => {
        const isAuthor = currentUserId === c.user_id;
        const canDelete = isAuthor || canModerate;
        return (
          <li
            key={c.id}
            className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium text-foreground">{c.author_name}</span>
                  <time className="text-xs text-muted-foreground" dateTime={c.criado_em}>
                    {format(new Date(c.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </time>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap break-words mt-1">{c.mensagem}</p>
              </div>
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  aria-label="Excluir comentário"
                  disabled={isDeletingId === c.id}
                  onClick={() => onDelete(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
