-- =============================================================================
-- GESTÃO DE PAGAMENTOS (substitui Comissões)
-- Salário fixo + Comissão sobre excedente
-- company_id obrigatório em todos os registros
-- =============================================================================

-- Remove tabelas antigas do sistema de comissões
DROP TABLE IF EXISTS monthly_commission_summary CASCADE;
DROP TABLE IF EXISTS professional_commission_settings CASCADE;

-- 1. Configurações de pagamento por profissional
CREATE TABLE professional_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  salario_fixo_mensal NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (salario_fixo_mensal >= 0),
  percentual_comissao_padrao NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (percentual_comissao_padrao >= 0 AND percentual_comissao_padrao <= 100),
  fechamento_dia INT NOT NULL DEFAULT 30 CHECK (fechamento_dia >= 1 AND fechamento_dia <= 31),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, professional_id)
);

CREATE INDEX idx_prof_payment_settings_company ON professional_payment_settings(company_id);
CREATE INDEX idx_prof_payment_settings_professional ON professional_payment_settings(professional_id);

-- 2. professional_service_commissions já existe na 024 - mantém

-- 3. Resumo mensal calculado (novo)
CREATE TABLE monthly_professional_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  total_faturado NUMERIC(10,2) NOT NULL DEFAULT 0,
  ponto_equilibrio NUMERIC(10,2) NOT NULL DEFAULT 0,
  excedente NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_comissao_excedente NUMERIC(10,2) NOT NULL DEFAULT 0,
  salario_fixo NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_final NUMERIC(10,2) NOT NULL DEFAULT 0,
  fechado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, professional_id, mes)
);

CREATE INDEX idx_monthly_professional_summary_company ON monthly_professional_summary(company_id);
CREATE INDEX idx_monthly_professional_summary_professional ON monthly_professional_summary(professional_id);
CREATE INDEX idx_monthly_professional_summary_mes ON monthly_professional_summary(company_id, mes);

COMMENT ON TABLE professional_payment_settings IS 'Salário fixo e percentual de comissão por profissional. Comissão paga apenas sobre excedente.';
COMMENT ON TABLE monthly_professional_summary IS 'Resumo mensal calculado: salário fixo + comissão sobre excedente.';

-- RLS
ALTER TABLE professional_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment settings by company staff" ON professional_payment_settings
  FOR ALL USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

ALTER TABLE monthly_professional_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Monthly summary by company staff" ON monthly_professional_summary
  FOR ALL USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
    )
  );
