import { format } from "date-fns";
import type { Appointment, Professional } from "@/types/database.types";
import { ProfessionalColumn } from "./ProfessionalColumn";
import {
  PIXELS_PER_MINUTE,
  getMinutesFromMidnight,
  isSameLocalDate,
  parseAppointmentStart,
  timeToMinutes,
} from "./calendarUtils";

interface CalendarViewProps {
  date: Date;
  professionals: Professional[];
  appointments: (Appointment & { starts_at?: string | null; ends_at?: string | null })[];
  openingTime: string;
  closingTime: string;
  pixelsPerMinute?: number;
  onEmptySlotClick: (payload: { professionalId: string; date: string; startTime: string }) => void;
  onEventClick: (appointmentId: string) => void;
}

export function CalendarView({
  date,
  professionals,
  appointments,
  openingTime,
  closingTime,
  pixelsPerMinute = PIXELS_PER_MINUTE,
  onEmptySlotClick,
  onEventClick,
}: CalendarViewProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayStartMinutes = timeToMinutes(openingTime);
  const dayEndMinutes = timeToMinutes(closingTime);
  const totalMinutes = Math.max(dayEndMinutes - dayStartMinutes, 0);
  const containerHeight = totalMinutes * pixelsPerMinute;
  const hourMarks = Array.from(
    { length: Math.ceil(totalMinutes / 60) + 1 },
    (_, i) => dayStartMinutes + i * 60
  ).filter((m) => m <= dayEndMinutes);

  const appointmentsByProfessional = professionals.reduce<
    Record<string, (Appointment & { starts_at?: string | null; ends_at?: string | null })[]>
  >((acc, professional) => {
    acc[professional.id] = appointments
      .filter((appointment) => {
        if (appointment.professional_id !== professional.id) return false;
        const start = parseAppointmentStart(appointment);
        return isSameLocalDate(start, dateStr);
      })
      .sort(
        (a, b) =>
          getMinutesFromMidnight(parseAppointmentStart(a)) -
          getMinutesFromMidnight(parseAppointmentStart(b))
      );
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="overflow-auto max-h-[calc(100vh-280px)] scrollbar-theme">
        <div className="flex min-w-[760px]">
          <div className="sticky left-0 z-30 w-20 shrink-0 border-r border-border bg-card">
            <div className="sticky top-0 z-30 h-[49px] border-b border-border bg-muted/95 backdrop-blur" />
            <div className="relative" style={{ height: containerHeight }}>
              {hourMarks.map((minutes) => (
                <div
                  key={minutes}
                  className="absolute left-0 right-0 -translate-y-1/2 pr-2 text-right text-xs text-muted-foreground"
                  style={{ top: (minutes - dayStartMinutes) * pixelsPerMinute }}
                >
                  {String(Math.floor(minutes / 60)).padStart(2, "0")}:
                  {String(minutes % 60).padStart(2, "0")}
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-0">
              {hourMarks.map((minutes) => (
                <div
                  key={`line-${minutes}`}
                  className="absolute left-0 right-0 border-t border-dashed border-border/70"
                  style={{ top: (minutes - dayStartMinutes) * pixelsPerMinute }}
                />
              ))}
            </div>

            {professionals.map((professional) => (
              <ProfessionalColumn
                key={professional.id}
                professional={professional}
                appointments={appointmentsByProfessional[professional.id] ?? []}
                pixelsPerMinute={pixelsPerMinute}
                dayStartMinutes={dayStartMinutes}
                dayEndMinutes={dayEndMinutes}
                onEmptyClick={(professionalId, startTime) =>
                  onEmptySlotClick({ professionalId, date: dateStr, startTime })
                }
                onEventClick={onEventClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
