# Contas de teste e credenciais

## Como criar as contas

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard) → seu projeto → **Settings** → **API**
2. Copie a chave **service_role** (clique em "Reveal" para ver)
3. Execute no terminal (PowerShell) — **nunca commit a chave no código**:

```powershell
cd "d:\Saas beleza\Barber"
$env:SUPABASE_SERVICE_ROLE_KEY="COLE_SUA_CHAVE_AQUI"
npm run seed:users
```

---

## Credenciais criadas pelo script

### Painel Admin (Owner)
| Campo | Valor |
|-------|-------|
| **Email** | `admin@beautyhub.com` |
| **Senha** | `Admin123!` |
| **Acesso** | Página inicial → **Painel Admin** |

### Dashboard Empresa (Company Admin)
| Campo | Valor |
|-------|-------|
| **Email** | `empresa@beautyhub.com` |
| **Senha** | `Empresa123!` |
| **Acesso** | Página inicial → **Dashboard Empresa** |
| **Empresa** | Barbearia Premium (já vinculada) |

### Landing Page (pública)
| Campo | Valor |
|-------|-------|
| **URL** | `/site/barbearia-premium` |
| **Uso** | Clientes podem se cadastrar e agendar |  
