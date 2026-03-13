-- Campos extendidos da seção Sobre na landing
-- about_title_accent: 'first_word' | 'last_word' | 'all' | 'none'
ALTER TABLE company_landing_settings
  ADD COLUMN IF NOT EXISTS about_title TEXT,
  ADD COLUMN IF NOT EXISTS about_title_accent TEXT,
  ADD COLUMN IF NOT EXISTS about_image_1_url TEXT,
  ADD COLUMN IF NOT EXISTS about_image_2_url TEXT,
  ADD COLUMN IF NOT EXISTS about_image_3_url TEXT,
  ADD COLUMN IF NOT EXISTS about_image_4_url TEXT;
