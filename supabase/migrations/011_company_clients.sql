-- Tabela de clientes/contatos por empresa (cadastro manual)
CREATE TABLE IF NOT EXISTS company_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_clients_company ON company_clients(company_id);

ALTER TABLE company_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company clients by access" ON company_clients
  FOR ALL USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
    )
  );
