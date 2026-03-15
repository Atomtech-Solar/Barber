-- RPC para obter períodos ocupados do profissional (bypassa RLS)
-- Retorna apenas { start_time, duration_minutes } dos agendamentos ativos.
-- O cliente gera os slots e desabilita apenas os que sobrepõem.

CREATE OR REPLACE FUNCTION public.get_busy_periods(
  p_professional_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'start_time', to_char(a.start_time, 'HH24:MI'),
        'duration_minutes', COALESCE(a.duration_minutes, 0)
      )
    ), '[]'::jsonb)
    FROM appointments a
    WHERE a.professional_id = p_professional_id
      AND a.date = p_date
      AND a.status IN ('pending', 'confirmed', 'blocked')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_busy_periods(UUID, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_busy_periods(UUID, DATE) TO authenticated;
