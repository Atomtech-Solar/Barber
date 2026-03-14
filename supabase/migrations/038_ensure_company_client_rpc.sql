-- Garantir vínculo cliente-empresa ao criar conta
-- Usado pela Edge Function create-client-account para inserir em company_clients

-- 1. Remover duplicatas (manter o mais antigo) antes de criar índice único
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY company_id, user_id ORDER BY created_at ASC) AS rn
  FROM company_clients
  WHERE user_id IS NOT NULL
)
DELETE FROM company_clients
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 2. Constraint única: um user_id só pode estar vinculado uma vez por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_clients_company_user_unique
  ON company_clients (company_id, user_id)
  WHERE user_id IS NOT NULL;

-- 3. RPC para garantir vínculo (chamada pela Edge Function com service_role)
-- Evita duplicação e funciona mesmo se o insert direto falhar por RLS/contexto
CREATE OR REPLACE FUNCTION public.ensure_company_client(
  p_company_id UUID,
  p_user_id UUID,
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
  v_existing_id UUID;
  v_client_id UUID;
BEGIN
  IF p_user_id IS NULL OR p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'company_id e user_id são obrigatórios');
  END IF;

  IF NULLIF(TRIM(p_full_name), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome é obrigatório');
  END IF;

  -- Empresa existe e está ativa
  IF NOT EXISTS (
    SELECT 1 FROM companies
    WHERE id = p_company_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada ou inativa');
  END IF;

  -- Usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Já existe vínculo?
  SELECT id INTO v_existing_id
  FROM company_clients
  WHERE company_id = p_company_id AND user_id = p_user_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Atualizar dados se necessário
    UPDATE company_clients
    SET full_name = NULLIF(TRIM(p_full_name), ''),
        phone = NULLIF(TRIM(COALESCE(p_phone, '')), ''),
        email = NULLIF(TRIM(COALESCE(p_email, '')), ''),
        updated_at = now()
    WHERE id = v_existing_id;
    RETURN jsonb_build_object('success', true, 'client_id', v_existing_id, 'existing', true);
  END IF;

  -- Inserir novo vínculo
  INSERT INTO company_clients (company_id, user_id, full_name, phone, email)
  VALUES (
    p_company_id,
    p_user_id,
    NULLIF(TRIM(p_full_name), ''),
    NULLIF(TRIM(COALESCE(p_phone, '')), ''),
    NULLIF(TRIM(COALESCE(p_email, '')), '')
  )
  RETURNING id INTO v_client_id;

  RETURN jsonb_build_object('success', true, 'client_id', v_client_id);
EXCEPTION
  WHEN unique_violation THEN
    -- Concorrência: outro processo inseriu
    SELECT id INTO v_existing_id
    FROM company_clients
    WHERE company_id = p_company_id AND user_id = p_user_id
    LIMIT 1;
    RETURN jsonb_build_object('success', true, 'client_id', v_existing_id, 'existing', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permitir chamada pelo service_role (Edge Function) e authenticated
GRANT EXECUTE ON FUNCTION public.ensure_company_client(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_company_client(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
