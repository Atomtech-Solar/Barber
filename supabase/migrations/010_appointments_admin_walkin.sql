-- Suporta agendamentos administrativos com clientes sem conta (client_name, client_phone)
-- created_by = quem criou (admin/staff)

-- 1. Adicionar valor no_show ao enum (PostgreSQL 9.1+)
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'no_show';

-- 2. Adicionar colunas
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Tornar client_id opcional (clientes walk-in)
ALTER TABLE appointments ALTER COLUMN client_id DROP NOT NULL;

-- 4. Constraint: precisa de client_id OU (client_name e client_phone)
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS chk_appointment_client;
ALTER TABLE appointments ADD CONSTRAINT chk_appointment_client
  CHECK (
    (client_id IS NOT NULL) OR
    (client_name IS NOT NULL AND client_phone IS NOT NULL)
  );

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON appointments(created_by);
