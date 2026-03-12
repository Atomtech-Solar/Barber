import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import type { Company } from "@/types/database.types";

const ABOUT_GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400",
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400",
];

interface SiteAboutProps {
  company: Company;
}

export function SiteAbout({ company }: SiteAboutProps) {
  const smallTitle = company.name.toUpperCase();
  const sloganParts = (company.slogan ?? "Seu estilo, nossa arte").split(/(\s+\S+$)/);
  const largeTitleMain = sloganParts[0]?.trim() ?? "";
  const largeTitleAccent = sloganParts[1]?.trim() ?? "";

  const description =
    company.slogan
      ? `Na ${company.name}, cuidamos do seu visual com dedicação e profissionalismo. Nossa equipe está pronta para oferecer os melhores serviços. Agende online e transforme seu estilo.`
      : `${company.name} oferece os melhores serviços para cuidar do seu estilo. Ambiente aconchegante, profissionais qualificados e atendimento de excelência. Agende online e transforme seu visual com praticidade.`;

  const ownerName = company.owner_name ?? "Proprietário";
  const ownerRole = "Proprietário";
  const ownerQuote = `É na ${company.name} que nosso cuidado com cada detalhe faz a diferença.`;

  const ownerInitials = ownerName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section id="sobre" className="py-20 px-6 scroll-mt-24 bg-muted/30">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Coluna esquerda - galeria de fotos */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {ABOUT_GALLERY_IMAGES.map((src, i) => (
              <div
                key={src}
                className="aspect-[4/3] rounded-xl overflow-hidden bg-muted"
              >
                <img
                  src={src}
                  alt={`${company.name} - Serviços ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          {/* Botão play central (placeholder para futuro vídeo) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-lg ring-4 ring-background/50">
              <Play className="text-primary-foreground" size={28} fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Coluna direita - texto e informações */}
        <div className="relative overflow-hidden rounded-2xl">
          {/* Fundo com imagem borrada */}
          <div
            className="absolute inset-0 bg-cover bg-center scale-110 blur-xl opacity-30"
            style={{
              backgroundImage: `url(${ABOUT_GALLERY_IMAGES[0]})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-card/95 via-card/90 to-muted/95" />

          <div className="relative z-10 p-8 md:p-10 lg:p-12">
            {/* Título pequeno - nome da empresa */}
            <p className="text-sm font-semibold tracking-[0.2em] text-foreground/80 uppercase mb-3">
              {smallTitle}
            </p>

            {/* Frase de efeito - título grande */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
              {largeTitleAccent ? (
                <>
                  {largeTitleMain}{" "}
                  <span className="text-primary">{largeTitleAccent}</span>
                </>
              ) : (
                <span className="text-primary">{largeTitleMain}</span>
              )}
            </h2>

            {/* Texto explicativo */}
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              {description}
            </p>

            {/* Bloco do dono: foto, nome e cargo */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0 ring-2 ring-primary/50">
                <span className="text-lg font-bold text-primary">
                  {ownerInitials}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground italic mb-1">{ownerQuote}</p>
                <p className="font-semibold text-primary">
                  {ownerName}, {ownerRole}
                </p>
              </div>
            </div>

            {/* Botão Saiba mais */}
            <a href="#servicos">
              <Button
                variant="outline"
                className="border-2 border-primary text-foreground hover:bg-primary/20 hover:border-primary hover:text-foreground font-semibold tracking-wide px-8 py-6"
              >
                SAIBA MAIS
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
