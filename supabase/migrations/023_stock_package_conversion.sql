-- Estoque baseado em embalagem + consumo real em unidade base

ALTER TABLE stock_products
  ADD COLUMN IF NOT EXISTS package_quantity NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS package_type TEXT;

-- Garantir valores válidos
ALTER TABLE stock_products
  DROP CONSTRAINT IF EXISTS stock_products_package_quantity_check;

ALTER TABLE stock_products
  ADD CONSTRAINT stock_products_package_quantity_check
  CHECK (package_quantity > 0);

COMMENT ON COLUMN stock_products.package_quantity IS
  'Quantidade por embalagem na unidade base (ex: 100 ml por frasco).';

COMMENT ON COLUMN stock_products.package_type IS
  'Tipo da embalagem (ex: Frasco, Pote, Caixa).';
