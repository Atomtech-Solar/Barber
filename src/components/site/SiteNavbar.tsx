import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors, Menu, Sun, Moon } from "lucide-react";
import { useSiteTheme } from "@/contexts/SiteThemeContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Company } from "@/types/database.types";

const navItems = [
  { label: "HOME", href: "#" },
  { label: "SOBRE", href: "#sobre" },
  { label: "SERVIÇOS", href: "#servicos" },
  { label: "EQUIPE", href: "#equipe" },
  { label: "GALERIA", href: "#galeria" },
  { label: "CONTATO", href: "#contato" },
];

interface SiteNavbarProps {
  company: Company;
  bookingUrl: string;
}

export function SiteNavbar({ company, bookingUrl }: SiteNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useSiteTheme();
  const logoUrl = company.logo_url ?? company.logo;

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/95 dark:bg-black/80 backdrop-blur-md border-b border-border dark:border-white/[0.06]"
      aria-label="Navegação principal"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <button
          type="button"
          onClick={scrollToTop}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={company.name}
              className="h-9 w-9 object-contain rounded-lg"
            />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-primary/30 flex items-center justify-center ring-1 ring-primary/50">
              <Scissors className="text-primary" size={20} />
            </div>
          )}
          <span className="font-display text-base font-bold text-foreground tracking-wide hidden sm:inline">
            {company.name}
          </span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground/90 hover:text-primary transition-colors tracking-wider"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-foreground/90 hover:text-primary hover:bg-muted"
            aria-label={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
          <Link to={bookingUrl} className="hidden sm:block">
            <Button
              size="default"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium tracking-wide px-5"
            >
              AGENDAR
            </Button>
          </Link>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-foreground hover:bg-muted"
              >
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background border-border">
              <SheetHeader>
                <SheetTitle className="text-foreground">{company.name}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-base font-medium text-foreground/90 hover:text-primary transition-colors py-2 w-full justify-start"
                >
                  {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                  {theme === "dark" ? "Modo claro" : "Modo escuro"}
                </button>
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-foreground/90 hover:text-primary transition-colors py-2"
                  >
                    {item.label}
                  </a>
                ))}
                <Link
                  to={bookingUrl}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-4"
                >
                  <Button className="w-full">AGENDAR</Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
