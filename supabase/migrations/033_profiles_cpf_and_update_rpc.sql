-- CPF opcional no perfil do cliente (profiles)
-- RPC para cliente atualizar perfil e sincronizar com company_clients

-- 1. Adicionar CPF em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;

-- 2. Atualizar get_own_profile para incluir cpf
CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  cpf text,
  role user_role,
  company_id uuid,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.full_name, p.phone, p.cpf, p.role, p.company_id, p.avatar_url, p.created_at, p.updated_at
  FROM profiles p
  WHERE p.id = auth.uid();
$$;

-- 3. RPC para cliente atualizar próprio perfil (profiles + company_clients)
-- Sincroniza nome, telefone e CPF em todas as empresas em que o cliente está vinculado
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_updates JSONB;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Atualizar profiles
  UPDATE public.profiles
  SET
    full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
    phone = CASE WHEN p_phone IS NOT NULL THEN NULLIF(TRIM(p_phone), '') ELSE phone END,
    cpf = CASE WHEN p_cpf IS NOT NULL THEN NULLIF(TRIM(p_cpf), '') ELSE cpf END,
    updated_at = now()
  WHERE id = v_uid;

  -- Sincronizar company_clients vinculados ao usuário
  UPDATE public.company_clients
  SET
    full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
    phone = CASE WHEN p_phone IS NOT NULL THEN NULLIF(TRIM(p_phone), '') ELSE phone END,
    cpf = CASE WHEN p_cpf IS NOT NULL THEN NULLIF(TRIM(p_cpf), '') ELSE cpf END,
    updated_at = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT) TO authenticated;
