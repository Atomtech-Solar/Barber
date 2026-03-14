-- Vincula agendamentos antigos (walk-in) ao usuário quando ele cria conta
-- Atualiza appointments SET client_id = user_id onde phone/email batem

CREATE OR REPLACE FUNCTION public.link_appointments_to_user(
  p_user_id UUID,
  p_company_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_norm TEXT;
  v_count INTEGER;
BEGIN
  v_phone_norm := NULL;
  IF p_phone IS NOT NULL AND TRIM(p_phone) <> '' THEN
    v_phone_norm := regexp_replace(TRIM(p_phone), '\D', '', 'g');
  END IF;

  UPDATE appointments
  SET client_id = p_user_id,
      updated_at = now()
  WHERE company_id = p_company_id
    AND client_id IS NULL
    AND (
      (length(v_phone_norm) >= 8 AND regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g') = v_phone_norm)
      OR
      (p_email IS NOT NULL AND TRIM(p_email) <> '' AND lower(TRIM(client_email)) = lower(TRIM(p_email)))
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_appointments_to_user(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_appointments_to_user(UUID, UUID, TEXT, TEXT) TO service_role;
