import { supabase } from "@/lib/supabase";
import type { RecadoComment } from "@/types/database.types";

export interface RecadoCommentWithAuthor extends RecadoComment {
  author_name: string;
}

export const recadoCommentsService = {
  async listByRecado(recadoId: string) {
    const { data: rows, error } = await supabase
      .from("recado_comments")
      .select("*")
      .eq("recado_id", recadoId)
      .order("criado_em", { ascending: true });

    if (error) return { data: [] as RecadoCommentWithAuthor[], error };
    const list = (rows ?? []) as RecadoComment[];
    if (list.length === 0) return { data: [], error: null };

    const userIds = [...new Set(list.map((r) => r.user_id))];
    const { data: profs, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profErr) return { data: [] as RecadoCommentWithAuthor[], error: profErr };

    const nameById = Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name as string]));

    const data: RecadoCommentWithAuthor[] = list.map((r) => ({
      ...r,
      author_name: nameById[r.user_id]?.trim() || "Usuário",
    }));

    return { data, error: null };
  },

  async createComment(recadoId: string, mensagem: string) {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return { data: null, error: userErr ?? new Error("Sessão inválida") };

    const { data, error } = await supabase
      .from("recado_comments")
      .insert({
        recado_id: recadoId,
        user_id: userData.user.id,
        mensagem: mensagem.trim(),
      })
      .select()
      .single();

    return { data: data as RecadoComment | null, error };
  },

  async deleteComment(commentId: string) {
    const { error } = await supabase.from("recado_comments").delete().eq("id", commentId);
    return { error };
  },
};
