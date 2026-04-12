# Backups e restauração (Supabase / Postgres)

Backups automáticos contínuos e restauração pontual **não são configuráveis via SQL no repositório**: dependem do **plano e do painel** do projeto Supabase.

## Supabase (recomendado)

1. **Backups automáticos**  
   No projeto: **Project Settings → Database**. Em planos com backup incluído, o Supabase mantém cópias automáticas do cluster (política e retenção conforme o plano).

2. **Point-in-Time Recovery (PITR)**  
   Disponível em planos que oferecem PITR: permite restaurar o banco para um instante no passado. Configure e monitore no mesmo painel de Database.

3. **Restauração**  
   Use o fluxo oficial do painel (**Database → Backups** ou suporte do plano) para restaurar ou clonar o ambiente. Teste o procedimento em um **projeto de staging** antes de produção.

4. **Acesso ao banco**  
   Evite expor a **connection string** do role `postgres` ou `service_role` em repositórios ou CI públicos. Use variáveis secretas e princípio do menor privilégio.

## Cópia manual (opcional, fora do app)

Para um dump lógico ocasional (manutenção, auditoria), use `pg_dump` com URL segura (não commitada), por exemplo:

```bash
pg_dump "$DATABASE_URL" --no-owner --format=custom -f backup.dump
```

Restauração típica (em ambiente controlado):

```bash
pg_restore --clean --if-exists -d "$DATABASE_URL" backup.dump
```

**Nota:** URLs com `service_role` ignoram RLS; use apenas em processos administrativos confiáveis.

## Queries parametrizadas

O cliente **Supabase JS** envia parâmetros separados da consulta (estilo PostgREST), o que mitiga **SQL injection** no caminho API → Postgres. Funções `SECURITY DEFINER` devem validar `company_id` / `auth.uid()` internamente e nunca concatenar entrada do usuário em SQL dinâmico sem `format()`/`quote_literal()`.
