# Storage para logos de empresas

Para o upload de imagens no cadastro de empresas, crie o bucket no Supabase:

1. **Supabase Dashboard** → Storage → **New bucket**
2. Nome: `company-logos`
3. Marque **Public bucket** (para exibir logos na landing)
4. **Policies** (opcional, via SQL Editor):

```sql
-- Owners podem fazer upload
CREATE POLICY "Owners can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Leitura pública
CREATE POLICY "Public can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');
```

Se preferir não usar upload, o formulário aceita **URL** da imagem.
