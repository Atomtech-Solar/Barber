-- Upgrade incremental para quem já executou a v020 antiga
-- (que aceitava apenas 'daily' | 'weekly').

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS revenue_goal_custom_start_date DATE,
  ADD COLUMN IF NOT EXISTS revenue_goal_custom_end_date DATE;

-- Remove qualquer CHECK existente sobre revenue_goal_period
-- para recriar com os novos valores permitidos.
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.companies'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%revenue_goal_period%'
  LOOP
    EXECUTE format('ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END$$;

ALTER TABLE companies
  ADD CONSTRAINT companies_revenue_goal_period_check
  CHECK (revenue_goal_period IN ('daily', 'weekly', 'monthly', 'custom'));

COMMENT ON COLUMN companies.revenue_goal_amount IS
  'Meta de faturamento da empresa para o período configurado.';

COMMENT ON COLUMN companies.revenue_goal_period IS
  'Periodicidade da meta de faturamento: daily, weekly, monthly ou custom.';

COMMENT ON COLUMN companies.revenue_goal_custom_start_date IS
  'Data de início da meta personalizada quando revenue_goal_period = custom.';

COMMENT ON COLUMN companies.revenue_goal_custom_end_date IS
  'Data de término da meta personalizada quando revenue_goal_period = custom.';
