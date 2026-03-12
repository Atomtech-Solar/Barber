import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface SiteBookingCTAProps {
  slug: string;
  companyName?: string;
}

export function SiteBookingCTA({ slug, companyName }: SiteBookingCTAProps) {
  const bookingUrl = `/client/booking?company=${slug}`;

  return (
    <section
      className="relative py-24 px-6 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary) / 0.95) 0%, hsl(var(--primary) / 0.85) 50%, hsl(var(--primary) / 0.75) 100%)",
      }}
    >
      {/* Padrão sutil para dar profundidade */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm mb-6">
          <Calendar className="text-white" size={28} strokeWidth={2} />
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-sm">
          Agende seu horário agora
        </h2>

        <p className="text-white/95 text-base md:text-lg max-w-xl mx-auto mb-10">
          Escolha o serviço, profissional e horário em poucos cliques.
        </p>

        <Link to={bookingUrl} className="inline-block">
          <Button
            size="lg"
            className="text-lg font-semibold px-10 py-7 bg-white text-primary hover:bg-white/95 shadow-xl transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/25 hover:ring-4 hover:ring-white/50"
          >
            Agendar agora
          </Button>
        </Link>
      </div>
    </section>
  );
}
