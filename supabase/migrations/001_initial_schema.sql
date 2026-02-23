-- Multi-tenant SaaS Schema for Barbearias/Manicures
-- Run this in Supabase SQL Editor or via supabase db push

-- Enum for user roles
CREATE TYPE user_role AS ENUM ('owner', 'company_admin', 'employee', 'client');

-- Enum for appointment status
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'blocked');

-- Companies (tenants)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  slogan TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_slug ON companies(slug);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'client',
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Services per company
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_services_company ON services(company_id);

-- Professionals (employees)
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  specialty TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_professionals_company ON professionals(company_id);

-- Professional <-> Services (N:N)
CREATE TABLE professional_services (
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, service_id)
);

-- Working hours (day 0=Sun, 1=Mon, ..., 6=Sat)
CREATE TABLE working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE(professional_id, day_of_week)
);

CREATE INDEX idx_working_hours_professional ON working_hours(professional_id);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  status appointment_status NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_appointments_company ON appointments(company_id);
CREATE INDEX idx_appointments_professional_date ON appointments(professional_id, date);
CREATE INDEX idx_appointments_client ON appointments(client_id);

-- Appointment <-> Services (N:N)
CREATE TABLE appointment_services (
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (appointment_id, service_id)
);

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  r user_role := 'client';
BEGIN
  IF NEW.raw_user_meta_data->>'role' IN ('owner', 'company_admin', 'employee', 'client') THEN
    r := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    r
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;

-- Companies: owner manages all, public reads active (for landing)
CREATE POLICY "Owner manages all companies" ON companies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Public reads active companies" ON companies
  FOR SELECT USING (status = 'active');

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Owner can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
  );

CREATE POLICY "Company admins see company profiles" ON profiles
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Services: company staff manage, public reads active companies
CREATE POLICY "Company staff manage services" ON services
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Public reads services of active companies" ON services
  FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE status = 'active')
  );

-- Professionals: company staff manage, public reads active companies
CREATE POLICY "Company staff manage professionals" ON professionals
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Public reads professionals of active companies" ON professionals
  FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE status = 'active')
  );

-- professional_services: staff manage, public read for landing
CREATE POLICY "Company staff manage professional_services" ON professional_services
  FOR ALL USING (
    professional_id IN (
      SELECT p.id FROM professionals p
      JOIN profiles pr ON pr.company_id = p.company_id AND pr.id = auth.uid()
    )
  );

CREATE POLICY "Public reads professional_services" ON professional_services
  FOR SELECT USING (
    professional_id IN (
      SELECT p.id FROM professionals p
      JOIN companies c ON c.id = p.company_id AND c.status = 'active'
    )
  );

-- working_hours: staff manage, public read for availability
CREATE POLICY "Company staff manage working_hours" ON working_hours
  FOR ALL USING (
    professional_id IN (
      SELECT p.id FROM professionals p
      JOIN profiles pr ON pr.company_id = p.company_id AND pr.id = auth.uid()
    )
  );

CREATE POLICY "Public reads working_hours" ON working_hours
  FOR SELECT USING (
    professional_id IN (
      SELECT p.id FROM professionals p
      JOIN companies c ON c.id = p.company_id AND c.status = 'active'
    )
  );

-- Appointments: company staff manage, clients create/read own
CREATE POLICY "Company staff manage appointments" ON appointments
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Clients see own appointments" ON appointments
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Clients create appointments for themselves" ON appointments
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- appointment_services: staff and clients
CREATE POLICY "Staff manage appointment_services" ON appointment_services
  FOR ALL USING (
    appointment_id IN (
      SELECT a.id FROM appointments a
      JOIN profiles pr ON pr.company_id = a.company_id AND pr.id = auth.uid()
    )
  );

CREATE POLICY "Clients manage own appointment_services" ON appointment_services
  FOR ALL USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE client_id = auth.uid()
    )
  );
