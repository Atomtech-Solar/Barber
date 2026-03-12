import { Link } from "react-router-dom";
import {
  Scissors,
  Circle,
  Package,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { Service } from "@/types/database.types";

/**
 * Retorna o ícone do serviço com base na categoria ou nome.
 * No futuro: usar service.icon_name ou service.icon_url quando o campo for editável.
 */
function getServiceIcon(service: Service): LucideIcon {
  const text = `${service.category ?? ""} ${service.name}`.toLowerCase();
  if (text.includes("barba")) return Circle;
  if (text.includes("corte") || text.includes("cabelo")) return Scissors;
  if (text.includes("combo") || text.includes("pacote")) return Package;
  return Scissors;
}

interface SiteServicesProps {
  services: Service[];
  bookingUrl: string;
}

export function SiteServices({ services, bookingUrl }: SiteServicesProps) {
  return (
    <section
      id="servicos"
      className="py-20 px-6 scroll-mt-24 bg-transparent text-foreground"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Coluna esquerda - título e link */}
          <div className="lg:col-span-4 flex flex-col">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Nossos Serviços
            </h2>
            <Link
              to={bookingUrl}
              className="group inline-flex items-center gap-2 text-foreground/90 hover:text-primary transition-colors w-fit"
            >
              <span className="border-b border-current pb-0.5">
                Agendar online
              </span>
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>

          {/* Coluna direita - grid de serviços */}
          <div className="lg:col-span-8">
            {services.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                Nenhum serviço cadastrado
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {services.map((service) => {
                  const Icon = getServiceIcon(service);
                  return (
                    <div
                      key={service.id}
                      className="aspect-square bg-card dark:bg-white/[0.03] p-6 flex flex-col items-center justify-center text-center border border-border dark:border-white/[0.06] hover:border-primary/30 transition-colors rounded-none"
                    >
                      {/* Ícone - no futuro: service.icon_url ou ícone customizado editável */}
                      <div className="w-14 h-14 mb-4 flex items-center justify-center text-foreground/90">
                        <Icon size={32} strokeWidth={1.5} className="opacity-90" />
                      </div>

                      {/* Nome do serviço */}
                      <h3 className="font-semibold text-foreground mb-2">
                        {service.name}
                      </h3>

                      {/* Tempo */}
                      <p className="text-sm text-muted-foreground mb-3">
                        {service.duration_minutes} min
                      </p>

                      {/* Preço em destaque */}
                      <p className="text-xl font-bold text-primary mt-auto">
                        R$ {Number(service.price).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
