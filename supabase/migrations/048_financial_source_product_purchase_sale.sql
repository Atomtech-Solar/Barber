-- Estender origem de registros financeiros para compra e venda de produtos (integração estoque)

ALTER TYPE financial_source ADD VALUE IF NOT EXISTS 'product_purchase';
ALTER TYPE financial_source ADD VALUE IF NOT EXISTS 'product_sale';
