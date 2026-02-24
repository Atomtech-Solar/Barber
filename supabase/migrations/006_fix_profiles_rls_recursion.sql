-- =============================================================================
-- CORREÇÃO: Recursão infinita em policies de profiles
-- Policies que fazem SELECT em profiles dentro de policies de profiles causam
-- "infinite recursion detected in policy for relation profiles".
-- Solução: funções SECURITY DEFINER que leem profiles sem acionar RLS.
-- =============================================================================

-- 1. Função: usuário é platform owner? (bypass RLS para evitar recursão)
CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner');
$$;

-- 2. Função: company_id do perfil do usuário (para staff/company_admin)
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Profiles: remover policies que causam recursão e recriar com funções
DROP POLICY IF EXISTS "Owner can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Company admins see company profiles" ON profiles;

-- Owner vê todos os perfis (usa função, sem recursão)
CREATE POLICY "Owner can manage all profiles" ON profiles
  FOR ALL USING (public.is_platform_owner());

-- Company admin/employee vê perfis da mesma empresa
CREATE POLICY "Company admins see company profiles" ON profiles
  FOR SELECT USING (
    company_id = public.current_user_company_id()
    AND public.current_user_company_id() IS NOT NULL
  );

-- 4. Companies: substituir subqueries em profiles por is_platform_owner()
-- INSERT: apenas owner_id = auth.uid() (evita recursão; AdminGuard restringe no frontend)
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

DROP POLICY IF EXISTS "Companies update by access" ON companies;
CREATE POLICY "Companies update by access" ON companies
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = companies.id AND cm.user_id = auth.uid())
    OR public.is_platform_owner()
  );

DROP POLICY IF EXISTS "Companies delete by access" ON companies;
CREATE POLICY "Companies delete by access" ON companies
  FOR DELETE USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = companies.id AND cm.user_id = auth.uid())
    OR public.is_platform_owner()
  );

-- 5. Services, Professionals, etc.: substituir subqueries em profiles
DROP POLICY IF EXISTS "Services by company access" ON services;
CREATE POLICY "Services by company access" ON services
  FOR ALL USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR public.is_platform_owner()
    )
  );

DROP POLICY IF EXISTS "Professionals by company access" ON professionals;
CREATE POLICY "Professionals by company access" ON professionals
  FOR ALL USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR public.is_platform_owner()
    )
  );

DROP POLICY IF EXISTS "Appointments by company access" ON appointments;
CREATE POLICY "Appointments by company access" ON appointments
  FOR ALL USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR public.is_platform_owner()
    )
    OR client_id = auth.uid()
  );

DROP POLICY IF EXISTS "Professional_services by company access" ON professional_services;
CREATE POLICY "Professional_services by company access" ON professional_services
  FOR ALL USING (
    professional_id IN (
      SELECT p.id FROM professionals p
      JOIN companies c ON c.id = p.company_id
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR public.is_platform_owner()
    )
  );

DROP POLICY IF EXISTS "Working_hours by company access" ON working_hours;
CREATE POLICY "Working_hours by company access" ON working_hours
  FOR ALL USING (
    professional_id IN (
      SELECT p.id FROM professionals p
      JOIN companies c ON c.id = p.company_id
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR public.is_platform_owner()
    )
  );

DROP POLICY IF EXISTS "Appointment_services by access" ON appointment_services;
CREATE POLICY "Appointment_services by access" ON appointment_services
  FOR ALL USING (
    appointment_id IN (
      SELECT a.id FROM appointments a
      JOIN companies c ON c.id = a.company_id
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR public.is_platform_owner()
    )
    OR appointment_id IN (SELECT id FROM appointments WHERE client_id = auth.uid())
  );
