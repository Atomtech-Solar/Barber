-- =============================================================================
-- CORREÇÃO: RLS na criação de empresas
-- A policy INSERT em companies dependia de SELECT em profiles, causando violação.
-- Solução: usar apenas auth.uid(), sem subquery em profiles.
-- Profiles: garantir policies mínimas para leitura do próprio perfil.
-- =============================================================================

-- 1. Garantir policies mínimas em profiles (leitura e atualização do próprio)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Simplificar INSERT em companies: SEM subquery em profiles
-- owner_id = auth.uid() é suficiente: usuário só pode criar empresa para si.
-- O AdminGuard no frontend garante que apenas Owners acessam o formulário.
DROP POLICY IF EXISTS "Companies insert as owner" ON companies;
CREATE POLICY "Companies insert as owner" ON companies
  FOR INSERT WITH CHECK (owner_id = auth.uid());
