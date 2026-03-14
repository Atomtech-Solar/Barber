# Análise de Conflitos - Projeto Barber

## Resumo

Identificados conflitos e dependências que podem causar erros 400 ou falhas em runtime.

---

## 1. Colunas que podem não existir (migrations não aplicadas)

| Coluna | Tabela | Migration | Onde é usada | Erro se faltar |
|--------|--------|-----------|--------------|----------------|
| `company_client_id` | appointments | 036 | client.service (removido), AppAgenda | 400 Bad Request |
| `client_email` | appointments | 029 | link_appointments_to_user, booking | Falha ao vincular agendamentos |
| `cpf` | profiles | 033 ou 040 | list_company_clients | 400 Bad Request |

---

## 2. Dependências entre migrations

```
001 (schema base)
  ↓
010 (appointments: client_name, client_phone)
  ↓
029 (appointments: client_email)  ← link_appointments_to_user precisa
  ↓
033 (profiles: cpf) ou 040 (profiles: cpf + list_company_clients)  ← list_company_clients precisa
  ↓
036 (appointments: company_client_id)  ← create_public_appointment, get_or_create_company_client
  ↓
038, 039 (RPCs company_clients)
```

**Problema:** Se 033 ou 036 não foram aplicadas, funções e frontend quebram.

---

## 3. Funções sobrescritas (ordem importa)

| Função | Migrations (ordem) | Observação |
|--------|-------------------|------------|
| `handle_new_user` | 001 → 032 → 034 | 034 é a mais completa (company_id) |
| `get_own_profile` | 002 → 033 | 033 adiciona cpf |
| `list_company_clients` | 035 → 040 | 040 corrige pr.cpf |
| `create_public_appointment` | 029 → 036 | 036 adiciona company_client_id, conflito |
| `upsert_company_member` | 016 → 017 → 018 → 034 | 018 adiciona allowed_pages |
| `is_platform_owner` | 006 → 007 → 008 | 008 usa platform_owners |

---

## 4. Possíveis conflitos atuais

### 4.1 client.service.ts
- **Antes:** selecionava `company_client_id` → 400 se migration 036 não aplicada
- **Agora:** removido do select → OK
- **AppAgenda:** usa `apt.company_client_id` para clientes recorrentes. Os dados vêm de `bookingService.listByCompany` que usa `select("*")`. Se a coluna não existir, o select("*") pode falhar em alguns clientes Supabase ou retornar null. Verificar.

### 4.2 list_company_clients (035/040)
- Usa `pr.cpf` de profiles
- Migration 033 ou 040 precisa ter sido aplicada para profiles ter cpf

### 4.3 link_appointments_to_user (037)
- Usa `client_email` em appointments
- Migration 029 precisa estar aplicada

### 4.4 createAdmin em booking.service
- Insere `company_client_id` e `client_email`
- Migrations 029 e 036 necessárias

---

## 5. RPCs que o frontend espera

| RPC | Migration | Chamador |
|-----|-----------|----------|
| list_company_clients | 035, 040 | client.service |
| create_company_client | 039 | client.service |
| update_company_client | 039 | client.service |
| delete_company_client | 039 | client.service |
| ensure_company_client | 038 | Edge Function |
| link_appointments_to_user | 037 | Edge Function |
| get_or_create_company_client | 036 | create_public_appointment |

---

## 6. Recomendações

### Verificar migrations aplicadas

Execute no SQL Editor do Supabase:

```sql
-- Colunas em appointments
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'appointments'
ORDER BY ordinal_position;

-- Colunas em profiles
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- RPCs existentes
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

### Ordem mínima de migrations

Para o sistema funcionar completamente, todas as migrations 001–040 devem ser aplicadas **na ordem numérica**.

### Script de verificação rápida

```sql
-- Retorna problemas encontrados
SELECT 
  CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='company_client_id') 
    THEN 'FALTA: appointments.company_client_id (migration 036)' ELSE 'OK' END AS check_company_client_id,
  CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='client_email') 
    THEN 'FALTA: appointments.client_email (migration 029)' ELSE 'OK' END AS check_client_email,
  CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='cpf') 
    THEN 'FALTA: profiles.cpf (migration 033/040)' ELSE 'OK' END AS check_profiles_cpf,
  CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='create_company_client') 
    THEN 'FALTA: RPC create_company_client (migration 039)' ELSE 'OK' END AS check_create_company_client,
  CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='ensure_company_client') 
    THEN 'FALTA: RPC ensure_company_client (migration 038)' ELSE 'OK' END AS check_ensure_company_client;
```

---

## 7. bookingService.listByCompany com select("*")

O `booking.service.ts` usa `select("*")` para appointments. Se a tabela tiver colunas adicionadas por migrations que não foram aplicadas, o PostgREST retorna todas as colunas que existem - não dá 400. O 400 ocorre quando você pede explicitamente uma coluna que não existe (ex: `select("company_client_id")`).

Portanto:
- `select("*")` → seguro, retorna só o que existe
- `select("client_phone, client_id, company_client_id, date, status")` → 400 se company_client_id não existir

A correção feita no client.service (remover company_client_id do select) deve resolver o 400.
