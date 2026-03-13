-- Imagens da seção "Nossos Trabalhos" (galeria) - 8 posições
ALTER TABLE company_landing_settings
  ADD COLUMN IF NOT EXISTS gallery_image_1_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_image_2_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_image_3_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_image_4_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_image_5_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_image_6_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_image_7_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_image_8_url TEXT;
