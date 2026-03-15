-- Garantir que company_client_id e get_or_create_company_client existem
-- Necessário se migration 036 não foi aplicada ou está em estado inconsistente

-- 1. Coluna company_client_id em appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS company_client_id UUID REFERENCES company_clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_company_client ON appointments(company_client_id);

-- 2. Função get_or_create_company_client
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

  SELECT id INTO v_client_id
  FROM company_clients
  WHERE company_id = p_company_id
    AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_phone_norm
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;

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
