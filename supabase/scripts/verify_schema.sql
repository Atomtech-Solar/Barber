-- Script de verificação do schema
-- Execute no SQL Editor do Supabase para checar se há colunas/RPCs faltando

DO $$
DECLARE
  v_msg TEXT := '';
BEGIN
  -- appointments.company_client_id (migration 036)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='appointments' AND column_name='company_client_id') THEN
    v_msg := v_msg || E'\n- FALTA: appointments.company_client_id → aplicar migration 036';
  END IF;

  -- appointments.client_email (migration 029)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='appointments' AND column_name='client_email') THEN
    v_msg := v_msg || E'\n- FALTA: appointments.client_email → aplicar migration 029';
  END IF;

  -- profiles.cpf (migration 033 ou 040)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='cpf') THEN
    v_msg := v_msg || E'\n- FALTA: profiles.cpf → aplicar migration 033 ou 040';
  END IF;

  -- RPC create_company_client (migration 039)
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines 
    WHERE routine_schema='public' AND routine_name='create_company_client') THEN
    v_msg := v_msg || E'\n- FALTA: RPC create_company_client → aplicar migration 039';
  END IF;

  -- RPC ensure_company_client (migration 038)
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines 
    WHERE routine_schema='public' AND routine_name='ensure_company_client') THEN
    v_msg := v_msg || E'\n- FALTA: RPC ensure_company_client → aplicar migration 038';
  END IF;

  -- RPC list_company_clients
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines 
    WHERE routine_schema='public' AND routine_name='list_company_clients') THEN
    v_msg := v_msg || E'\n- FALTA: RPC list_company_clients → aplicar migration 035 ou 040';
  END IF;

  IF v_msg = '' THEN
    RAISE NOTICE 'OK: Schema verificado - sem problemas aparentes.';
  ELSE
    RAISE WARNING 'Problemas encontrados:%', v_msg;
  END IF;
END $$;
