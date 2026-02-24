# Configuração do Supabase

## 1. Executar as migrações

### Opção A: Script automático (recomendado)

1. Supabase Dashboard > **Settings** > **Database** > **Connection string** (URI)
2. Copie a connection string (formato: `postgresql://postgres.[ref]:[SENHA]@...`)
3. Crie `.env.local` com:
   ```
   SUPABASE_DB_URL="postgresql://postgres.xxx:SUA_SENHA@aws-0-xx.pooler.supabase.com:6543/postgres"
   ```
4. Execute: `npm run db:migrate`

### Opção B: Supabase CLI

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

### Opção C: Manual (SQL Editor)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard) > **SQL Editor**
2. Execute **na ordem** cada arquivo em `supabase/migrations/`:
   - 001_initial_schema.sql
   - 002_get_own_profile_rpc.sql
   - 003_companies_extended.sql
   - 004_multi_tenant_architecture.sql
   - 005_fix_companies_insert_rls.sql
   - 006_fix_profiles_rls_recursion.sql

## 2. Criar o primeiro usuário Owner

1. Crie uma conta normalmente em `/auth/signup` na aplicação
2. No Supabase Dashboard, vá em **Table Editor** > **profiles**
3. Localize seu usuário pelo email (na tabela auth.users você encontra o id)
4. Ou execute no SQL Editor:

```sql
-- Substitua 'SEU_EMAIL@exemplo.com' pelo email cadastrado
UPDATE profiles
SET role = 'owner'
WHERE id = (SELECT id FROM auth.users WHERE email = 'SEU_EMAIL@exemplo.com');
```

## 3. Variáveis de ambiente

Certifique-se de que o `.env.local` contém:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
```

## 4. Dados iniciais (opcional)

Para testar, crie uma empresa pelo painel Admin após tornar-se owner.

## 5. Troubleshooting: "Não tenho acesso" mesmo sendo owner

Se você vê "Não foi possível carregar seu perfil" ou é redirecionado para a tela inicial após login como admin:

1. **Verificar o perfil no banco**  
   No Supabase SQL Editor, execute:
   ```sql
   SELECT p.id, p.full_name, p.role, u.email
   FROM profiles p
   JOIN auth.users u ON u.id = p.id
   WHERE u.email = 'admin@beautyhub.com';
   ```
   O `role` deve ser `owner`.

2. **Corrigir o perfil**  
   Execute o script `scripts/fix-admin-profile.sql` no SQL Editor do Supabase.

3. **Recriar o admin com o seed**  
   ```bash
   $env:SUPABASE_SERVICE_ROLE_KEY="sua_service_role_key"
   node scripts/seed-users.mjs
   ```

4. **Checar o console do navegador (F12)**  
   Em desenvolvimento, erros do `getProfile` aparecem no console para diagnóstico.
