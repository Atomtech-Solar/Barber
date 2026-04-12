-- Coluna "read" é palavra reservada em PostgREST: select/filtros podem falhar ou retornar lista vazia
-- no painel, enquanto head count ainda parece "funcionar". Renomear para is_read.
-- Idempotente: se a tabela já tiver is_read (projeto novo), só atualiza funções.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'read'
  ) THEN
    DROP INDEX IF EXISTS idx_notifications_user_unread;
    ALTER TABLE public.notifications RENAME COLUMN "read" TO is_read;
    CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, company_id) WHERE NOT is_read;
  END IF;
END $$;

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
      is_read = false
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

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE id = p_id AND user_id = auth.uid();
END;
$$;

-- Garante índice parcial se a tabela já existia só com is_read (ex.: base criada manualmente)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, company_id)
  WHERE NOT is_read;
