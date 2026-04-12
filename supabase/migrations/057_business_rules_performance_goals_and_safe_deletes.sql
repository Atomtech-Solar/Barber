-- =============================================================================
-- Regras de negócio: metas de desempenho (fonte de verdade no Postgres),
-- duplicidade de clientes (telefone/email), exclusão segura de serviço/profissional.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Metas extras de desempenho por empresa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'custom')),
  metric TEXT NOT NULL CHECK (metric IN ('revenue', 'appointments', 'average_ticket')),
  target_value NUMERIC(14, 2) NOT NULL CHECK (target_value > 0),
  custom_start DATE,
  custom_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_perf_goals_custom_dates CHECK (
    (period_type = 'custom' AND custom_start IS NOT NULL AND custom_end IS NOT NULL AND custom_start <= custom_end)
    OR (period_type <> 'custom' AND custom_start IS NULL AND custom_end IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_company_performance_goals_company
  ON public.company_performance_goals(company_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_company_performance_goals_rolling
  ON public.company_performance_goals(company_id, period_type, metric)
  WHERE period_type IN ('daily', 'weekly', 'monthly');

COMMENT ON TABLE public.company_performance_goals IS
  'Metas operacionais extras (além da meta principal na tabela companies). Concorrência: updated_at.';

CREATE OR REPLACE FUNCTION public.trg_company_performance_goals_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_performance_goals_updated ON public.company_performance_goals;
CREATE TRIGGER trg_company_performance_goals_updated
  BEFORE UPDATE ON public.company_performance_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_company_performance_goals_set_updated_at();

CREATE OR REPLACE FUNCTION public.trg_company_performance_goals_custom_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.period_type IS DISTINCT FROM 'custom' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.company_performance_goals g
    WHERE g.company_id = NEW.company_id
      AND g.metric = NEW.metric
      AND g.period_type = 'custom'
      AND g.id IS DISTINCT FROM NEW.id
      AND daterange(g.custom_start, g.custom_end, '[]') && daterange(NEW.custom_start, NEW.custom_end, '[]')
  ) THEN
    RAISE EXCEPTION 'PERF_GOAL_OVERLAP'
      USING ERRCODE = '23514', HINT = 'Já existe meta personalizada neste período para o mesmo indicador.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_performance_goals_overlap ON public.company_performance_goals;
CREATE TRIGGER trg_company_performance_goals_overlap
  BEFORE INSERT OR UPDATE OF company_id, metric, period_type, custom_start, custom_end
  ON public.company_performance_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_company_performance_goals_custom_overlap();

ALTER TABLE public.company_performance_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_performance_goals_select" ON public.company_performance_goals;
CREATE POLICY "company_performance_goals_select"
  ON public.company_performance_goals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_performance_goals.company_id
        AND (
          c.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
        )
    )
  );

DROP POLICY IF EXISTS "company_performance_goals_write" ON public.company_performance_goals;
CREATE POLICY "company_performance_goals_write"
  ON public.company_performance_goals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_performance_goals.company_id
        AND (
          c.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_performance_goals.company_id
        AND (
          c.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Clientes: evitar duplicidade de telefone / email na mesma empresa
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_company_client(
  p_company_id UUID,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_phone_digits TEXT;
  v_email_lower TEXT;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'company_id é obrigatório');
  END IF;

  IF NULLIF(TRIM(p_full_name), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome é obrigatório');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = p_company_id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
      )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para adicionar clientes nesta empresa');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = p_company_id AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada ou inativa');
  END IF;

  v_phone_digits := NULLIF(regexp_replace(TRIM(COALESCE(p_phone, '')), '\D', '', 'g'), '');
  IF v_phone_digits IS NOT NULL AND length(v_phone_digits) >= 8 THEN
    IF EXISTS (
      SELECT 1 FROM company_clients cc
      WHERE cc.company_id = p_company_id
        AND regexp_replace(COALESCE(cc.phone, ''), '\D', '', 'g') = v_phone_digits
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Já existe um cliente com este telefone nesta empresa.');
    END IF;
  END IF;

  v_email_lower := NULLIF(lower(trim(COALESCE(p_email, ''))), '');
  IF v_email_lower IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM company_clients cc
      WHERE cc.company_id = p_company_id
        AND lower(trim(COALESCE(cc.email, ''))) = v_email_lower
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Já existe um cliente com este e-mail nesta empresa.');
    END IF;
  END IF;

  INSERT INTO company_clients (company_id, full_name, phone, email, cpf, notes, user_id)
  VALUES (
    p_company_id,
    NULLIF(TRIM(p_full_name), ''),
    NULLIF(TRIM(COALESCE(p_phone, '')), ''),
    NULLIF(TRIM(COALESCE(p_email, '')), ''),
    NULLIF(TRIM(COALESCE(p_cpf, '')), ''),
    NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    NULL
  )
  RETURNING id INTO v_client_id;

  RETURN jsonb_build_object('success', true, 'client_id', v_client_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não foi possível criar o cliente. Tente novamente.');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_company_client(
  p_client_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
  v_phone_digits TEXT;
  v_email_lower TEXT;
BEGIN
  IF p_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'client_id é obrigatório');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM company_clients cc
    JOIN companies c ON c.id = cc.company_id
    WHERE cc.id = p_client_id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
      )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para editar este cliente');
  END IF;

  SELECT company_id INTO v_company FROM company_clients WHERE id = p_client_id;

  v_phone_digits := NULLIF(regexp_replace(TRIM(COALESCE(p_phone, '')), '\D', '', 'g'), '');
  IF v_phone_digits IS NOT NULL AND length(v_phone_digits) >= 8 THEN
    IF EXISTS (
      SELECT 1 FROM company_clients cc
      WHERE cc.company_id = v_company
        AND cc.id IS DISTINCT FROM p_client_id
        AND regexp_replace(COALESCE(cc.phone, ''), '\D', '', 'g') = v_phone_digits
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Já existe outro cliente com este telefone nesta empresa.');
    END IF;
  END IF;

  v_email_lower := NULLIF(lower(trim(COALESCE(p_email, ''))), '');
  IF v_email_lower IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM company_clients cc
      WHERE cc.company_id = v_company
        AND cc.id IS DISTINCT FROM p_client_id
        AND lower(trim(COALESCE(cc.email, ''))) = v_email_lower
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Já existe outro cliente com este e-mail nesta empresa.');
    END IF;
  END IF;

  UPDATE company_clients
  SET
    full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
    phone = CASE WHEN p_phone IS NULL THEN phone ELSE NULLIF(TRIM(COALESCE(p_phone, '')), '') END,
    email = CASE WHEN p_email IS NULL THEN email ELSE NULLIF(TRIM(COALESCE(p_email, '')), '') END,
    cpf = CASE WHEN p_cpf IS NULL THEN cpf ELSE NULLIF(TRIM(COALESCE(p_cpf, '')), '') END,
    notes = CASE WHEN p_notes IS NULL THEN notes ELSE NULLIF(TRIM(COALESCE(p_notes, '')), '') END,
    updated_at = now()
  WHERE id = p_client_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não foi possível atualizar o cliente. Tente novamente.');
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Exclusão segura de serviço e profissional
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.safe_delete_service(p_service_id UUID, p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid UUID;
BEGIN
  IF p_service_id IS NULL OR p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parâmetros inválidos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = p_company_id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
      )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  SELECT company_id INTO v_cid FROM services WHERE id = p_service_id;
  IF v_cid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Serviço não encontrado');
  END IF;
  IF v_cid IS DISTINCT FROM p_company_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Serviço não pertence a esta empresa');
  END IF;

  IF EXISTS (SELECT 1 FROM professional_services WHERE service_id = p_service_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Não é possível excluir: remova o serviço dos profissionais primeiro.'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM appointment_services acs
    INNER JOIN appointments a ON a.id = acs.appointment_id
    WHERE acs.service_id = p_service_id
      AND a.status IN ('pending', 'confirmed', 'blocked')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Não é possível excluir: o serviço está em agendamentos ativos.'
    );
  END IF;

  DELETE FROM services WHERE id = p_service_id AND company_id = p_company_id;
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não foi possível excluir o serviço.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_delete_service(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.safe_delete_professional(p_professional_id UUID, p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid UUID;
BEGIN
  IF p_professional_id IS NULL OR p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parâmetros inválidos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = p_company_id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
      )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  SELECT company_id INTO v_cid FROM professionals WHERE id = p_professional_id;
  IF v_cid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profissional não encontrado');
  END IF;
  IF v_cid IS DISTINCT FROM p_company_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profissional não pertence a esta empresa');
  END IF;

  IF EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.professional_id = p_professional_id
      AND a.company_id = p_company_id
      AND a.status IN ('pending', 'confirmed', 'blocked')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Não é possível excluir: existem agendamentos ativos para este profissional.'
    );
  END IF;

  DELETE FROM working_hours WHERE professional_id = p_professional_id;
  DELETE FROM professional_services WHERE professional_id = p_professional_id;
  DELETE FROM professionals WHERE id = p_professional_id AND company_id = p_company_id;
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não foi possível excluir o profissional.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_delete_professional(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Unicidade de nome de serviço por empresa (quando não há duplicatas legadas)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.services s1
    INNER JOIN public.services s2
      ON s1.company_id = s2.company_id
      AND s1.id < s2.id
      AND lower(trim(s1.name)) = lower(trim(s2.name))
  ) THEN
    RAISE NOTICE '057: existem serviços com o mesmo nome na mesma empresa — corrija manualmente para criar índice único.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_services_company_name_lower
      ON public.services (company_id, (lower(trim(name))));
  END IF;
END $$;
