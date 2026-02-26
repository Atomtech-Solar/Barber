-- CPF opcional para company_clients
ALTER TABLE company_clients ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Telefone e e-mail para professionals
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS email TEXT;
