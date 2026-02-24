-- Estende tabela companies com campos do formulário completo
-- owner_id, cnpj, owner_name, owner_phone, logo_url

ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);

-- Bucket e políticas de storage (execute no Dashboard se a migration falhar)
-- Storage > New bucket > company-logos (public)
-- Policies: INSERT para authenticated + owner, SELECT público
