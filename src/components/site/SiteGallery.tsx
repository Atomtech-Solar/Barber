import { Scissors } from "lucide-react";
import type { Company } from "@/types/database.types";

/** Imagens padrão em cores neutras para galeria (trabalhos realizados) */
const DEFAULT_GALLERY_IMAGES = [
  "https://placehold.co/400x400/e5e7eb/9ca3af?text=1",
  "https://placehold.co/400x400/e5e7eb/9ca3af?text=2",
  "https://placehold.co/400x400/e5e7eb/9ca3af?text=3",
  "https://placehold.co/400x400/e5e7eb/9ca3af?text=4",
  "https://placehold.co/400x400/e5e7eb/9ca3af?text=5",
  "https://placehold.co/400x400/e5e7eb/9ca3af?text=6",
  "https://placehold.co/400x400/e5e7eb/9ca3af?text=7",
  "https://placehold.co/400x400/e5e7eb/9ca3af?text=8",
];

interface SiteGalleryProps {
  company: Company;
  /** URLs das imagens (8 posições). Valores vazios usam imagem padrão da posição. */
  images?: (string | null | undefined)[];
}

export function SiteGallery({ company, images }: SiteGalleryProps) {
  const list =
    images && images.some((u) => u && u.trim().length > 0)
      ? images.map((url, i) => url && url.trim() ? url : DEFAULT_GALLERY_IMAGES[i] ?? DEFAULT_GALLERY_IMAGES[0])
      : DEFAULT_GALLERY_IMAGES;

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
