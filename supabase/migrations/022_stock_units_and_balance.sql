-- Sistema de pesagem e unidades no estoque
-- Multi-tenant: todos os updates respeitam company_id via aplicação e RLS existente

ALTER TABLE stock_products
  ADD COLUMN IF NOT EXISTS unit_type TEXT NOT NULL DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS current_quantity NUMERIC NOT NULL DEFAULT 0;

-- Compatibilidade com base legada (unit enum antigo)
UPDATE stock_products
SET unit_type = CASE
  WHEN unit::text = 'ml' THEN 'ml'
  WHEN unit::text = 'g' THEN 'g'
  ELSE 'unit'
END
WHERE unit_type IS NULL
   OR unit_type NOT IN ('unit', 'ml', 'g');

-- Remove checks antigos sobre unit_type, se existirem
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.stock_products'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%unit_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.stock_products DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END$$;

ALTER TABLE stock_products
  ADD CONSTRAINT stock_products_unit_type_check
  CHECK (unit_type IN ('unit', 'ml', 'g'));

-- Permitir movimentações decimais
ALTER TABLE stock_movements
  ALTER COLUMN quantity TYPE NUMERIC USING quantity::numeric;

-- Backfill de saldo atual com base no histórico existente
UPDATE stock_products p
SET current_quantity = COALESCE(m.total_qty, 0)
FROM (
  SELECT product_id, SUM(quantity) AS total_qty
  FROM stock_movements
  GROUP BY product_id
) m
WHERE p.id = m.product_id;

COMMENT ON COLUMN stock_products.unit_type IS
  'Unidade de medida do produto: unit, ml ou g.';

COMMENT ON COLUMN stock_products.current_quantity IS
  'Saldo atual do estoque do produto.';
