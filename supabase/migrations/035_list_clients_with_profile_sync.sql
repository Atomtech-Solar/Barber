-- Lista clientes da empresa incluindo os que têm profile.company_id (vínculo)
-- Sincroniza automaticamente profiles (role=client, company_id) que ainda não estão em company_clients

CREATE OR REPLACE FUNCTION public.list_company_clients(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  user_id UUID,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  cpf TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Garantir acesso: quem pode ver company_clients da empresa
  IF NOT EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = p_company_id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
      )
  ) THEN
    RETURN;
  END IF;

  -- Sincronizar: inserir em company_clients os profiles com company_id que ainda não estão vinculados
  INSERT INTO public.company_clients (company_id, user_id, full_name, phone, email, cpf)
  SELECT
    p_company_id,
    pr.id,
    pr.full_name,
    pr.phone,
    u.email,
    pr.cpf
  FROM public.profiles pr
  JOIN auth.users u ON u.id = pr.id
  WHERE pr.role = 'client'
    AND pr.company_id = p_company_id
    AND NOT EXISTS (
      SELECT 1 FROM public.company_clients cc
      WHERE cc.company_id = p_company_id AND cc.user_id = pr.id
    );

  -- Retornar apenas os que têm vínculo (company_clients)
  RETURN QUERY
  SELECT
    cc.id,
    cc.company_id,
    cc.user_id,
    cc.full_name,
    cc.phone,
    cc.email,
    cc.cpf,
    cc.notes,
    cc.created_at,
    cc.updated_at
  FROM public.company_clients cc
  WHERE cc.company_id = p_company_id
  ORDER BY cc.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_company_clients(UUID) TO authenticated;