-- Horário padrão de funcionamento por empresa (janela global de agendamento)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS opening_time TIME;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS closing_time TIME;

COMMENT ON COLUMN companies.opening_time IS 'Horário de abertura da empresa para agendamentos';
COMMENT ON COLUMN companies.closing_time IS 'Horário de fechamento da empresa para agendamentos';
