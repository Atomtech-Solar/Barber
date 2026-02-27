import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Scissors, Clock } from "lucide-react";
import { companyService } from "@/services/company.service";
import { serviceService } from "@/services/service.service";
import { professionalService } from "@/services/professional.service";
import { useTenant } from "@/contexts/TenantContext";

const SiteLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const { setCurrentCompanyBySlug } = useTenant();

  const { data: companyData } = useQuery({
    queryKey: ["company", slug],
    queryFn: () => companyService.getBySlug(slug ?? ""),
    enabled: !!slug,
  });

  const company = companyData?.data;
  const companyId = company?.id ?? "";

  const { data: servicesData } = useQuery({
    queryKey: ["services-public", companyId],
    queryFn: () => serviceService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: professionalsData } = useQuery({
    queryKey: ["professionals-public", companyId],
    queryFn: () => professionalService.listByCompany(companyId),
    enabled: !!companyId,
  });

  useEffect(() => {
    if (slug) {
      setCurrentCompanyBySlug(slug);
    }
  }, [slug, setCurrentCompanyBySlug]);

  const services = servicesData?.data ?? [];
  const professionals = (professionalsData?.data ?? []).filter((p) => p.is_active);

  const bookingUrl = `/client/booking${slug ? `?company=${slug}` : ""}`;

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Empresa não encontrada</p>
      </div>
    );
  }

  if (companyData?.error && !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Empresa não encontrada</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/5" />
        <nav className="relative z-10 flex items-center justify-between p-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Scissors className="text-primary" size={24} />
            <span className="font-display text-xl font-bold">
              {company.name}
            </span>
          </div>
          <Link to={bookingUrl}>
            <Button>Agendar Agora</Button>
          </Link>
        </nav>
        <div className="relative z-10 text-center py-24 px-6 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            {company.slogan ? (
              company.slogan
            ) : (
              <>
                Seu estilo, <span className="text-primary">nossa arte</span>
              </>
            )}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
            Agende online e transforme seu visual.
          </p>
          <Link to={bookingUrl}>
            <Button size="lg" className="text-lg px-8 py-6">
              Agendar Horário
            </Button>
          </Link>
        </div>
      </header>

      <section className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Nossos Serviços</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.length === 0 ? (
            <p className="col-span-3 text-center text-muted-foreground">
              Nenhum serviço cadastrado
            </p>
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                  <Clock size={14} /> {service.duration_minutes}min
                </div>
                <p className="text-2xl font-bold text-primary">
                  R$ {Number(service.price).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Nossa Equipe</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {professionals.length === 0 ? (
              <p className="col-span-3 text-center text-muted-foreground">
                Nenhum profissional cadastrado
              </p>
            ) : (
              professionals.map((pro) => (
                <div key={pro.id} className="text-center p-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl mx-auto mb-4 overflow-hidden">
                    {pro.photo_url ? (
                      <img
                        src={pro.photo_url}
                        alt={pro.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{pro.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <h3 className="font-semibold">{pro.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pro.specialty || "Profissional"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Como funciona</h2>
        <p className="text-muted-foreground mb-8">
          Escolha o serviço, o profissional e o horário. Em menos de 30 segundos
          você confirma seu agendamento. Simples e rápido!
        </p>
        <Link to={bookingUrl}>
          <Button size="lg" className="text-lg px-8 py-6">
            Agendar Agora
          </Button>
        </Link>
      </section>

      <footer className="py-12 px-6 border-t border-border text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {company.name} · Powered by brynex</p>
      </footer>
    </div>
  );
};

export default SiteLanding;
