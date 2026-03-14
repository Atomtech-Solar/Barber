-- =============================================================================
-- Correções para agendamento público aparecer na dashboard
-- 1. GRANT anon na RPC create_public_appointment (permite walk-in inserir)
-- 2. Policy working_hours para leitura pública (permite anon ver horários)
-- =============================================================================

-- 1. Permitir que usuários anônimos (walk-in) executem a RPC
GRANT EXECUTE ON FUNCTION public.create_public_appointment(
  UUID, UUID, DATE, TIME, INT, UUID[],
  TEXT, TEXT, TEXT
) TO anon;

-- 2. Leitura pública de working_hours para profissionais de empresas ativas
-- (necessário para getAvailableSlots retornar horários para usuários não logados)
CREATE POLICY "Working_hours public read active"
  ON working_hours
  FOR SELECT
  USING (
    professional_id IN (
      SELECT p.id FROM professionals p
      JOIN companies c ON c.id = p.company_id
      WHERE c.status = 'active' AND p.is_active = true
    )
  );
