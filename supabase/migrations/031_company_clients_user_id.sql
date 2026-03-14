-- Vincula clientes (auth users) às empresas - multi-tenant
-- Quando um cliente cria conta pela landing de uma empresa, é associado a ela

-- 1. Adicionar user_id em company_clients
ALTER TABLE company_clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_company_clients_user ON company_clients(user_id);

-- 2. RPC para cliente se registrar numa empresa (após signUp)
CREATE OR REPLACE FUNCTION public.register_client_for_company(
  p_company_id UUID,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_company_active BOOLEAN;
  v_existing_id UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  IF NULLIF(TRIM(p_full_name), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome é obrigatório');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM companies
    WHERE id = p_company_id AND status = 'active'
  ) INTO v_company_active;
  IF NOT v_company_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada');
  END IF;

  -- Evitar duplicata: já existe vínculo?
  SELECT id INTO v_existing_id
  FROM company_clients
  WHERE company_id = p_company_id AND user_id = v_uid
  LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'client_id', v_existing_id);
  END IF;

  INSERT INTO company_clients (company_id, user_id, full_name, phone, email)
  VALUES (p_company_id, v_uid, TRIM(p_full_name), NULLIF(TRIM(p_phone), ''), NULLIF(TRIM(p_email), ''));

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_client_for_company(UUID, TEXT, TEXT, TEXT) TO authenticated;
