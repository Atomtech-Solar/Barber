import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { companyService } from "@/services/company.service";
import type { Company } from "@/types/database.types";
import { useAuth } from "@/hooks/useAuth";

interface TenantContextType {
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  setCurrentCompanyBySlug: (slug: string) => Promise<void>;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { profile, isAuthenticated } = useAuth();
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentCompany = useCallback((company: Company | null) => {
    setCurrentCompanyState(company);
    if (company) {
      try {
        sessionStorage.setItem("tenant_slug", company.slug);
      } catch {
        // Atenção: sessionStorage é vulnerável a XSS - uso apenas para UX
      }
    } else {
      try {
        sessionStorage.removeItem("tenant_slug");
      } catch {
        /**/
      }
    }
  }, []);

  const setCurrentCompanyBySlug = useCallback(async (slug: string) => {
    setIsLoading(true);
    const { data } = await companyService.getBySlug(slug);
    setCurrentCompanyState(data ?? null);
    if (data) {
      try {
        sessionStorage.setItem("tenant_slug", data.slug);
      } catch {
        /**/
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      const slug = sessionStorage.getItem("tenant_slug");
      if (slug) {
        companyService.getBySlug(slug).then(({ data }) => {
          setCurrentCompanyState(data ?? null);
          setIsLoading(false);
        });
      } else {
        setCurrentCompanyState(null);
        setIsLoading(false);
      }
      return;
    }

    const initTenant = async () => {
      if (profile?.role === "owner") {
        const slug = sessionStorage.getItem("tenant_slug");
        if (slug) {
          const { data } = await companyService.getBySlug(slug);
          setCurrentCompanyState(data ?? null);
        }
      } else if (profile?.company_id) {
        const { data } = await companyService.getById(profile.company_id);
        setCurrentCompanyState(data ?? null);
      }
      setIsLoading(false);
    };

    initTenant();
  }, [isAuthenticated, profile?.role, profile?.company_id]);

  return (
    <TenantContext.Provider
      value={{
        currentCompany,
        setCurrentCompany,
        setCurrentCompanyBySlug,
        isLoading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return ctx;
}
