-- =============================================================================
-- REGISTROS FINANCEIROS (Mini Empresa | Multi-Tenant)
-- Integração Agenda → Financeiro | company_id obrigatório
-- =============================================================================

CREATE TYPE financial_type AS ENUM ('income', 'expense');
CREATE TYPE financial_source AS ENUM ('appointment', 'manual', 'product');

CREATE TABLE financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  type financial_type NOT NULL,
  source financial_source NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  service_name_snapshot TEXT,
  client_name_snapshot TEXT,
  professional_name_snapshot TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_valid BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_financial_records_company ON financial_records(company_id);
CREATE INDEX idx_financial_records_appointment ON financial_records(appointment_id);
CREATE INDEX idx_financial_records_valid ON financial_records(company_id, is_valid) WHERE is_valid = true;
CREATE INDEX idx_financial_records_created ON financial_records(company_id, created_at DESC);

ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- Apenas equipe da empresa (company_members) tem acesso
CREATE POLICY "Financial records by company staff" ON financial_records
  FOR ALL USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
    )
  );
