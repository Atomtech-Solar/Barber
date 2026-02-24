-- =============================================================================
-- CORREÇÃO: Owner não consegue cadastrar/listar empresas
-- RPC list_my_companies como fallback confiável (SECURITY DEFINER)
-- Garantir INSERT e SELECT funcionando para platform owner
-- =============================================================================

-- 0. Garantir company_members existe (caso migration 004 falhou parcialmente)
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own company_members" ON company_members;
CREATE POLICY "Users see own company_members" ON company_members FOR ALL USING (user_id = auth.uid());

-- 1. Garantir is_platform_owner() (deve existir antes de list_my_companies)
CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'::user_role
  );
$$;

-- 2. RPC: listar empresas acessíveis ao usuário (bypass RLS)
CREATE OR REPLACE FUNCTION public.list_my_companies()
RETURNS SETOF companies
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.* FROM companies c
  WHERE public.is_platform_owner()
     OR c.owner_id = auth.uid()
     OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.list_my_companies() TO authenticated;

COMMENT ON FUNCTION public.list_my_companies() IS 'Retorna empresas acessíveis ao usuário autenticado. Platform owner vê todas.';

-- 3. Reforçar policies de companies (garantir INSERT e SELECT)
DROP POLICY IF EXISTS "Companies insert as owner" ON companies;
CREATE POLICY "Companies insert as owner" ON companies
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Companies select by access" ON companies;
CREATE POLICY "Companies select by access" ON companies
  FOR SELECT USING (
    status = 'active'
    OR public.is_platform_owner()
    OR owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = companies.id AND cm.user_id = auth.uid())
  );

-- 4. Garantir trigger handle_company_created (insere owner em company_members)
CREATE OR REPLACE FUNCTION public.handle_company_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.company_members (user_id, company_id, role)
    VALUES (NEW.owner_id, NEW.id, 'owner')
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_company_created ON companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_company_created();
