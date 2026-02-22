import { Link, Outlet, useLocation } from "react-router-dom";
import { Home, Calendar, Clock, User, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Início", icon: Home, path: "/client" },
  { label: "Agendar", icon: Calendar, path: "/client/booking" },
  { label: "Meus Horários", icon: Clock, path: "/client/appointments" },
  { label: "Perfil", icon: User, path: "/client/profile" },
];

const ClientLayout = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto">
      <header className="p-4 border-b border-border flex items-center gap-2 shrink-0">
        <Scissors className="text-primary" size={20} />
        <span className="font-display font-bold text-primary">BeautyHub</span>
      </header>
      <main className="flex-1 overflow-auto p-4">
        <Outlet />
      </main>
      <nav className="border-t border-border bg-card flex justify-around py-2 shrink-0">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors rounded-lg",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default ClientLayout;
