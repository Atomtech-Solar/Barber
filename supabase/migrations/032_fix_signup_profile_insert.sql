-- Corrige erro 500 no signup: trigger handle_new_user falhando ao inserir em profiles
-- Causa comum: falta de policy INSERT em profiles ou trigger sem search_path

-- 1. Atualizar handle_new_user com search_path e tratamento robusto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  r user_role := 'client';
  v_full_name TEXT;
  v_phone TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'role' IN ('owner', 'company_admin', 'employee', 'client') THEN
    r := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'User');
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');

  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (NEW.id, v_full_name, v_phone, r);

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Perfil já existe (ex: retry), atualizar
    UPDATE public.profiles
    SET full_name = COALESCE(NULLIF(TRIM(v_full_name), ''), full_name),
        phone = COALESCE(v_phone, phone),
        updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Policy INSERT: permite usuário criar seu próprio perfil (signup via trigger)
-- O trigger roda como SECURITY DEFINER; esta policy cobre o caso auth.uid() = novo usuário
DROP POLICY IF EXISTS "Allow insert own profile on signup" ON profiles;
CREATE POLICY "Allow insert own profile on signup" ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());
