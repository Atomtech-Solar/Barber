-- Melhorias: evitar duplicação, vincular antigos, constraint de conflito
-- 1. company_client_id em appointments (walk-in reutiliza cliente por phone)
-- 2. Constraint UNIQUE professional+date+start_time (evitar conflitos)
-- 3. RPC para buscar/criar company_client por phone
-- 4. Atualizar create_public_appointment para reutilizar cliente

-- 1. Adicionar company_client_id (opcional, para walk-in)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS company_client_id UUID REFERENCES company_clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_company_client ON appointments(company_client_id);

-- 2. Constraint: um profissional não pode ter dois agendamentos no mesmo horário
-- (considerando apenas ativos: pending, confirmed, blocked)
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_prof_slot_unique
  ON appointments (professional_id, date, start_time)
  WHERE status IN ('pending', 'confirmed', 'blocked');

-- 3. Função: obter ou criar company_client por telefone
CREATE OR REPLACE FUNCTION public.get_or_create_company_client(
  p_company_id UUID,
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_norm TEXT;
  v_client_id UUID;
BEGIN
  IF NULLIF(TRIM(p_phone), '') IS NULL THEN
    RETURN NULL;
  END IF;

  v_phone_norm := regexp_replace(TRIM(p_phone), '\D', '', 'g');
  IF length(v_phone_norm) < 8 THEN
    RETURN NULL;
  END IF;

  -- Buscar existente por phone normalizado (company_clients.phone pode ter formatação)
  SELECT id INTO v_client_id
  FROM company_clients
  WHERE company_id = p_company_id
    AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_phone_norm
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;

  -- Criar novo
  INSERT INTO company_clients (company_id, full_name, phone, email)
  VALUES (
    p_company_id,
    NULLIF(TRIM(p_full_name), ''),
    TRIM(p_phone),
    NULLIF(TRIM(COALESCE(p_email, '')), '')
  )
  RETURNING id INTO v_client_id;

  RETURN v_client_id;
END;
$$;

-- 4. Atualizar create_public_appointment para reutilizar company_client
CREATE OR REPLACE FUNCTION public.create_public_appointment(
  p_company_id UUID,
  p_professional_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_duration_minutes INT,
  p_service_ids UUID[],
  p_client_name TEXT,
  p_client_phone TEXT,
  p_client_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_exists BOOLEAN;
  v_prof_exists BOOLEAN;
  v_services_valid BOOLEAN;
  v_apt_id UUID;
  v_sid UUID;
  v_company_client_id UUID;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM companies
    WHERE id = p_company_id AND status = 'active'
  ) INTO v_company_exists;
  IF NOT v_company_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada ou inativa');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM professionals
    WHERE id = p_professional_id
      AND company_id = p_company_id
      AND is_active = true
  ) INTO v_prof_exists;
  IF NOT v_prof_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profissional não encontrado');
  END IF;

  IF array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Selecione ao menos um serviço');
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM unnest(p_service_ids) AS s(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM services
      WHERE id = s.id AND company_id = p_company_id
    )
  ) INTO v_services_valid;
  IF NOT v_services_valid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Serviço inválido');
  END IF;

  IF NULLIF(TRIM(p_client_name), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome é obrigatório');
  END IF;
  IF NULLIF(TRIM(p_client_phone), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Telefone é obrigatório');
  END IF;

  -- Evitar conflito de horário
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE professional_id = p_professional_id
      AND date = p_date
      AND start_time = p_start_time
      AND status IN ('pending', 'confirmed', 'blocked')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Horário indisponível. Selecione outro.');
  END IF;

  -- Buscar ou criar company_client (evita duplicação)
  v_company_client_id := get_or_create_company_client(
    p_company_id,
    TRIM(p_client_name),
    TRIM(p_client_phone),
    p_client_email
  );

  INSERT INTO appointments (
    company_id,
    client_id,
    company_client_id,
    client_name,
    client_phone,
    client_email,
    professional_id,
    date,
    start_time,
    duration_minutes,
    status
  ) VALUES (
    p_company_id,
    NULL,
    v_company_client_id,
    TRIM(p_client_name),
    TRIM(p_client_phone),
    NULLIF(TRIM(COALESCE(p_client_email, '')), ''),
    p_professional_id,
    p_date,
    p_start_time,
    p_duration_minutes,
    'confirmed'
  )
  RETURNING id INTO v_apt_id;

  FOREACH v_sid IN ARRAY p_service_ids
  LOOP
    INSERT INTO appointment_services (appointment_id, service_id)
    VALUES (v_apt_id, v_sid);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'appointment_id', v_apt_id);
END;
$$;
