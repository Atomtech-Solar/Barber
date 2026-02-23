-- RPC para carregar perfil próprio de forma confiável
-- Resolve edge cases de RLS (auth.uid() timing, policies circulares)
-- Segurança: usa auth.uid() - retorna APENAS o perfil do usuário autenticado

CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
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
  SELECT p.id, p.full_name, p.phone, p.role, p.company_id, p.avatar_url, p.created_at, p.updated_at
  FROM profiles p
  WHERE p.id = auth.uid();
$$;

-- Usuários com JWT válido (role authenticated) podem chamar
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;

COMMENT ON FUNCTION public.get_own_profile() IS 'Retorna o perfil do usuário autenticado. Seguro: filtra por auth.uid().';
