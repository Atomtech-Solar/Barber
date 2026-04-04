-- Comentários e menções no mural + team_id futuro (sem FK até existir tabela teams)

-- 1) Recados: team_id opcional; garantir created_by em bases antigas
ALTER TABLE public.recados
  ADD COLUMN IF NOT EXISTS team_id UUID NULL;

COMMENT ON COLUMN public.recados.team_id IS
  'Reservado para segmentação por equipe/unidade. NULL = mural global da empresa. FK será adicionada quando existir tabela de equipes.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recados' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.recados
      ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recados_company_team ON public.recados(company_id, team_id);

-- 2) Comentários
CREATE TABLE public.recado_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recado_id UUID NOT NULL REFERENCES public.recados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL CHECK (char_length(trim(mensagem)) > 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recado_comments_recado ON public.recado_comments(recado_id);
CREATE INDEX idx_recado_comments_criado ON public.recado_comments(recado_id, criado_em ASC);

ALTER TABLE public.recado_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recado_comments_select" ON public.recado_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recados r
      INNER JOIN public.company_members cm ON cm.company_id = r.company_id AND cm.user_id = auth.uid()
      WHERE r.id = recado_comments.recado_id
    )
  );

CREATE POLICY "recado_comments_insert" ON public.recado_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.recados r
      INNER JOIN public.company_members cm ON cm.company_id = r.company_id AND cm.user_id = auth.uid()
      WHERE r.id = recado_comments.recado_id
    )
  );

CREATE POLICY "recado_comments_delete" ON public.recado_comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.recados r
      INNER JOIN public.company_members cm ON cm.company_id = r.company_id AND cm.user_id = auth.uid()
      WHERE r.id = recado_comments.recado_id
        AND cm.role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE public.recado_comments IS 'Comentários lineares em recados do mural (sem threads).';

-- 3) Menções (persistidas ao criar/editar recado)
CREATE TABLE public.recado_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recado_id UUID NOT NULL REFERENCES public.recados(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (recado_id, mentioned_user_id)
);

CREATE INDEX idx_recado_mentions_recado ON public.recado_mentions(recado_id);
CREATE INDEX idx_recado_mentions_user ON public.recado_mentions(mentioned_user_id);

ALTER TABLE public.recado_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recado_mentions_select" ON public.recado_mentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recados r
      INNER JOIN public.company_members cm ON cm.company_id = r.company_id AND cm.user_id = auth.uid()
      WHERE r.id = recado_mentions.recado_id
    )
  );

-- Qualquer membro da empresa pode inserir/remover menções (sincronização ao salvar texto;
-- o app permite editar recado a qualquer membro com acesso ao mural.)
CREATE POLICY "recado_mentions_insert" ON public.recado_mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recados r
      INNER JOIN public.company_members cm ON cm.company_id = r.company_id AND cm.user_id = auth.uid()
      WHERE r.id = recado_mentions.recado_id
    )
  );

CREATE POLICY "recado_mentions_delete" ON public.recado_mentions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.recados r
      INNER JOIN public.company_members cm ON cm.company_id = r.company_id AND cm.user_id = auth.uid()
      WHERE r.id = recado_mentions.recado_id
    )
  );

COMMENT ON TABLE public.recado_mentions IS 'Usuários mencionados no texto do recado (@nome).';

-- 4) Perfis mencionáveis: apenas company_members da empresa (evita expor clientes)
CREATE OR REPLACE FUNCTION public.list_mural_mention_profiles(p_company_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.company_members cm
  INNER JOIN public.profiles p ON p.id = cm.user_id
  WHERE cm.company_id = p_company_id
    AND EXISTS (
      SELECT 1 FROM public.company_members cm_self
      WHERE cm_self.company_id = p_company_id
        AND cm_self.user_id = auth.uid()
    )
  ORDER BY p.full_name ASC;
$$;

REVOKE ALL ON FUNCTION public.list_mural_mention_profiles(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_mural_mention_profiles(UUID) TO authenticated;
