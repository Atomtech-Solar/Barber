-- Corrige/verifica o perfil do Admin (Owner)
-- Execute no Supabase: SQL Editor > New query > Cole e rode

-- 1. Verificar se o perfil existe e qual o role atual
SELECT p.id, p.full_name, p.role, u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'admin@beautyhub.com';

-- 2. Atualizar para owner (se necessário)
UPDATE profiles
SET role = 'owner', full_name = COALESCE(full_name, 'Admin BeautyHub')
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@beautyhub.com');

-- 3. Se o perfil não existir, criar (usuário deve já existir em auth.users)
INSERT INTO profiles (id, full_name, phone, role)
SELECT id, 'Admin BeautyHub', '', 'owner'
FROM auth.users
WHERE email = 'admin@beautyhub.com'
ON CONFLICT (id) DO UPDATE SET role = 'owner', full_name = 'Admin BeautyHub';
