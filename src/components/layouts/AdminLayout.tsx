import { Link, Outlet, useLocation } from "react-router-dom";
import { Building2, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const AdminLayout = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="text-primary" size={24} />
            <span className="font-display text-xl font-bold text-primary">BeautyHub</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Painel Administrativo</p>
        </div>
        <nav className="flex-1 p-4">
          <Link
            to="/owner/dashboard"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              location.pathname === "/admin" || location.pathname === "/owner/dashboard"
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Building2 size={20} />
            <span>Empresas</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground">Super Admin</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => signOut()}
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
