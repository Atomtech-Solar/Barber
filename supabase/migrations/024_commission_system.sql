-- =============================================================================
-- SISTEMA DE GESTÃO DE COMISSÕES (Mini Empresa | Multi-Tenant)
-- company_id obrigatório em todos os registros
-- =============================================================================

-- 1. Configurações de comissão por profissional
CREATE TABLE professional_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  minimo_garantido_mensal NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (minimo_garantido_mensal >= 0),
  comissao_padrao_percentual NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (comissao_padrao_percentual >= 0 AND comissao_padrao_percentual <= 100),
  fechamento_dia INT NOT NULL DEFAULT 30 CHECK (fechamento_dia >= 1 AND fechamento_dia <= 31),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, professional_id)
);

CREATE INDEX idx_prof_commission_settings_company ON professional_commission_settings(company_id);
CREATE INDEX idx_prof_commission_settings_professional ON professional_commission_settings(professional_id);

-- 2. Comissão personalizada por serviço
CREATE TABLE professional_service_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  percentual NUMERIC(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, professional_id, service_id)
);

CREATE INDEX idx_prof_service_commissions_company ON professional_service_commissions(company_id);
CREATE INDEX idx_prof_service_commissions_professional ON professional_service_commissions(professional_id);

-- 3. Resumo mensal calculado
CREATE TABLE monthly_commission_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  total_faturado NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_comissao NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimo_garantido NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_final NUMERIC(10,2) NOT NULL DEFAULT 0,
  fechado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, professional_id, mes)
);

CREATE INDEX idx_monthly_commission_summary_company ON monthly_commission_summary(company_id);
CREATE INDEX idx_monthly_commission_summary_professional ON monthly_commission_summary(professional_id);
CREATE INDEX idx_monthly_commission_summary_mes ON monthly_commission_summary(company_id, mes);

COMMENT ON TABLE professional_commission_settings IS 'Configuração de comissão e mínimo garantido por profissional.';
COMMENT ON TABLE professional_service_commissions IS 'Percentual de comissão personalizado por serviço. Se não existir, usa comissão padrão.';
COMMENT ON TABLE monthly_commission_summary IS 'Resumo mensal calculado e fechado por profissional.';

-- RLS
ALTER TABLE professional_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_service_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_commission_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commission settings by company staff" ON professional_commission_settings
  FOR ALL USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Service commissions by company staff" ON professional_service_commissions
  FOR ALL USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Monthly summary by company staff" ON monthly_commission_summary
  FOR ALL USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
    )
  );
