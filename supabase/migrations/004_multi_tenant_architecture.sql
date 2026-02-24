-- =============================================================================
-- ARQUITETURA MULTI-TENANT
-- company_members + RLS padronizado por tenant
-- =============================================================================

-- 1. Tabela company_members (preparação para múltiplos usuários por empresa)
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

-- 2. Trigger: ao criar empresa, inserir owner em company_members
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_company_created ON companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_company_created();

-- 3. Backfill: empresas com owner_id -> company_members
INSERT INTO company_members (user_id, company_id, role)
SELECT owner_id, id, 'owner'
FROM companies
WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 4. Backfill: profiles (company_admin, employee) -> company_members
INSERT INTO company_members (user_id, company_id, role)
SELECT id, company_id,
  CASE WHEN role = 'company_admin' THEN 'admin' ELSE 'staff' END
FROM profiles
WHERE company_id IS NOT NULL AND role IN ('company_admin', 'employee')
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 4b. Trigger: ao atualizar profile com company_id, sincronizar company_members
CREATE OR REPLACE FUNCTION public.sync_profile_to_company_members()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL AND NEW.role IN ('company_admin', 'employee') THEN
    INSERT INTO company_members (user_id, company_id, role)
    VALUES (NEW.id, NEW.company_id, CASE WHEN NEW.role = 'company_admin' THEN 'admin' ELSE 'staff' END)
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_company_updated ON profiles;
CREATE TRIGGER on_profile_company_updated
  AFTER INSERT OR UPDATE OF company_id, role ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_company_members();

-- 5. Helper: usuário tem acesso à empresa?
CREATE OR REPLACE FUNCTION public.user_can_access_company(cid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = cid
    AND (
      c.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM company_members cm
        WHERE cm.company_id = c.id AND cm.user_id = auth.uid()
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. RLS: company_members (usuário vê apenas seus vínculos)
CREATE POLICY "Users see own company_members" ON company_members
  FOR ALL USING (user_id = auth.uid());

-- 7. RLS: companies — substituir políticas antigas
DROP POLICY IF EXISTS "Owner manages all companies" ON companies;
DROP POLICY IF EXISTS "Public reads active companies" ON companies;

-- Platform Owner (profile.role='owner') gerencia todas + usuário acessa suas empresas
CREATE POLICY "Companies select by access" ON companies
  FOR SELECT USING (
    status = 'active'
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
    OR owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = companies.id AND cm.user_id = auth.uid())
  );

CREATE POLICY "Companies insert as owner" ON companies
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner'))
  );

CREATE POLICY "Companies update by access" ON companies
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = companies.id AND cm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
  );

CREATE POLICY "Companies delete by access" ON companies
  FOR DELETE USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = companies.id AND cm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
  );

-- 8. RLS: tabelas empresariais — usar company_members
-- Services
DROP POLICY IF EXISTS "Company staff manage services" ON services;
DROP POLICY IF EXISTS "Public reads services of active companies" ON services;

CREATE POLICY "Services by company access" ON services
  FOR ALL USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
    )
  );

CREATE POLICY "Services public read active" ON services
  FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE status = 'active')
  );

-- Professionals
DROP POLICY IF EXISTS "Company staff manage professionals" ON professionals;
DROP POLICY IF EXISTS "Public reads professionals of active companies" ON professionals;

CREATE POLICY "Professionals by company access" ON professionals
  FOR ALL USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
    )
  );

CREATE POLICY "Professionals public read active" ON professionals
  FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE status = 'active')
  );

-- Appointments
DROP POLICY IF EXISTS "Company staff manage appointments" ON appointments;

CREATE POLICY "Appointments by company access" ON appointments
  FOR ALL USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
    )
    OR client_id = auth.uid()
  );

-- professional_services
DROP POLICY IF EXISTS "Company staff manage professional_services" ON professional_services;

CREATE POLICY "Professional_services by company access" ON professional_services
  FOR ALL USING (
    professional_id IN (
      SELECT p.id FROM professionals p
      JOIN companies c ON c.id = p.company_id
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role = 'owner')
    )
  );

-- working_hours
DROP POLICY IF EXISTS "Company staff manage working_hours" ON working_hours;

CREATE POLICY "Working_hours by company access" ON working_hours
  FOR ALL USING (
    professional_id IN (
      SELECT p.id FROM professionals p
      JOIN companies c ON c.id = p.company_id
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role = 'owner')
    )
  );

-- appointment_services
DROP POLICY IF EXISTS "Staff manage appointment_services" ON appointment_services;

CREATE POLICY "Appointment_services by access" ON appointment_services
  FOR ALL USING (
    appointment_id IN (
      SELECT a.id FROM appointments a
      JOIN companies c ON c.id = a.company_id
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role = 'owner')
    )
    OR appointment_id IN (SELECT id FROM appointments WHERE client_id = auth.uid())
  );
