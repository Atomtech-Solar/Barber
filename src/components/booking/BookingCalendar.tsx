import { Calendar } from "@/components/ui/calendar";
import { addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BookingCalendarProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
}

export function BookingCalendar({ selected, onSelect }: BookingCalendarProps) {
  const today = startOfDay(new Date());
  const minDate = addDays(today, 0);
  const maxDate = addDays(today, 60);

  const disabledDays = (date: Date) => {
    if (isBefore(date, minDate)) return true;
    if (isBefore(maxDate, date)) return true;
    return false;
  };

  return (
    <div className="flex w-full justify-center">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={disabledDays}
        locale={ptBR}
        className="rounded-xl border bg-card p-3"
      />
    </div>
  );
}
