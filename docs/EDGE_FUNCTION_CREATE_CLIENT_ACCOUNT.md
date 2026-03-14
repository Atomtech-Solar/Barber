# Edge Function: create-client-account

Permite criação de contas de cliente **sem as limitações do Supabase Auth client SDK**, utilizando **Service Role** no backend. A chave sensível nunca é exposta no frontend.

## Arquitetura

```
Frontend (React)                    Edge Function                     Banco
      |                                    |                            |
      |  POST /functions/v1/create-client-account
      |  { name, email, password, phone, company_slug }
      |----------------------------------->|
      |                                    |  SUPABASE_SERVICE_ROLE_KEY
      |                                    |  - auth.admin.createUser()
      |                                    |  - insert profiles
      |                                    |  - insert company_clients
      |                                    |--------------------------->|
      |                                    |<---------------------------|
      |  { success, user_id }              |
      |<-----------------------------------|
      |  signInWithPassword (login auto)   |
```

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/create-client-account/index.ts` | Código da Edge Function |
| `src/services/clientAccount.service.ts` | Serviço frontend que chama a função |
| `supabase/config.toml` | Configuração `verify_jwt = false` para a função |

## Como chamar no frontend

```ts
import { createClientAccount } from "@/services/clientAccount.service";

const result = await createClientAccount({
  name: "João Silva",
  email: "joao@email.com",
  password: "senha123",
  phone: "(11) 99999-0000",
  company_slug: "barbearia-premium",
});

if (result.success) {
  // Login automático com signInWithPassword
  const { data } = await supabase.auth.signInWithPassword({
    email: "joao@email.com",
    password: "senha123",
  });
  // usuário autenticado e vinculado à empresa
} else {
  console.error(result.error);
}
```

## Variáveis de ambiente

### Frontend (`.env` ou `.env.local`)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Sim | URL do projeto (ex: `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Sim | Chave pública anon – usada no header `Authorization` ao chamar a Edge Function |

### Edge Function (automático no Supabase)

As variáveis abaixo **já existem automaticamente** no ambiente da Edge Function quando deployada no Supabase:

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço – **nunca expor no frontend** |

Não é necessário configurar nada manualmente para a função em produção.

### Desenvolvimento local

Para testar a função localmente:

```bash
# Subir as funções
supabase functions serve create-client-account --no-verify-jwt

# Ou todas as funções
supabase functions serve --no-verify-jwt
```

A URL local será algo como `http://localhost:54321/functions/v1/create-client-account`.

## Fluxo completo

1. Usuário acessa `/site/:slug` → landing da empresa
2. Vai para `/client/booking?company=:slug`
3. Preenche dados e marca "Quero criar conta"
4. Frontend chama `createClientAccount()` → Edge Function
5. Edge Function:
   - Busca empresa pelo `company_slug`
   - Cria usuário em `auth.users` via Admin API
   - Cria perfil em `profiles` com `company_id`
   - Insere em `company_clients`
6. Frontend faz `signInWithPassword` para login automático
7. Prossegue com o agendamento

## Deploy

```bash
# Deploy da função
supabase functions deploy create-client-account

# Com projeto linkado
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy create-client-account
```

## Segurança

- **Service Role** usada apenas na Edge Function (backend)
- Frontend usa apenas `VITE_SUPABASE_ANON_KEY`
- `verify_jwt = false` permite chamada sem usuário autenticado (cadastro de novos usuários)
- Validação de email, senha e `company_slug` na função
