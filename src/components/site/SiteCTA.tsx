import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SiteCTAProps {
  bookingUrl: string;
  companyName: string;
}

export function SiteCTA({ bookingUrl, companyName }: SiteCTAProps) {
  return (
    <section className="py-20 px-6 max-w-2xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-4">Pronto para agendar?</h2>
      <p className="text-muted-foreground mb-8">
        Escolha o serviço, o profissional e o horário. Em menos de 30 segundos
        você confirma seu agendamento em {companyName}. Simples e rápido!
      </p>
      <Link to={bookingUrl}>
        <Button size="lg" className="text-lg px-8 py-6">
          Agendar Agora
        </Button>
      </Link>
    </section>
  );
}
