-- Campos do admin supremo: dia iniciado, dias ativo, observações
ALTER TABLE companies ADD COLUMN IF NOT EXISTS active_from DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS active_days INT CHECK (active_days IS NULL OR active_days > 0);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS admin_obs TEXT;

COMMENT ON COLUMN companies.active_from IS 'Data em que o plano/atividade da empresa foi iniciado (admin)';
COMMENT ON COLUMN companies.active_days IS 'Quantidade de dias que a empresa ficará ativa (admin)';
COMMENT ON COLUMN companies.admin_obs IS 'Observações do admin sobre a empresa';
