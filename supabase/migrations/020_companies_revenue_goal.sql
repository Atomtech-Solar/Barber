ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS revenue_goal_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS revenue_goal_period TEXT
    CHECK (revenue_goal_period IN ('daily', 'weekly', 'monthly', 'custom')),
  ADD COLUMN IF NOT EXISTS revenue_goal_custom_start_date DATE,
  ADD COLUMN IF NOT EXISTS revenue_goal_custom_end_date DATE;

COMMENT ON COLUMN companies.revenue_goal_amount IS
  'Meta de faturamento da empresa para o período configurado.';

COMMENT ON COLUMN companies.revenue_goal_period IS
  'Periodicidade da meta de faturamento: daily, weekly, monthly ou custom.';

COMMENT ON COLUMN companies.revenue_goal_custom_start_date IS
  'Data de início da meta personalizada quando revenue_goal_period = custom.';

COMMENT ON COLUMN companies.revenue_goal_custom_end_date IS
  'Data de término da meta personalizada quando revenue_goal_period = custom.';
