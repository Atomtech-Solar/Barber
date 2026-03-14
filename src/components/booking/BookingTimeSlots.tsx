import { cn } from "@/lib/utils";

interface BookingTimeSlotsProps {
  slots: { startTime: string }[];
  selected: string | null;
  onSelect: (time: string) => void;
}

export function BookingTimeSlots({
  slots,
  selected,
  onSelect,
}: BookingTimeSlotsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {slots.length === 0 ? (
        <p className="col-span-full py-4 text-center text-muted-foreground">
          Nenhum horário disponível nesta data
        </p>
      ) : (
        slots.map((slot) => {
          const isSelected = selected === slot.startTime;
          return (
            <button
              key={slot.startTime}
              type="button"
              onClick={() => onSelect(slot.startTime)}
              className={cn(
                "py-3 rounded-lg border-2 text-sm font-medium transition-all touch-manipulation",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              {slot.startTime}
            </button>
          );
        })
      )}
    </div>
  );
}
