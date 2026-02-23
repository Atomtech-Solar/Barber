# Configuração do Supabase

## 1. Executar as migrações

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Execute **na ordem**:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_get_own_profile_rpc.sql` (obrigatório para carregar perfil)

A migração 002 cria a função `get_own_profile()` que evita problemas de RLS ao carregar o perfil após login.

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
