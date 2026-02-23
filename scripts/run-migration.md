# Rodar a migração no Supabase

## Opção 1: Supabase Dashboard (recomendado)

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione o projeto **Barber** (ou o que contém `nrvqmjjbhdnayadotjeg` na URL)
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New query**
5. Copie todo o conteúdo do arquivo `supabase/migrations/001_initial_schema.sql`
6. Cole no editor
7. Clique em **Run** (ou Ctrl+Enter)

## Opção 2: Supabase CLI

```bash
# 1. Instalar o CLI (se ainda não tiver)
npm install -g supabase

# 2. Fazer login
npx supabase login

# 3. Vincular ao projeto
npx supabase link --project-ref nrvqmjjbhdnayadotjeg

# 4. Aplicar a migração
npx supabase db push
```

## Verificar

Após rodar a migração, verifique no **Table Editor** se as tabelas foram criadas:

- companies
- profiles
- services
- professionals
- professional_services
- working_hours
- appointments
- appointment_services
