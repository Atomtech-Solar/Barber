-- Tabela de configurações da landing page por empresa
CREATE TABLE IF NOT EXISTS company_landing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  about_text TEXT,
  about_image_url TEXT,
  cta_text TEXT,
  cta_button_text TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_landing_settings_company ON company_landing_settings(company_id);

-- RLS
ALTER TABLE company_landing_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública (para a landing acessível sem auth)
CREATE POLICY "Public read company_landing_settings"
  ON company_landing_settings
  FOR SELECT
  USING (true);

-- Edição apenas por owner ou membros da empresa
CREATE POLICY "Company staff manage company_landing_settings"
  ON company_landing_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = company_landing_settings.company_id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM company_members cm
          WHERE cm.company_id = c.id AND cm.user_id = auth.uid()
        )
        OR public.is_platform_owner()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = company_landing_settings.company_id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM company_members cm
          WHERE cm.company_id = c.id AND cm.user_id = auth.uid()
        )
        OR public.is_platform_owner()
      )
    )
  );

-- Bucket company-assets para imagens da landing (máx 5MB, imagens)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Política: leitura pública
DROP POLICY IF EXISTS "Public read company-assets" ON storage.objects;
CREATE POLICY "Public read company-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

-- Política: upload por autenticados (app valida company_id no path)
DROP POLICY IF EXISTS "Authenticated upload company-assets" ON storage.objects;
CREATE POLICY "Authenticated upload company-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Authenticated update company-assets" ON storage.objects;
CREATE POLICY "Authenticated update company-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Authenticated delete company-assets" ON storage.objects;
CREATE POLICY "Authenticated delete company-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets');
