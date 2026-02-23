import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { bookingService } from "@/services/booking.service";
import { Calendar, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const ClientHome = () => {
  const { user, profile } = useAuth();
  const { data: appointmentsData } = useQuery({
    queryKey: ["appointments-client", user?.id],
    queryFn: () => bookingService.listByClient(user!.id),
    enabled: !!user?.id,
  });

  const appointments = appointmentsData?.data ?? [];
  const nextAppointment = appointments.find((a) => a.date >= format(new Date(), "yyyy-MM-dd"));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">
          Olá, {profile?.full_name?.split(" ")[0] ?? "Cliente"}! 👋
        </h1>
        <p className="text-muted-foreground text-sm">Bem-vindo de volta</p>
      </div>

      <Link to="/client/booking">
        <Button className="w-full py-6 text-lg">
          <Calendar size={20} className="mr-2" /> Agendar Horário
        </Button>
      </Link>

      {nextAppointment ? (
        <div>
          <h2 className="font-semibold mb-3">Próximo Agendamento</h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-primary font-bold">
                {format(parseISO(nextAppointment.date), "EEEE, d MMM", { locale: ptBR })} ·{" "}
                {nextAppointment.start_time?.slice(0, 5)}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  nextAppointment.status === "confirmed"
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {nextAppointment.status === "confirmed" ? "Confirmado" : "Pendente"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {nextAppointment.duration_minutes}min
            </p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="font-semibold mb-3">Próximo Agendamento</h2>
          <p className="text-muted-foreground text-sm">Nenhum agendamento futuro</p>
        </div>
      )}

      <Link to="/client/appointments">
        <Button variant="outline" className="w-full h-auto py-4 flex items-center gap-2">
          <Clock size={20} />
          <span>Ver todos os agendamentos</span>
        </Button>
      </Link>
    </div>
  );
};

export default ClientHome;
