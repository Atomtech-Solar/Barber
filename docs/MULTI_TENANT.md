# Arquitetura Multi-Tenant

## Conceito

- Cada **empresa (company)** = tenant isolado
- Usuário pode possuir ou pertencer a múltiplas empresas
- Segurança garantida por **RLS** no banco

## Estrutura

### companies
- `owner_id` → plataforma owner que criou (ou dono da empresa)
- Campos: name, slug, logo_url, cnpj, email, owner_name, owner_phone, slogan

### company_members
- Vincula usuários a empresas com papel: `owner`, `admin`, `staff`
- Ao criar empresa: trigger insere `(owner_id, company_id, 'owner')`
- Profile com `company_id` + role `company_admin`/`employee` → sincronizado via trigger

## RLS

- **companies**: SELECT/UPDATE/DELETE onde `owner_id = auth.uid()` OU em `company_members` OU platform owner
- **INSERT**: `owner_id = auth.uid()` + profile.role = 'owner' (platform owner)
- **Tabelas empresariais** (services, professionals, appointments, etc.): acesso via `company_members` ou `owner_id`

## Frontend

- `companyService.list()` → RLS retorna apenas empresas acessíveis
- `TenantContext` → `currentCompany`, `setCurrentCompany`
- Nunca confiar em filtros do frontend; RLS é a autoridade

## Migrações

1. `001_initial_schema.sql` — schema base
2. `002_get_own_profile_rpc.sql` — perfil
3. `003_companies_extended.sql` — owner_id, cnpj, owner_name, owner_phone, logo_url
4. `004_multi_tenant_architecture.sql` — company_members, RLS padronizado
5. `005_fix_companies_insert_rls.sql` — corrige RLS no INSERT de companies (remove dependência de profiles)
6. `006_fix_profiles_rls_recursion.sql` — corrige recursão infinita em policies (funções SECURITY DEFINER)
