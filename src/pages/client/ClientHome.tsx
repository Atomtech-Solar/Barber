import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Repeat } from "lucide-react";

const ClientHome = () => (
  <div className="space-y-6 animate-fade-in">
    <div>
      <h1 className="text-2xl font-bold">Olá, João! 👋</h1>
      <p className="text-muted-foreground text-sm">Bem-vindo de volta</p>
    </div>

    <Link to="/client/booking">
      <Button className="w-full py-6 text-lg">
        <Calendar size={20} className="mr-2" /> Agendar Horário
      </Button>
    </Link>

    <div>
      <h2 className="font-semibold mb-3">Próximo Agendamento</h2>
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-primary font-bold">Hoje, 14:00</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Confirmado</span>
        </div>
        <p className="font-medium">Corte + Barba</p>
        <p className="text-sm text-muted-foreground">com Carlos Silva · 60min</p>
      </div>
    </div>

    <div>
      <h2 className="font-semibold mb-3">Ações Rápidas</h2>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-auto py-4 flex-col gap-2">
          <Repeat size={20} />
          <span className="text-xs">Repetir Último</span>
        </Button>
        <Link to="/client/appointments">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
            <Clock size={20} />
            <span className="text-xs">Histórico</span>
          </Button>
        </Link>
      </div>
    </div>
  </div>
);

export default ClientHome;
