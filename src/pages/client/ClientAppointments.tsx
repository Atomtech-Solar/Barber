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
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Meus Agendamentos</h1>
      <div className="space-y-3">
        {appointments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum agendamento encontrado
          </p>
        ) : (
          appointments.map((apt) => (
            <div key={apt.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">
                  {format(parseISO(apt.date), "d MMM yyyy", { locale: ptBR })} ·{" "}
                  {apt.start_time?.slice(0, 5)}
                </span>
                <Badge
                  variant={
                    apt.status === "confirmed" ? "default" : apt.status === "completed" ? "secondary" : "outline"
                  }
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
          ))
        )}
      </div>
    </div>
  );
};

export default ClientAppointments;
