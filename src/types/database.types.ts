export type UserRole = 'owner' | 'company_admin' | 'employee' | 'client';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'blocked';

export interface Company {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  logo: string | null;
  logo_url: string | null;
  cnpj: string | null;
  email: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  slogan: string | null;
  phone: string | null;
  status: 'active' | 'blocked';
  /** Data em que o plano foi iniciado (admin) */
  active_from: string | null;
  /** Quantidade de dias que a empresa ficará ativa (admin) */
  active_days: number | null;
  /** Observações do admin */
  admin_obs: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  company_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  company_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface Professional {
  id: string;
  company_id: string;
  profile_id: string | null;
  name: string;
  photo_url: string | null;
  specialty: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalService {
  professional_id: string;
  service_id: string;
}

export type CompanyMemberRole = 'owner' | 'admin' | 'staff';

export interface CompanyMember {
  id: string;
  user_id: string;
  company_id: string;
  role: CompanyMemberRole;
  created_at: string;
}

export interface WorkingHour {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Appointment {
  id: string;
  company_id: string;
  client_id: string;
  professional_id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentService {
  appointment_id: string;
  service_id: string;
}

// Extended types for joins
export interface ProfessionalWithServices extends Professional {
  professional_services?: { service_id: string }[];
  working_hours?: WorkingHour[];
}

export interface AppointmentWithDetails extends Appointment {
  services?: Service[];
  professional?: Professional;
  client?: Profile;
}
