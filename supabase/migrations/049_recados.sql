-- Mural de recados interno por empresa (multi-tenant)

CREATE TYPE recado_prioridade AS ENUM ('normal', 'importante', 'urgente');

CREATE TABLE recados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  autor TEXT NOT NULL,
  prioridade recado_prioridade NOT NULL DEFAULT 'normal',
  fixado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_recados_company ON recados(company_id);
CREATE INDEX idx_recados_company_fixado_criado ON recados(company_id, fixado DESC, criado_em DESC);

ALTER TABLE recados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recados by company staff" ON recados
  FOR ALL USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE recados IS 'Mural de recados interno da equipe por empresa.';
