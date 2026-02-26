-- =============================================================================
-- SISTEMA DE ESTOQUE (Mini Empresa | Multi-Tenant)
-- Produtos + Movimentações | company_id obrigatório em todos os registros
-- =============================================================================

-- Unidades de medida
CREATE TYPE stock_unit AS ENUM ('unidade', 'ml', 'g', 'frasco', 'caixa');

-- Tipos de movimentação
CREATE TYPE stock_movement_type AS ENUM ('entry', 'usage', 'sale', 'adjustment');

-- 1. Tabela stock_products (produtos por empresa)
CREATE TABLE stock_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  description TEXT,
  unit stock_unit NOT NULL DEFAULT 'unidade',
  minimum_stock INT NOT NULL CHECK (minimum_stock >= 0),
  image_url TEXT,
  cost_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stock_products_company ON stock_products(company_id);
CREATE INDEX idx_stock_products_active ON stock_products(company_id, is_active) WHERE is_active = true;

-- 2. Tabela stock_movements (movimentações = ledger)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES stock_products(id) ON DELETE CASCADE,
  movement_type stock_movement_type NOT NULL,
  quantity INT NOT NULL CHECK (quantity != 0),
  -- entry/usage/sale: sempre positivo; adjustment: + ou - conforme o ajuste
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stock_movements_company ON stock_movements(company_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(product_id, created_at DESC);

-- RLS
ALTER TABLE stock_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Apenas equipe da empresa (company_members) tem acesso ao estoque
-- Owner da plataforma NÃO possui acesso operacional
CREATE POLICY "Stock products by company staff" ON stock_products
  FOR ALL USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Stock movements by company staff" ON stock_movements
  FOR ALL USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
    )
  );
