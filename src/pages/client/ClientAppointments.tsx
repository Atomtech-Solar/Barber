import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { bookingService } from "@/services/booking.service";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const ClientAppointments = () => {
  const { user } = useAuth();
  const { data: appointmentsData } = useQuery({
    queryKey: ["appointments-client", user?.id],
    queryFn: () => bookingService.listByClient(user!.id),
    enabled: !!user?.id,
  });

  const appointments = appointmentsData?.data ?? [];

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold">Meus Agendamentos</h1>
      {appointments.length === 0 ? (
        <div className="bg-muted/30 border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">
            Nenhum agendamento encontrado
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-semibold text-sm sm:text-base">
                  {format(parseISO(apt.date), "d MMM yyyy", { locale: ptBR })} ·{" "}
                  {apt.start_time?.slice(0, 5)}
                </span>
                <Badge
                  variant={
                    apt.status === "confirmed" ? "default" : apt.status === "completed" ? "secondary" : "outline"
                  }
                  className="shrink-0"
                >
                  {apt.status === "confirmed"
                    ? "Confirmado"
                    : apt.status === "completed"
                      ? "Concluído"
                      : apt.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {apt.duration_minutes}min
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientAppointments;
