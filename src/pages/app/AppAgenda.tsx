import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { bookingService } from "@/services/booking.service";
import { format, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

const HOURS = Array.from({ length: 11 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);
const DAYS = [1, 2, 3, 4, 5, 6];

const AppAgenda = () => {
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(addWeeks(weekStart, 1), "yyyy-MM-dd");

  const { data: appointmentsData } = useQuery({
    queryKey: ["appointments", companyId, startDate, endDate],
    queryFn: () => bookingService.listByCompany(companyId, startDate, endDate),
    enabled: !!companyId,
  });

  const appointments = appointmentsData?.data ?? [];

  const getAppointmentFor = (dayOffset: number, hour: string) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dayOffset);
    const targetDate = format(d, "yyyy-MM-dd");
    return appointments.find(
      (a) =>
        a.date === targetDate &&
        (a.start_time?.startsWith(hour.slice(0, 2)) ?? false)
    );
  };

  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <PageContainer
      title="Agenda"
      description="Gerencie seus agendamentos"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm font-medium px-3 min-w-[180px] text-center">
            {format(weekStart, "d MMM", { locale: ptBR })} –{" "}
            {format(addWeeks(weekStart, 1), "d MMM yyyy", { locale: ptBR })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      }
    >
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-border">
          <div className="p-3 text-xs text-muted-foreground" />
          {dayLabels.map((label, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return (
              <div
                key={label}
                className="p-3 text-center text-sm font-medium border-l border-border"
              >
                <div>{label}</div>
                <div className="text-xs text-muted-foreground">
                  {format(d, "d")}
                </div>
              </div>
            );
          })}
        </div>
        <div className="max-h-[600px] overflow-auto">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-border last:border-0"
            >
              <div className="p-3 text-xs text-muted-foreground text-right pr-4">
                {hour}
              </div>
              {DAYS.map((dayOffset) => {
                const apt = getAppointmentFor(dayOffset, hour);
                return (
                  <div
                    key={dayOffset}
                    className="p-1 border-l border-border min-h-[60px]"
                  >
                    {apt && (
                      <div className="bg-primary/10 border border-primary/30 rounded-lg p-2 text-xs cursor-pointer hover:bg-primary/20 transition-colors">
                        <p className="font-medium text-primary">
                          Agendamento
                        </p>
                        <p className="text-muted-foreground">
                          {apt.duration_minutes}min
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default AppAgenda;
