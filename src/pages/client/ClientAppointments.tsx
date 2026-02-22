import { mockAppointments } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ClientAppointments = () => (
  <div className="space-y-6 animate-fade-in">
    <h1 className="text-2xl font-bold">Meus Agendamentos</h1>
    <div className="space-y-3">
      {mockAppointments.map((apt) => (
        <div key={apt.id} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{apt.date} · {apt.time}</span>
            <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
              {apt.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
            </Badge>
          </div>
          <p className="text-sm">{apt.service}</p>
          <p className="text-xs text-muted-foreground">com {apt.professional} · {apt.duration}min</p>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm">Reagendar</Button>
            <Button variant="ghost" size="sm" className="text-destructive">Cancelar</Button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ClientAppointments;
