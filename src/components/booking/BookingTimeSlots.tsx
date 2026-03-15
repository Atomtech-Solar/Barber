import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AvailableSlot } from "@/services/booking.service";

interface BookingTimeSlotsProps {
  slots: AvailableSlot[];
  selected: string | null;
  onSelect: (time: string) => void;
}

function getUnavailableLabel(reason?: "past" | "occupied"): string {
  switch (reason) {
    case "past":
      return "Horário já passou";
    case "occupied":
      return "Horário indisponível";
    default:
      return "";
  }
}

export function BookingTimeSlots({
  slots,
  selected,
  onSelect,
}: BookingTimeSlotsProps) {
  const availableCount = slots.filter((s) => s.available !== false).length;

  return (
    <TooltipProvider>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {slots.length === 0 ? (
          <p className="col-span-full py-4 text-center text-muted-foreground">
            Nenhum horário disponível nesta data
          </p>
        ) : (
          slots.map((slot) => {
            const isSelected = selected === slot.startTime;
            const isAvailable = slot.available !== false;
            const label = getUnavailableLabel(slot.unavailableReason);

            const button = (
              <button
                key={slot.startTime}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && onSelect(slot.startTime)}
                className={cn(
                  "w-full py-3 rounded-lg border-2 text-sm font-medium transition-all touch-manipulation",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : isAvailable
                      ? "border-border bg-card hover:border-primary/50"
                      : "cursor-not-allowed border-border bg-card opacity-50"
                )}
              >
                {slot.startTime}
              </button>
            );

            if (!isAvailable && label) {
              return (
                <Tooltip key={slot.startTime}>
                  <TooltipTrigger asChild>
                    <span className="block w-full">{button}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }
            return button;
          })
        )}
      </div>
      {slots.length > 0 && availableCount === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum horário disponível nesta data. Escolha outro dia.
        </p>
      )}
    </TooltipProvider>
  );
}
