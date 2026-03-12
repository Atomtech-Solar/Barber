import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  SiteNavbar,
  SiteHero,
  SiteAbout,
  SiteServices,
  SiteProfessionals,
  SiteGallery,
  SiteBookingCTA,
  SiteFooter,
  SiteLandingSkeleton,
  SiteNotFound,
} from "@/components/site";
import { companyService } from "@/services/company.service";
import { serviceService } from "@/services/service.service";
import { professionalService } from "@/services/professional.service";
import { useTenant } from "@/contexts/TenantContext";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import { applyCompanyThemeForSite } from "@/lib/companyTheme";
import { SiteThemeProvider } from "@/contexts/SiteThemeContext";

const SiteLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const { setCurrentCompanyBySlug } = useTenant();

  const {
    data: companyData,
    isLoading: companyLoading,
    isError: companyError,
  } = useQuery({
    queryKey: ["company", slug],
    queryFn: () => companyService.getBySlug(slug ?? ""),
    enabled: !!slug,
  });

  const company = companyData?.data ?? null;
  const companyId = company?.id ?? "";

  const { data: servicesData } = useQuery({
    queryKey: ["services-public", companyId],
    queryFn: () => serviceService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: professionalsData } = useQuery({
    queryKey: ["professionals-public", companyId],
    queryFn: () => professionalService.listByCompanyForSite(companyId),
    enabled: !!companyId,
  });

  const services = servicesData?.data ?? [];
  const professionals = professionalsData?.data ?? [];
  const bookingUrl = `/client/booking${slug ? `?company=${slug}` : ""}`;

  useEffect(() => {
    if (slug) {
      setCurrentCompanyBySlug(slug);
    }
  }, [slug, setCurrentCompanyBySlug]);

  useEffect(() => {
    if (company) {
      applyCompanyThemeForSite(company);
    }
    return () => applyCompanyThemeForSite(null);
  }, [company]);

  useSiteMeta({
    company,
    slug,
    isReady: !!company && !!slug,
  });

  if (!slug) {
    return <SiteNotFound />;
  }

  if (companyError || (companyData?.error && !company)) {
    return <SiteNotFound />;
  }

  if (companyLoading || !company) {
    return <SiteLandingSkeleton />;
  }

  const initialTheme =
    (company.dashboard_theme === "dark" || company.dashboard_theme === "light"
      ? company.dashboard_theme
      : "dark") as "dark" | "light";

  return (
    <SiteThemeProvider initialTheme={initialTheme}>
      <div className="min-h-screen bg-background">
        <SiteNavbar company={company} bookingUrl={bookingUrl} />
        <SiteHero company={company} bookingUrl={bookingUrl} />
        <SiteAbout company={company} />
        <SiteServices services={services} bookingUrl={bookingUrl} />
        <SiteProfessionals professionals={professionals} />
        <SiteGallery company={company} />
        <SiteBookingCTA slug={slug} companyName={company.name} />
        <SiteFooter company={company} />
      </div>
    </SiteThemeProvider>
  );
};

export default SiteLanding;
