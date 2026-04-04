-- Notificações pessoais (menções e @todos no mural). Geração via triggers; leitura/atualização via RLS + RPC.

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mention', 'global')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recado_id UUID REFERENCES public.recados(id) ON DELETE CASCADE,
  comment_id UUID NULL
);

CREATE INDEX idx_notifications_user_company_created ON public.notifications(user_id, company_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, company_id) WHERE NOT "read";

-- Uma notificação por usuário por recado (evita duplicar menção + @todos)
CREATE UNIQUE INDEX uniq_notifications_user_recado
  ON public.notifications(user_id, recado_id)
  WHERE recado_id IS NOT NULL;

COMMENT ON TABLE public.notifications IS
  'Alertas pessoais (mural: menção e @todos). Futuro: comment_id, Realtime, FCM.';
COMMENT ON COLUMN public.notifications.comment_id IS
  'Reservado para notificações de comentário (sem FK até existir política).';

-- ---------------------------------------------------------------------------
-- Trigger: @todos no texto do recado → aviso global para todos os membros (exceto autor)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_recados_notify_todos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  const_title TEXT := 'Aviso geral';
  const_msg TEXT := 'Novo recado para toda a equipe';
  rec RECORD;
BEGIN
  IF NEW.mensagem IS NULL OR NEW.mensagem NOT ILIKE '%@todos%' THEN
    RETURN NEW;
  END IF;

  FOR rec IN
    SELECT cm.user_id
    FROM public.company_members cm
    WHERE cm.company_id = NEW.company_id
      AND cm.user_id IS DISTINCT FROM NEW.created_by
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = rec.user_id AND n.recado_id = NEW.id
    ) THEN
      INSERT INTO public.notifications (user_id, company_id, type, title, message, recado_id)
      VALUES (rec.user_id, NEW.company_id, 'global', const_title, const_msg, NEW.id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recados_notifications_todos ON public.recados;
CREATE TRIGGER trg_recados_notifications_todos
  AFTER INSERT OR UPDATE OF mensagem ON public.recados
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recados_notify_todos();

-- ---------------------------------------------------------------------------
-- Trigger: linha em recado_mentions → notificação de menção (sobrescreve global do mesmo recado)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_recado_mentions_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  const_title TEXT := 'Você foi mencionado';
  const_msg TEXT;
BEGIN
  SELECT id, company_id, autor, created_by, titulo INTO r
  FROM public.recados
  WHERE id = NEW.recado_id;

  IF r.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF r.created_by IS NOT NULL AND NEW.mentioned_user_id = r.created_by THEN
    RETURN NEW;
  END IF;

  const_msg := trim(COALESCE(r.autor, 'Alguém')) || ' mencionou você em um recado';

  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = NEW.mentioned_user_id AND n.recado_id = NEW.recado_id
  ) THEN
    UPDATE public.notifications
    SET
      type = 'mention',
      title = const_title,
      message = const_msg,
      "read" = false
    WHERE user_id = NEW.mentioned_user_id
      AND recado_id = NEW.recado_id;
  ELSE
    INSERT INTO public.notifications (user_id, company_id, type, title, message, recado_id)
    VALUES (
      NEW.mentioned_user_id,
      r.company_id,
      'mention',
      const_title,
      const_msg,
      NEW.recado_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recado_mentions_notifications ON public.recado_mentions;
CREATE TRIGGER trg_recado_mentions_notifications
  AFTER INSERT ON public.recado_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recado_mentions_notify();

-- ---------------------------------------------------------------------------
-- RLS: só o destinatário lê suas linhas
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Inserção/atualização direta apenas pelo trigger (owner) ou service role.
-- Autenticado: SELECT + RPC mark_notification_read.
REVOKE ALL ON public.notifications FROM PUBLIC;
GRANT SELECT ON public.notifications TO authenticated;

-- ---------------------------------------------------------------------------
-- Marcar como lida (única mutação permitida ao cliente)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET "read" = true
  WHERE id = p_id AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Criar notificação manual (ex.: comentários no mural no futuro). Chamador deve ser membro da empresa.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_company_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_recado_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nid UUID;
BEGIN
  IF p_type IS NULL OR p_type NOT IN ('mention', 'global') THEN
    RAISE EXCEPTION 'Tipo de notificação inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = p_company_id AND cm.user_id = auth.uid()
  ) AND NOT public.is_platform_owner() THEN
    RAISE EXCEPTION 'Sem permissão para criar notificação nesta empresa';
  END IF;

  INSERT INTO public.notifications (
    user_id, company_id, type, title, message, recado_id, comment_id
  )
  VALUES (
    p_user_id, p_company_id, p_type, p_title, p_message, p_recado_id, p_comment_id
  )
  RETURNING id INTO nid;

  RETURN nid;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(UUID, UUID, TEXT, TEXT, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, UUID, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;

-- Realtime (habilitar no painel Supabase se desejar): Database > Replication > notifications
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
