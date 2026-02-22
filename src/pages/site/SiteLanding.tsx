import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors, Clock } from "lucide-react";
import { mockServices, mockProfessionals } from "@/data/mockData";

const SiteLanding = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/5" />
        <nav className="relative z-10 flex items-center justify-between p-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Scissors className="text-primary" size={24} />
            <span className="font-display text-xl font-bold">Barbearia Premium</span>
          </div>
          <Link to="/client/booking">
            <Button>Agendar Agora</Button>
          </Link>
        </nav>
        <div className="relative z-10 text-center py-24 px-6 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Seu estilo, <span className="text-primary">nossa arte</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
            Experiência premium em cuidados pessoais. Agende online e transforme seu visual.
          </p>
          <Link to="/client/booking">
            <Button size="lg" className="text-lg px-8 py-6">
              Agendar Horário
            </Button>
          </Link>
        </div>
      </header>

      {/* Services */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Nossos Serviços</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockServices.map((service) => (
            <div key={service.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
              <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                <Clock size={14} /> {service.duration}min
              </div>
              <p className="text-2xl font-bold text-primary">R$ {service.price}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Nossa Equipe</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockProfessionals.map((pro) => (
              <div key={pro.id} className="text-center p-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl mx-auto mb-4">
                  {pro.avatar}
                </div>
                <h3 className="font-semibold">{pro.name}</h3>
                <p className="text-sm text-muted-foreground">{pro.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Pronto para mudar seu visual?</h2>
          <p className="text-muted-foreground mb-8">Agende agora e garanta seu horário.</p>
          <Link to="/client/booking">
            <Button size="lg" className="text-lg px-8 py-6">Agendar Agora</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border text-center text-sm text-muted-foreground">
        <p>© 2026 Barbearia Premium · Powered by BeautyHub</p>
      </footer>
    </div>
  );
};

export default SiteLanding;
