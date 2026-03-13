import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { RouteErrorBoundary } from "@/components/shared/RouteErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyPageAccess } from "@/hooks/useCompanyPageAccess";
import { applyCompanyTheme, resetAppTheme } from "@/lib/companyTheme";
import {
  LayoutDashboard, Calendar, Users, Scissors, UserCheck, DollarSign,
  Package, BarChart3, Settings, Plus, ChevronLeft, Menu,
  ChevronRight, LogOut, Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/app", accessKey: "dashboard" },
  { label: "Agenda", icon: Calendar, path: "/app/agenda", accessKey: "agenda" },
  { label: "Clientes", icon: Users, path: "/app/clients", accessKey: "clients" },
  { label: "Serviços", icon: Scissors, path: "/app/services", accessKey: "services" },
  { label: "Profissionais", icon: UserCheck, path: "/app/professionals", accessKey: "professionals" },
  { label: "Financeiro", icon: DollarSign, path: "/app/financial", accessKey: "financial" },
  { label: "Estoque", icon: Package, path: "/app/stock", accessKey: "stock" },
  { label: "Pagamentos", icon: Percent, path: "/app/payments", accessKey: "payments" },
  { label: "Relatórios", icon: BarChart3, path: "/app/reports", accessKey: "reports" },
  { label: "Configurações", icon: Settings, path: "/app/settings", accessKey: "settings" },
];

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { currentCompany } = useTenant();
  const { profile, user, signOut } = useAuth();
  const { hasAccessToPage, hasAccessToPath, isLoading: accessLoading } = useCompanyPageAccess();
  const canAccessCurrentPath = hasAccessToPath(location.pathname);

  useEffect(() => {
    applyCompanyTheme(currentCompany);
    return () => {
      // Ao desmontar (ex: sair para login), restaura tema padrão
      resetAppTheme();
    };
  }, [currentCompany]);

  const visibleNavItems = navItems.filter((item) => hasAccessToPage(item.accessKey));

  const renderNavLinks = (compact = false, onNavigate?: () => void) =>
    visibleNavItems.map((item) => {
      const active =
        item.path === "/app" ? location.pathname === "/app" : location.pathname.startsWith(item.path);

      const linkContent = (
        <>
          <item.icon size={20} className="shrink-0" />
          {!compact && <span>{item.label}</span>}
        </>
      );

      return onNavigate ? (
        <SheetClose asChild key={item.path}>
          <Link
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            onClick={onNavigate}
          >
            {linkContent}
          </Link>
        </SheetClose>
      ) : (
        <Link
          key={item.path}
          to={item.path}
          title={compact ? item.label : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            active
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          {linkContent}
        </Link>
      );
    });

  return (
    <div className="fixed inset-0 flex bg-background overflow-hidden">
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <span className="font-display text-lg font-bold text-primary">brynex</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {renderNavLinks(collapsed)}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-3 md:px-6 bg-card shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="Abrir menu">
                  <Menu size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] max-w-[320px] p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="font-display text-primary">brynex</SheetTitle>
                </SheetHeader>
                <nav className="p-2 space-y-1 overflow-y-auto">
                  {renderNavLinks(false, () => setMobileMenuOpen(false))}
                </nav>
              </SheetContent>
            </Sheet>
            <h2 className="font-display font-semibold text-base md:text-lg truncate">
              {currentCompany?.name ?? "Empresa"}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-sm text-muted-foreground hidden lg:inline">
              {profile?.full_name ?? user?.email ?? "Usuário"}
            </span>
            <Link to="/app/agenda">
              <Button size="sm">
                <Plus size={16} className="md:mr-2" />
                <span className="hidden md:inline">Novo Agendamento</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut size={16} className="md:mr-2" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 md:p-6">
          {accessLoading ? (
            <div className="min-h-[200px] flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Carregando acessos...</div>
            </div>
          ) : canAccessCurrentPath ? (
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          ) : (
            <div className="min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground text-center">
                Você não possui acesso a esta página.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
