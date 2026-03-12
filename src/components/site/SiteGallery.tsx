import { Scissors } from "lucide-react";
import type { Company } from "@/types/database.types";

/** Imagens padrão da galeria (trabalhos realizados). No futuro: carregar do company.gallery_images ou tabela gallery. */
const DEFAULT_GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400",
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400",
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400",
  "https://images.unsplash.com/photo-1493256338650-d82f7acb2b38?w=400",
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400",
];

interface SiteGalleryProps {
  company: Company;
  /** URLs das imagens. Se vazio, usa imagens padrão. */
  images?: string[];
}

export function SiteGallery({ company, images = DEFAULT_GALLERY_IMAGES }: SiteGalleryProps) {
  const list = images.length > 0 ? images : DEFAULT_GALLERY_IMAGES;

  return (
    <section
      id="galeria"
      className="py-20 px-6 scroll-mt-24 bg-muted/80 dark:bg-black/10 text-foreground relative overflow-hidden"
    >
      {/* Ícones decorativos sutis */}
      <div
        className="absolute top-12 left-12 opacity-[0.08] pointer-events-none"
        aria-hidden
      >
        <Scissors size={32} className="rotate-12" />
      </div>
      <div
        className="absolute top-16 right-16 opacity-[0.06] pointer-events-none"
        aria-hidden
      >
        <Scissors size={24} className="-rotate-6" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Título centralizado */}
        <header className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Nossos Trabalhos
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            Conheça alguns dos nossos melhores trabalhos realizados
          </p>
        </header>

        {/* Grid de fotos quadradas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {list.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="aspect-square rounded-lg overflow-hidden bg-card dark:bg-white/[0.03] group"
            >
              <img
                src={src}
                alt={`${company.name} - Trabalho ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
