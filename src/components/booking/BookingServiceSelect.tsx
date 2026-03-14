import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Service } from "@/types/database.types";

interface BookingServiceSelectProps {
  services: Service[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function BookingServiceSelect({
  services,
  selectedIds,
  onToggle,
}: BookingServiceSelectProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        const selected = selectedIds.includes(service.id);
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onToggle(service.id)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
              "min-h-[88px] touch-manipulation",
              selected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <p className="font-semibold leading-tight">{service.name}</p>
              {selected && <Check size={20} className="shrink-0 text-primary" />}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {service.duration_minutes} min
              </span>
              <span className="font-bold text-primary">
                R$ {Number(service.price).toFixed(2)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
