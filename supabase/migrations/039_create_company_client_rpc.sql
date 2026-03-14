-- RPC para criar cliente manualmente pela dashboard
-- Usa SECURITY DEFINER para evitar problemas de RLS no INSERT
-- Clientes manuais (sem user_id) criados pelo staff da empresa

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
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'company_id é obrigatório');
  END IF;

  IF NULLIF(TRIM(p_full_name), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome é obrigatório');
  END IF;

  -- Verificar acesso: apenas owner, membros da equipe ou platform owner
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

  -- Empresa ativa
  IF NOT EXISTS (
    SELECT 1 FROM companies WHERE id = p_company_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada ou inativa');
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
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_client(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- RPC para atualizar cliente pela dashboard (evita problemas de RLS)
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
BEGIN
  IF p_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'client_id é obrigatório');
  END IF;

  -- Verificar acesso ao cliente (via company_id)
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

  UPDATE company_clients
  SET
    full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
    phone = NULLIF(TRIM(COALESCE(p_phone, '')), ''),
    email = NULLIF(TRIM(COALESCE(p_email, '')), ''),
    cpf = NULLIF(TRIM(COALESCE(p_cpf, '')), ''),
    notes = NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    updated_at = now()
  WHERE id = p_client_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_company_client(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- RPC para deletar cliente pela dashboard
CREATE OR REPLACE FUNCTION public.delete_company_client(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'client_id é obrigatório');
  END IF;

  -- Verificar acesso
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
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para remover este cliente');
  END IF;

  DELETE FROM company_clients WHERE id = p_client_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_company_client(UUID) TO authenticated;
