-- Define company_id no perfil ao criar conta (signup ou adicionar à equipe)
-- Garante que o usuário apareça corretamente na dashboard da empresa

-- 1. handle_new_user: ler company_id do metadata e setar no profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  r user_role := 'client';
  v_full_name TEXT;
  v_phone TEXT;
  v_company_id UUID;
BEGIN
  IF NEW.raw_user_meta_data->>'role' IN ('owner', 'company_admin', 'employee', 'client') THEN
    r := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'User');
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');

  -- company_id pode vir direto no metadata (UUID string) ou ser resolvido via company_slug
  v_company_id := NULL;
  IF NEW.raw_user_meta_data->>'company_id' IS NOT NULL AND NEW.raw_user_meta_data->>'company_id' <> '' THEN
    BEGIN
      v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_company_id := NULL;
    END;
  ELSIF NEW.raw_user_meta_data->>'company_slug' IS NOT NULL AND NEW.raw_user_meta_data->>'company_slug' <> '' THEN
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE slug = TRIM(NEW.raw_user_meta_data->>'company_slug')
      AND status = 'active'
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, role, company_id)
  VALUES (NEW.id, v_full_name, v_phone, r, v_company_id);

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Perfil já existe (ex: retry), atualizar inclusive company_id se veio no metadata
    UPDATE public.profiles
    SET full_name = COALESCE(NULLIF(TRIM(v_full_name), ''), full_name),
        phone = COALESCE(v_phone, phone),
        company_id = COALESCE(v_company_id, company_id),
        updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. upsert_company_member: setar company_id no profile ao criar/atualizar membro
-- (A migration 018 não seta company_id; este update corrige)
CREATE OR REPLACE FUNCTION public.upsert_company_member(
  p_company_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL,
  p_allowed_pages TEXT[] DEFAULT NULL
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
  v_password TEXT;
  v_user_id UUID;
  v_allowed_pages TEXT[];
  v_supported_pages CONSTANT TEXT[] := ARRAY[
    'dashboard',
    'agenda',
    'clients',
    'services',
    'professionals',
    'financial',
    'stock',
    'reports',
    'settings'
  ];
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
  v_password := NULLIF(trim(coalesce(p_password, '')), '');

  IF v_email = '' THEN
    RAISE EXCEPTION 'Email é obrigatório.';
  END IF;

  IF v_full_name IS NULL THEN
    RAISE EXCEPTION 'Nome completo é obrigatório.';
  END IF;

  IF v_password IS NULL OR length(v_password) < 6 THEN
    RAISE EXCEPTION 'Senha deve ter ao menos 6 caracteres.';
  END IF;

  IF p_allowed_pages IS NULL THEN
    v_allowed_pages := NULL;
  ELSE
    SELECT ARRAY(
      SELECT DISTINCT lower(trim(page))
      FROM unnest(p_allowed_pages) AS page
      WHERE trim(page) <> ''
    )
    INTO v_allowed_pages;

    IF EXISTS (
      SELECT 1
      FROM unnest(v_allowed_pages) AS page
      WHERE page <> ALL(v_supported_pages)
    ) THEN
      RAISE EXCEPTION 'Permissão de página inválida.';
    END IF;
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
      crypt(v_password, gen_salt('bf')),
      now(),
      now(),
      '',
      now(),
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name, 'phone', coalesce(v_phone, ''), 'company_id', p_company_id::text),
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
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Inserir/atualizar profile COM company_id
  INSERT INTO public.profiles (id, full_name, phone, role, company_id)
  VALUES (v_user_id, v_full_name, v_phone, 'employee', p_company_id)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    company_id = p_company_id,
    updated_at = now();

  INSERT INTO public.company_members (user_id, company_id, role, allowed_pages)
  VALUES (v_user_id, p_company_id, 'staff', v_allowed_pages)
  ON CONFLICT (user_id, company_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    allowed_pages = EXCLUDED.allowed_pages;

  RETURN v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.upsert_company_member(UUID, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;
