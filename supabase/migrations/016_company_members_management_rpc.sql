-- Gestão de vínculo de usuários por empresa (Super Admin)
-- Não altera estrutura principal: usa companies, profiles e company_members

-- Lista equipe vinculada a uma empresa
CREATE OR REPLACE FUNCTION public.list_company_members(p_company_id UUID)
RETURNS TABLE (
  user_id UUID,
  company_id UUID,
  role TEXT,
  linked_at TIMESTAMPTZ,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT
    cm.user_id,
    cm.company_id,
    cm.role,
    cm.created_at AS linked_at,
    p.full_name,
    u.email,
    p.phone,
    p.avatar_url
  FROM public.company_members cm
  LEFT JOIN public.profiles p ON p.id = cm.user_id
  LEFT JOIN auth.users u ON u.id = cm.user_id
  WHERE
    public.is_platform_owner()
    AND cm.company_id = p_company_id
  ORDER BY cm.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_company_members(UUID) TO authenticated;

-- Cria/reutiliza usuário e garante vínculo com empresa
CREATE OR REPLACE FUNCTION public.upsert_company_member(
  p_company_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email TEXT;
  v_phone TEXT;
  v_full_name TEXT;
  v_user_id UUID;
BEGIN
  IF NOT public.is_platform_owner() THEN
    RAISE EXCEPTION 'Apenas Super Admin pode gerenciar equipe.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = p_company_id) THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;

  v_email := lower(trim(coalesce(p_email, '')));
  v_phone := NULLIF(trim(coalesce(p_phone, '')), '');
  v_full_name := NULLIF(trim(coalesce(p_full_name, '')), '');

  IF v_email = '' THEN
    RAISE EXCEPTION 'Email é obrigatório.';
  END IF;

  IF v_full_name IS NULL THEN
    RAISE EXCEPTION 'Nome completo é obrigatório.';
  END IF;

  SELECT u.id
  INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(),
      now(),
      '',
      now(),
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name, 'phone', coalesce(v_phone, '')),
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (v_user_id, v_full_name, v_phone, 'client')
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = now();

  INSERT INTO public.company_members (user_id, company_id, role)
  VALUES (v_user_id, p_company_id, 'staff')
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_company_member(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Remove apenas o vínculo com a empresa
CREATE OR REPLACE FUNCTION public.remove_company_member(
  p_company_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  IF NOT public.is_platform_owner() THEN
    RAISE EXCEPTION 'Apenas Super Admin pode remover vínculos.';
  END IF;

  DELETE FROM public.company_members cm
  WHERE cm.company_id = p_company_id
    AND cm.user_id = p_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_company_member(UUID, UUID) TO authenticated;
