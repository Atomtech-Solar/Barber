-- =============================================================================
-- INTEGRIDADE MULTI-TENANT (consistência company_id entre tabelas relacionadas)
-- Segurança: validações no banco complementam RLS; PostgREST usa queries parametrizadas.
-- =============================================================================

-- Pré-checagem: falha cedo se já existir mistura de tenant (corrija dados antes de reaplicar).
DO $$
DECLARE
  c_fin int;
  c_mov int;
  c_apt_svc int;
  c_prof_svc int;
  c_comm int;
BEGIN
  SELECT COUNT(*) INTO c_fin
  FROM public.financial_records fr
  INNER JOIN public.appointments a ON a.id = fr.appointment_id
  WHERE fr.appointment_id IS NOT NULL
    AND fr.company_id IS DISTINCT FROM a.company_id;

  SELECT COUNT(*) INTO c_mov
  FROM public.stock_movements sm
  INNER JOIN public.stock_products p ON p.id = sm.product_id
  WHERE sm.company_id IS DISTINCT FROM p.company_id;

  SELECT COUNT(*) INTO c_apt_svc
  FROM public.appointment_services acs
  INNER JOIN public.appointments a ON a.id = acs.appointment_id
  INNER JOIN public.services s ON s.id = acs.service_id
  WHERE a.company_id IS DISTINCT FROM s.company_id;

  SELECT COUNT(*) INTO c_prof_svc
  FROM public.professional_services ps
  INNER JOIN public.professionals p ON p.id = ps.professional_id
  INNER JOIN public.services s ON s.id = ps.service_id
  WHERE p.company_id IS DISTINCT FROM s.company_id;

  SELECT COUNT(*) INTO c_comm
  FROM public.professional_service_commissions psc
  INNER JOIN public.professionals p ON p.id = psc.professional_id
  INNER JOIN public.services s ON s.id = psc.service_id
  WHERE psc.company_id IS DISTINCT FROM p.company_id
     OR psc.company_id IS DISTINCT FROM s.company_id
     OR p.company_id IS DISTINCT FROM s.company_id;

  IF c_fin + c_mov + c_apt_svc + c_prof_svc + c_comm > 0 THEN
    RAISE EXCEPTION
      '056: dados inconsistentes — financial_records=%, stock_movements=%, appointment_services=%, professional_services=%, professional_service_commissions=%. Corrija antes de aplicar esta migration.',
      c_fin, c_mov, c_apt_svc, c_prof_svc, c_comm;
  END IF;
END $$;

-- Normaliza amounts negativos legados antes do CHECK (mantém magnitude; revise manualmente se necessário).
UPDATE public.financial_records SET amount = abs(amount) WHERE amount < 0;

-- -----------------------------------------------------------------------------
-- 1) financial_records: appointment_id, quando preenchido, deve ser da mesma empresa
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_financial_records_appointment_same_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
BEGIN
  IF NEW.appointment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.company_id INTO v_company
  FROM public.appointments a
  WHERE a.id = NEW.appointment_id;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'financial_records: agendamento inexistente.'
      USING ERRCODE = '23503';
  END IF;

  IF v_company IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'financial_records: agendamento pertence a outra empresa.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_financial_records_appointment_same_company ON public.financial_records;
CREATE TRIGGER trg_financial_records_appointment_same_company
  BEFORE INSERT OR UPDATE OF company_id, appointment_id
  ON public.financial_records
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_financial_records_appointment_same_company();

COMMENT ON FUNCTION public.trg_financial_records_appointment_same_company() IS
  'Garante company_id alinhado ao agendamento vinculado (anti mistura de tenant).';

-- -----------------------------------------------------------------------------
-- 2) stock_movements: produto deve pertencer à mesma empresa da movimentação
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_stock_movements_product_same_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
BEGIN
  SELECT p.company_id INTO v_company
  FROM public.stock_products p
  WHERE p.id = NEW.product_id;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'stock_movements: produto inexistente.'
      USING ERRCODE = '23503';
  END IF;

  IF v_company IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'stock_movements: produto pertence a outra empresa.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_movements_product_same_company ON public.stock_movements;
CREATE TRIGGER trg_stock_movements_product_same_company
  BEFORE INSERT OR UPDATE OF company_id, product_id
  ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_stock_movements_product_same_company();

-- -----------------------------------------------------------------------------
-- 3) appointment_services: serviço deve ser da mesma empresa do agendamento
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_appointment_services_same_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt_company UUID;
  v_svc_company UUID;
BEGIN
  SELECT a.company_id INTO v_apt_company
  FROM public.appointments a
  WHERE a.id = NEW.appointment_id;

  SELECT s.company_id INTO v_svc_company
  FROM public.services s
  WHERE s.id = NEW.service_id;

  IF v_apt_company IS NULL OR v_svc_company IS NULL THEN
    RAISE EXCEPTION 'appointment_services: agendamento ou serviço inexistente.'
      USING ERRCODE = '23503';
  END IF;

  IF v_apt_company IS DISTINCT FROM v_svc_company THEN
    RAISE EXCEPTION 'appointment_services: serviço não pertence à empresa do agendamento.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_services_same_company ON public.appointment_services;
CREATE TRIGGER trg_appointment_services_same_company
  BEFORE INSERT OR UPDATE OF appointment_id, service_id
  ON public.appointment_services
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_appointment_services_same_company();

-- -----------------------------------------------------------------------------
-- 4) professional_services: profissional e serviço na mesma empresa
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_professional_services_same_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof_company UUID;
  v_svc_company UUID;
BEGIN
  SELECT p.company_id INTO v_prof_company
  FROM public.professionals p
  WHERE p.id = NEW.professional_id;

  SELECT s.company_id INTO v_svc_company
  FROM public.services s
  WHERE s.id = NEW.service_id;

  IF v_prof_company IS NULL OR v_svc_company IS NULL THEN
    RAISE EXCEPTION 'professional_services: profissional ou serviço inexistente.'
      USING ERRCODE = '23503';
  END IF;

  IF v_prof_company IS DISTINCT FROM v_svc_company THEN
    RAISE EXCEPTION 'professional_services: profissional e serviço em empresas diferentes.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_professional_services_same_company ON public.professional_services;
CREATE TRIGGER trg_professional_services_same_company
  BEFORE INSERT OR UPDATE OF professional_id, service_id
  ON public.professional_services
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_professional_services_same_company();

-- -----------------------------------------------------------------------------
-- 5) professional_service_commissions: alinhamento empresa / profissional / serviço
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_professional_service_commissions_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof_company UUID;
  v_svc_company UUID;
BEGIN
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'professional_service_commissions: company_id obrigatório.'
      USING ERRCODE = '23514';
  END IF;

  SELECT p.company_id INTO v_prof_company
  FROM public.professionals p
  WHERE p.id = NEW.professional_id;

  SELECT s.company_id INTO v_svc_company
  FROM public.services s
  WHERE s.id = NEW.service_id;

  IF v_prof_company IS NULL OR v_svc_company IS NULL THEN
    RAISE EXCEPTION 'professional_service_commissions: profissional ou serviço inexistente.'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.company_id IS DISTINCT FROM v_prof_company
     OR NEW.company_id IS DISTINCT FROM v_svc_company THEN
    RAISE EXCEPTION 'professional_service_commissions: company_id inconsistente com profissional/serviço.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_professional_service_commissions_integrity ON public.professional_service_commissions;
CREATE TRIGGER trg_professional_service_commissions_integrity
  BEFORE INSERT OR UPDATE OF company_id, professional_id, service_id
  ON public.professional_service_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_professional_service_commissions_integrity();

-- -----------------------------------------------------------------------------
-- 6) notifications.comment_id → FK (comentário existente na 051)
-- -----------------------------------------------------------------------------
UPDATE public.notifications n
SET comment_id = NULL
WHERE n.comment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.recado_comments c WHERE c.id = n.comment_id
  );

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS fk_notifications_recado_comment;

ALTER TABLE public.notifications
  ADD CONSTRAINT fk_notifications_recado_comment
  FOREIGN KEY (comment_id)
  REFERENCES public.recado_comments(id)
  ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 7) financial_records: valores monetários não negativos (modelo atual usa type p/ receita/despesa)
-- -----------------------------------------------------------------------------
ALTER TABLE public.financial_records
  DROP CONSTRAINT IF EXISTS chk_financial_records_amount_non_negative;

ALTER TABLE public.financial_records
  ADD CONSTRAINT chk_financial_records_amount_non_negative
  CHECK (amount >= 0);

COMMENT ON CONSTRAINT chk_financial_records_amount_non_negative ON public.financial_records IS
  'amount sempre >= 0; tipo income/expense define o sentido contábil na aplicação.';
