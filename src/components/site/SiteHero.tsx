import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";
import type { Company } from "@/types/database.types";

/** Imagem padrão em cores neutras quando nenhuma é configurada */
const DEFAULT_HERO_IMAGE = "https://placehold.co/1920x1080/e5e7eb/9ca3af?text=Imagem+de+destaque";

interface SiteHeroProps {
  company: Company;
  bookingUrl: string;
  /** Título customizado (fallback: company.name) */
  title?: string | null;
  /** Subtítulo customizado (fallback: company.slogan) */
  subtitle?: string | null;
  /** Imagem de fundo customizada */
  image?: string | null;
}

export function SiteHero({ company, bookingUrl, title, subtitle, image }: SiteHeroProps) {
  const logoUrl = company.logo_url ?? company.logo;
  const heroTitle = title ?? company.name;
  const shortDescription =
    subtitle ??
    company.slogan ??
    "Cuidamos do seu estilo com dedicação e profissionalismo. Agende online e transforme seu visual.";
  const heroImage = image ?? DEFAULT_HERO_IMAGE;

  return (
    <header className="relative min-h-screen flex flex-col pt-16">
      {/* Background image com overlay escuro */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-background/70" />

      {/* Hero centralizado - logo, título, texto, botões */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        {/* Logo centralizada (maior) */}
        <div className="mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={company.name}
              className="h-24 w-24 md:h-32 md:w-32 mx-auto object-contain rounded-xl"
            />
          ) : (
            <div className="h-24 w-24 md:h-32 md:w-32 mx-auto rounded-xl bg-primary/20 flex items-center justify-center ring-2 ring-primary/40">
              <Scissors className="text-primary" size={48} />
            </div>
          )}
        </div>

        {/* Título principal */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-tight">
          {heroTitle.toUpperCase()}
        </h1>

        {/* Texto descritivo curto */}
        <p className="text-lg md:text-xl text-foreground/90 max-w-2xl mx-auto mb-10 leading-relaxed">
          {shortDescription}
        </p>

        {/* Botões principais */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to={bookingUrl}>
            <Button
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-base tracking-wide"
            >
              AGENDAR AGORA
            </Button>
          </Link>
          <a href="#servicos">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-2 border-foreground text-foreground hover:bg-foreground/10 font-semibold px-8 py-6 text-base tracking-wide"
            >
              VER SERVIÇOS
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
