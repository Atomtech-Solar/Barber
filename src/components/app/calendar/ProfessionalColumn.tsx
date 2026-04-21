import type { Appointment, Professional } from "@/types/database.types";
import type { MouseEvent } from "react";
import { EventBlock } from "./EventBlock";
import { CLICK_ROUNDING_MINUTES, minutesToTime, roundMinutes } from "./calendarUtils";

interface ProfessionalColumnProps {
  professional: Professional;
  appointments: (Appointment & { starts_at?: string | null; ends_at?: string | null })[];
  pixelsPerMinute: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
  onEmptyClick: (professionalId: string, startTime: string) => void;
  onEventClick: (appointmentId: string) => void;
}

export function ProfessionalColumn({
  professional,
  appointments,
  pixelsPerMinute,
  dayStartMinutes,
  dayEndMinutes,
  onEmptyClick,
  onEventClick,
}: ProfessionalColumnProps) {
  const totalMinutes = dayEndMinutes - dayStartMinutes;
  const height = totalMinutes * pixelsPerMinute;

  const handleEmptyClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;
    const clickedMinutesFromStart = Math.max(0, Math.floor(relativeY / pixelsPerMinute));
    const absoluteMinutes = roundMinutes(
      dayStartMinutes + clickedMinutesFromStart,
      CLICK_ROUNDING_MINUTES
    );
    onEmptyClick(professional.id, minutesToTime(absoluteMinutes));
  };

  return (
    <div className="min-w-[240px] border-l border-border first:border-l-0">
      <div className="sticky top-0 z-20 border-b border-border bg-muted/95 p-3 text-center text-sm font-semibold backdrop-blur">
        {professional.name}
      </div>
      <div
        className="relative cursor-pointer bg-background/50"
        style={{ height }}
        onClick={handleEmptyClick}
      >
        {appointments.map((appointment) => (
          <div key={appointment.id} onClick={(e) => e.stopPropagation()}>
            <EventBlock
              appointment={appointment}
              professionalName={professional.name}
              pixelsPerMinute={pixelsPerMinute}
              dayStartMinutes={dayStartMinutes}
              onClick={onEventClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
