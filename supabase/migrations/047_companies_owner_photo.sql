-- Foto do responsável pela empresa (link ou URL de upload)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS owner_photo_url TEXT;
