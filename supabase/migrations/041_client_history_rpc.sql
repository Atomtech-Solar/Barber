-- Histórico de cliente: estatísticas e atendimentos
-- Usado na dashboard da empresa ao clicar em um cliente

CREATE OR REPLACE FUNCTION public.get_client_history(
  p_company_id UUID,
  p_company_client_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_total_visits INT;
  v_total_gasto NUMERIC;
  v_ticket_medio NUMERIC;
  v_ultima_visita DATE;
  v_history JSONB;
  v_phone_norm TEXT;
BEGIN
  -- Verificar acesso à empresa
  IF NOT EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = p_company_id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
      )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  -- Buscar cliente
  SELECT * INTO v_client
  FROM company_clients
  WHERE id = p_company_client_id AND company_id = p_company_id;

  IF v_client IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;

  v_phone_norm := regexp_replace(COALESCE(v_client.phone, ''), '\D', '', 'g');
  IF length(v_phone_norm) < 8 THEN
    v_phone_norm := NULL;
  END IF;

  -- Estatísticas: apenas atendimentos concluídos
  -- Match por: user_id (cliente com conta) ou telefone (walk-in)
  WITH client_appointments AS (
    SELECT a.id, a.date, a.professional_id
    FROM appointments a
    WHERE a.company_id = p_company_id
      AND a.status = 'completed'
      AND (
        (v_client.user_id IS NOT NULL AND a.client_id = v_client.user_id)
        OR (v_phone_norm IS NOT NULL AND length(regexp_replace(COALESCE(a.client_phone,''), '\D', '', 'g')) >= 8
            AND regexp_replace(COALESCE(a.client_phone,''), '\D', '', 'g') = v_phone_norm)
      )
  ),
  apt_totals AS (
    SELECT
      ca.id,
      ca.date,
      COALESCE(SUM(s.price), 0) AS valor
    FROM client_appointments ca
    LEFT JOIN appointment_services aps ON aps.appointment_id = ca.id
    LEFT JOIN services s ON s.id = aps.service_id AND s.company_id = p_company_id
    GROUP BY ca.id, ca.date
  )
  SELECT
    COUNT(*)::INT,
    COALESCE(SUM(valor), 0),
    CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(valor), 0) / COUNT(*) ELSE 0 END,
    MAX(date)
  INTO v_total_visits, v_total_gasto, v_ticket_medio, v_ultima_visita
  FROM apt_totals;

  v_total_visits := COALESCE(v_total_visits, 0);
  v_total_gasto := COALESCE(v_total_gasto, 0);
  v_ticket_medio := COALESCE(v_ticket_medio, 0);

  -- Histórico: atendimentos ordenados por data decrescente
  WITH client_appointments AS (
    SELECT a.id, a.date, a.professional_id
    FROM appointments a
    WHERE a.company_id = p_company_id
      AND a.status = 'completed'
      AND (
        (v_client.user_id IS NOT NULL AND a.client_id = v_client.user_id)
        OR (v_phone_norm IS NOT NULL AND length(regexp_replace(COALESCE(a.client_phone,''), '\D', '', 'g')) >= 8
            AND regexp_replace(COALESCE(a.client_phone,''), '\D', '', 'g') = v_phone_norm)
      )
  ),
  apt_with_details AS (
    SELECT
      ca.id,
      ca.date,
      ca.professional_id,
      COALESCE(SUM(s.price), 0) AS valor,
      string_agg(s.name, ' + ' ORDER BY s.name) AS service_names
    FROM client_appointments ca
    LEFT JOIN appointment_services aps ON aps.appointment_id = ca.id
    LEFT JOIN services s ON s.id = aps.service_id AND s.company_id = p_company_id
    GROUP BY ca.id, ca.date, ca.professional_id
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'appointment_id', a.id,
      'date', a.date,
      'service_names', COALESCE(NULLIF(trim(a.service_names), ''), 'Atendimento'),
      'professional_name', COALESCE(p.name, '—'),
      'valor', a.valor
    ) ORDER BY a.date DESC
  )
  INTO v_history
  FROM apt_with_details a
  LEFT JOIN professionals p ON p.id = a.professional_id;

  RETURN jsonb_build_object(
    'success', true,
    'client', jsonb_build_object(
      'id', v_client.id,
      'full_name', v_client.full_name,
      'phone', v_client.phone,
      'email', v_client.email,
      'cpf', v_client.cpf,
      'notes', v_client.notes,
      'created_at', v_client.created_at
    ),
    'stats', jsonb_build_object(
      'total_visits', v_total_visits,
      'total_gasto', v_total_gasto,
      'ticket_medio', v_ticket_medio,
      'ultima_visita', v_ultima_visita
    ),
    'history', COALESCE(v_history, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_history(UUID, UUID) TO authenticated;
