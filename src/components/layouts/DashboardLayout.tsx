import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import {
  LayoutDashboard, Calendar, Users, Scissors, UserCheck, DollarSign,
  Package, ShoppingCart, BarChart3, Settings, Bell, Plus, ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/app" },
  { label: "Agenda", icon: Calendar, path: "/app/agenda" },
  { label: "Clientes", icon: Users, path: "/app/clients" },
  { label: "Serviços", icon: Scissors, path: "/app/services" },
  { label: "Profissionais", icon: UserCheck, path: "/app/professionals" },
  { label: "Financeiro", icon: DollarSign, path: "/app/financial" },
  { label: "Estoque", icon: Package, path: "/app/stock" },
  { label: "Vendas (PDV)", icon: ShoppingCart, path: "/app/sales" },
  { label: "Relatórios", icon: BarChart3, path: "/app/reports" },
  { label: "Configurações", icon: Settings, path: "/app/settings" },
];

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { currentCompany } = useTenant();

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <span className="font-display text-lg font-bold text-primary">BeautyHub</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              item.path === "/app"
                ? location.pathname === "/app"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
          <h2 className="font-display font-semibold text-lg">
            {currentCompany?.name ?? "Empresa"}
          </h2>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Bell size={16} className="mr-2" />
              <span className="hidden sm:inline">Notificações</span>
            </Button>
            <Link to="/app/agenda">
              <Button size="sm">
                <Plus size={16} className="mr-2" />
                <span className="hidden sm:inline">Novo Agendamento</span>
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
