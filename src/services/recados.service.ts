import { supabase } from "@/lib/supabase";
import type { Recado, RecadoPrioridade } from "@/types/database.types";

export interface MuralMentionProfileRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface CreateRecadoParams {
  titulo: string;
  mensagem: string;
  autor: string;
  prioridade: RecadoPrioridade;
  fixado: boolean;
  created_by?: string | null;
  team_id?: string | null;
  /** Ids de usuários mencionados no texto (@nome); persistidos em recado_mentions */
  mentioned_user_ids?: string[];
}

export interface UpdateRecadoParams {
  titulo?: string;
  mensagem?: string;
  prioridade?: RecadoPrioridade;
  fixado?: boolean;
  team_id?: string | null;
  /** Ao alterar mensagem, ressincronizar menções quando informado */
  mentioned_user_ids?: string[];
}

async function syncRecadoMentions(recadoId: string, mentionedUserIds: string[]) {
  const unique = [...new Set(mentionedUserIds)];
  const { error: delErr } = await supabase.from("recado_mentions").delete().eq("recado_id", recadoId);
  if (delErr) return { error: delErr };
  if (unique.length === 0) return { error: null };
  const { error } = await supabase.from("recado_mentions").insert(
    unique.map((mentioned_user_id) => ({ recado_id: recadoId, mentioned_user_id }))
  );
  return { error };
}

export const recadosService = {
  async listMuralMentionProfiles(companyId: string) {
    const { data, error } = await supabase.rpc("list_mural_mention_profiles", {
      p_company_id: companyId,
    });
    if (error) return { data: [] as MuralMentionProfileRow[], error };
    const rows = (data ?? []) as MuralMentionProfileRow[];
    return { data: rows, error: null };
  },

  async getRecados(companyId: string) {
    const { data, error } = await supabase
      .from("recados")
      .select("*")
      .eq("company_id", companyId)
      .order("fixado", { ascending: false })
      .order("criado_em", { ascending: false });
    return { data: (data ?? []) as Recado[], error };
  },

  async createRecado(companyId: string, params: CreateRecadoParams) {
    const { data, error } = await supabase
      .from("recados")
      .insert({
        company_id: companyId,
        titulo: params.titulo.trim(),
        mensagem: params.mensagem.trim(),
        autor: params.autor.trim(),
        prioridade: params.prioridade,
        fixado: params.fixado,
        created_by: params.created_by ?? null,
        team_id: params.team_id ?? null,
      })
      .select()
      .single();
    if (error || !data) return { data: data as Recado | null, error };

    const ids = params.mentioned_user_ids ?? [];
    const { error: mErr } = await syncRecadoMentions(data.id, ids);
    if (mErr) {
      await supabase.from("recados").delete().eq("id", data.id).eq("company_id", companyId);
      return { data: null, error: mErr };
    }

    return { data: data as Recado, error: null };
  },

  async updateRecado(companyId: string, id: string, params: UpdateRecadoParams) {
    const payload: Record<string, unknown> = {};
    if (params.titulo !== undefined) payload.titulo = params.titulo.trim();
    if (params.mensagem !== undefined) payload.mensagem = params.mensagem.trim();
    if (params.prioridade !== undefined) payload.prioridade = params.prioridade;
    if (params.fixado !== undefined) payload.fixado = params.fixado;
    if (params.team_id !== undefined) payload.team_id = params.team_id;
    const { data, error } = await supabase
      .from("recados")
      .update(payload)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();
    if (error || !data) return { data: data as Recado | null, error };

    if (params.mensagem !== undefined && params.mentioned_user_ids !== undefined) {
      const { error: mErr } = await syncRecadoMentions(id, params.mentioned_user_ids);
      if (mErr) return { data: data as Recado, error: mErr };
    }

    return { data: data as Recado, error: null };
  },

  async deleteRecado(companyId: string, id: string) {
    const { error } = await supabase.from("recados").delete().eq("id", id).eq("company_id", companyId);
    return { error };
  },
};
