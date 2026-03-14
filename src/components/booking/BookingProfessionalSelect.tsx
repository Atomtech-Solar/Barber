import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Professional } from "@/types/database.types";

interface BookingProfessionalSelectProps {
  professionals: Professional[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function BookingProfessionalSelect({
  professionals,
  selectedId,
  onSelect,
}: BookingProfessionalSelectProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {professionals.map((pro) => {
        const selected = selectedId === pro.id;
        return (
          <button
            key={pro.id}
            type="button"
            onClick={() => onSelect(pro.id)}
            className={cn(
              "flex w-full min-w-0 items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
              "touch-manipulation",
              selected
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage src={pro.photo_url ?? undefined} alt={pro.name} />
              <AvatarFallback className="text-lg">
                {pro.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{pro.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {pro.specialty || "Profissional"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
