-- =============================================================================
-- Intervalos reais (starts_at / ends_at), exclusão de sobreposição por
-- profissional, execution_mode em services, sincronização com colunas legadas.
-- TZ fixo America/Sao_Paulo até existir companies.timezone.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- -----------------------------------------------------------------------------
-- 1) Novas colunas em appointments
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- 2) Backfill: (date + time) interpretado no fuso informado
-- -----------------------------------------------------------------------------
UPDATE public.appointments
SET
  starts_at = ((date + start_time)::timestamp AT TIME ZONE 'America/Sao_Paulo'),
  ends_at = (
    (date + start_time + (duration_minutes || ' minutes')::interval)::timestamp
    AT TIME ZONE 'America/Sao_Paulo'
  )
WHERE starts_at IS NULL OR ends_at IS NULL;

-- -----------------------------------------------------------------------------
-- 3) Intervalo válido + NOT NULL (após backfill)
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS chk_appointments_valid_interval;

ALTER TABLE public.appointments
  ADD CONSTRAINT chk_appointments_valid_interval CHECK (ends_at > starts_at);

ALTER TABLE public.appointments
  ALTER COLUMN starts_at SET NOT NULL,
  ALTER COLUMN ends_at SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 4) Range gerado para EXCLUDE GiST
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointments
  DROP COLUMN IF EXISTS time_range;

ALTER TABLE public.appointments
  ADD COLUMN time_range TSTZRANGE
  GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED;

-- -----------------------------------------------------------------------------
-- 5) Diagnóstico: pares sobrepostos (a1.id < a2.id → sem contagem em dobro)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  conflict_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO conflict_count
  FROM public.appointments a1
  JOIN public.appointments a2
    ON a1.id < a2.id
   AND a1.professional_id = a2.professional_id
   AND a1.status IN ('pending', 'confirmed', 'blocked')
   AND a2.status IN ('pending', 'confirmed', 'blocked')
   AND tstzrange(a1.starts_at, a1.ends_at, '[)') && tstzrange(a2.starts_at, a2.ends_at, '[)');

  IF conflict_count > 0 THEN
    RAISE EXCEPTION
      'Existem % par(es) de agendamentos sobrepostos (mesmo profissional, status ativo). Corrija antes de aplicar o EXCLUDE.',
      conflict_count;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6) Remove índice único legado (mesmo start_time — não cobre overlap real)
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_appointments_prof_slot_unique;

-- -----------------------------------------------------------------------------
-- 7) Exclusão: não sobrepor intervalos no mesmo profissional (status ativos)
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS no_overlap_per_professional;

ALTER TABLE public.appointments
  ADD CONSTRAINT no_overlap_per_professional
  EXCLUDE USING gist (
    professional_id WITH =,
    time_range WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'blocked'));

-- -----------------------------------------------------------------------------
-- 8) execution_mode em services
-- -----------------------------------------------------------------------------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS execution_mode TEXT NOT NULL DEFAULT 'sequential';

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS chk_execution_mode;

ALTER TABLE public.services
  ADD CONSTRAINT chk_execution_mode CHECK (execution_mode IN ('sequential', 'parallel'));

COMMENT ON COLUMN public.services.execution_mode IS
  'sequential: soma na duração do pacote; parallel: usa o maior entre os paralelos (regra de negócio na aplicação/RPC).';

-- -----------------------------------------------------------------------------
-- 9) Trigger: legado (date, start_time, duration_minutes) ↔ canônico (tstz)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_appointment_times()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  tz TEXT := 'America/Sao_Paulo';
  v_legacy_changed BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_legacy_changed :=
      NEW.date IS DISTINCT FROM OLD.date
      OR NEW.start_time IS DISTINCT FROM OLD.start_time
      OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes;
  ELSE
    v_legacy_changed := FALSE;
  END IF;

  -- INSERT só legado, ou UPDATE em que o legado mudou → recalcular a partir do legado
  IF TG_OP = 'INSERT' THEN
    IF NEW.starts_at IS NULL OR NEW.ends_at IS NULL THEN
      IF NEW.date IS NULL OR NEW.start_time IS NULL OR NEW.duration_minutes IS NULL THEN
        RAISE EXCEPTION 'appointments: em INSERT informe (date, start_time, duration_minutes) ou (starts_at, ends_at)';
      END IF;
      NEW.starts_at := ((NEW.date + NEW.start_time)::timestamp AT TIME ZONE tz);
      NEW.ends_at := NEW.starts_at + (NEW.duration_minutes || ' minutes')::interval;
    END IF;
  ELSIF v_legacy_changed THEN
    NEW.starts_at := ((NEW.date + NEW.start_time)::timestamp AT TIME ZONE tz);
    NEW.ends_at := NEW.starts_at + (COALESCE(NEW.duration_minutes, 0) || ' minutes')::interval;
  END IF;

  -- Fluxo novo: só tstz mudou (sem mudança no legado) → espelhar colunas legíveis
  IF TG_OP = 'UPDATE' AND NOT v_legacy_changed THEN
    IF NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at THEN
      IF NEW.starts_at IS NULL OR NEW.ends_at IS NULL THEN
        RAISE EXCEPTION 'appointments: starts_at e ends_at devem vir juntos';
      END IF;
      NEW.date := (NEW.starts_at AT TIME ZONE tz)::date;
      NEW.start_time := (NEW.starts_at AT TIME ZONE tz)::time;
      NEW.duration_minutes := GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (NEW.ends_at - NEW.starts_at)) / 60.0)::INT
      );
    END IF;
  END IF;

  -- Sempre derivar legado a partir do canônico após qualquer cálculo acima (consistência)
  IF NEW.starts_at IS NOT NULL AND NEW.ends_at IS NOT NULL THEN
    NEW.date := (NEW.starts_at AT TIME ZONE tz)::date;
    NEW.start_time := (NEW.starts_at AT TIME ZONE tz)::time;
    NEW.duration_minutes := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (NEW.ends_at - NEW.starts_at)) / 60.0)::INT
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_appointment_times() IS
  'Mantém starts_at/ends_at alinhados a date+start_time+duration (legado) ou o inverso quando só tstz muda.';

DROP TRIGGER IF EXISTS trg_sync_appointment_times ON public.appointments;

CREATE TRIGGER trg_sync_appointment_times
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_appointment_times();

-- -----------------------------------------------------------------------------
-- 10) Índices para consultas por empresa / profissional + tempo
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointments_company_starts_at
  ON public.appointments (company_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_professional_starts_at
  ON public.appointments (professional_id, starts_at);
