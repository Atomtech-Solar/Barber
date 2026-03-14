# Email de Confirmação Personalizado por Empresa

O sistema envia `company_name` e `company_slug` no metadata do signup. O template de email usa esses dados para personalizar a mensagem.

## Configuração no Supabase (projeto hospedado)

1. Acesse o **Dashboard** do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Authentication** → **Email Templates**
4. Selecione **Confirm signup**
5. Cole o conteúdo abaixo no campo **Message (HTML)**

### Assunto (Subject)
```
Confirmar seu cadastro
```

### Corpo (Message)

Copie o conteúdo completo do arquivo `supabase/templates/confirmation.html` no campo **Message (HTML)**. O template inclui:
- Paleta teal (#0d9488) profissional
- Card central com sombra sutil
- Header destacado
- Botão de confirmação estilizado
- Link alternativo em box separado

6. Clique em **Save**

## Como funciona

- **Com empresa**: Quando o cliente se cadastra pela landing ou área de agendamento de uma empresa, o email mostra o nome da empresa (ex: "Bem-vindo à Barbearia do João!").
- **Sem empresa**: Se o cadastro for feito sem contexto de empresa, usa a mensagem genérica "Confirmar cadastro".
- **Variáveis disponíveis** no template:
  - `{{ .Data.company_name }}` – Nome da empresa
  - `{{ .Data.full_name }}` – Nome do usuário
  - `{{ .ConfirmationURL }}` – Link de confirmação
  - `{{ .Email }}` – Email do usuário

## Validade do link de confirmação (sem tempo limite prático)

O link de confirmação está configurado para expirar em **30 dias** (em vez do padrão de 1 hora).

### Desenvolvimento local

Já configurado em `supabase/config.toml`:
```toml
[auth.email]
otp_expiry = 2592000  # 30 dias em segundos
```

### Projeto hospedado (Dashboard)

1. Acesse **Authentication** → **Sign In** → **Email**
2. Localize **Email OTP Expiration** (ou **Magic Link Expiration**)
3. Ajuste para o valor desejado (em segundos):
   - 86400 = 1 dia
   - 604800 = 7 dias
   - 2592000 = 30 dias

Se a opção não aparecer, a configuração pode estar em **Project Settings** → **Authentication**.

### Opção: desabilitar confirmação de email

Para que o usuário acesse imediatamente após o cadastro (sem confirmar email):

1. Dashboard → **Authentication** → **Providers** → **Email**
2. Desative **Confirm email**

⚠️ Isso reduz a verificação de que o email é válido.

---

## Desenvolvimento local

No ambiente local, o template está em `supabase/templates/confirmation.html` e é carregado via `config.toml`. Reinicie o Supabase após alterar:

```bash
supabase stop && supabase start
```
