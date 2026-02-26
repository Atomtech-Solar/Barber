import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";

export const APP_PAGE_KEYS = [
  "dashboard",
  "agenda",
  "clients",
  "services",
  "professionals",
  "financial",
  "stock",
  "reports",
  "settings",
] as const;

export type AppPageKey = (typeof APP_PAGE_KEYS)[number];

function mapPathToPageKey(pathname: string): AppPageKey {
  if (pathname.startsWith("/app/agenda")) return "agenda";
  if (pathname.startsWith("/app/clients")) return "clients";
  if (pathname.startsWith("/app/services")) return "services";
  if (pathname.startsWith("/app/professionals")) return "professionals";
  if (pathname.startsWith("/app/financial")) return "financial";
  if (pathname.startsWith("/app/stock")) return "stock";
  if (pathname.startsWith("/app/reports")) return "reports";
  if (pathname.startsWith("/app/settings")) return "settings";
  return "dashboard";
}

export function useCompanyPageAccess() {
  const { user, profile } = useAuth();
  const { currentCompany } = useTenant();
  const isOwner = profile?.role === "owner";

  const { data, isLoading } = useQuery({
    queryKey: ["company-member-access", currentCompany?.id, user?.id],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from("company_members")
        .select("allowed_pages")
        .eq("company_id", currentCompany!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (row?.allowed_pages as string[] | null | undefined) ?? null;
    },
    enabled: !!user?.id && !!currentCompany?.id && !isOwner,
  });

  const allowedPages: AppPageKey[] =
    isOwner || !data
      ? [...APP_PAGE_KEYS]
      : APP_PAGE_KEYS.filter((key) => data.includes(key));

  const hasAccessToPage = (pageKey: AppPageKey) => allowedPages.includes(pageKey);
  const hasAccessToPath = (pathname: string) => hasAccessToPage(mapPathToPageKey(pathname));

  return {
    isLoading: !isOwner && isLoading,
    allowedPages,
    hasAccessToPage,
    hasAccessToPath,
  };
}
