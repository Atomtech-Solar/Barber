-- =============================================================================
-- CORREÇÃO: infinite recursion em policies de profiles
-- is_platform_owner() lia profiles → profiles RLS → is_platform_owner() → loop
-- Solução: tabela platform_owners separada, SEM policy que leia profiles
-- =============================================================================

-- 1. Tabela auxiliar: IDs de platform owners (evita ler profiles nas policies)
CREATE TABLE IF NOT EXISTS public.platform_owners (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE platform_owners ENABLE ROW LEVEL SECURITY;

-- RLS: apenas o próprio usuário pode ver se está na lista (ou podemos ser permissivos)
-- Para is_platform_owner(), a função lê como SECURITY DEFINER, bypassando RLS
CREATE POLICY "Users can read platform_owners" ON platform_owners
  FOR SELECT USING (user_id = auth.uid());

-- 2. Sincronizar platform_owners a partir de profiles
INSERT INTO platform_owners (user_id)
SELECT id FROM profiles WHERE role = 'owner'::user_role
ON CONFLICT (user_id) DO NOTHING;

-- 3. Trigger: manter platform_owners sincronizado com profiles
CREATE OR REPLACE FUNCTION public.sync_platform_owners()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'owner'::user_role THEN
    INSERT INTO platform_owners (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM platform_owners WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_platform_owners_on_profile ON profiles;
CREATE TRIGGER sync_platform_owners_on_profile
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_platform_owners();

-- 4. is_platform_owner() agora lê de platform_owners (nunca profiles)
CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM platform_owners WHERE user_id = auth.uid());
$$;
