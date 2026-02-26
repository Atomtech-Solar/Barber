-- Customização visual da dashboard por empresa (tenant)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS customization_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS dashboard_theme TEXT
    CHECK (dashboard_theme IN ('dark', 'light'));

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS dashboard_primary_color TEXT;

COMMENT ON COLUMN companies.customization_enabled IS
'Quando true, a empresa pode usar tema customizado na dashboard';

COMMENT ON COLUMN companies.dashboard_theme IS
'Tema visual da dashboard da empresa: dark ou light';

COMMENT ON COLUMN companies.dashboard_primary_color IS
'Cor primária da dashboard em formato HEX (ex: #F59E0B)';
