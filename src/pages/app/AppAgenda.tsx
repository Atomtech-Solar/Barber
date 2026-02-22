import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mockAppointments } from "@/data/mockData";

const hours = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);
const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const AppAgenda = () => (
  <PageContainer
    title="Agenda"
    description="Gerencie seus agendamentos"
    actions={
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon"><ChevronLeft size={16} /></Button>
        <span className="text-sm font-medium px-3">22 – 28 Fev 2026</span>
        <Button variant="outline" size="icon"><ChevronRight size={16} /></Button>
      </div>
    }
  >
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-border">
        <div className="p-3 text-xs text-muted-foreground" />
        {days.map((day) => (
          <div key={day} className="p-3 text-center text-sm font-medium border-l border-border">
            {day}
          </div>
        ))}
      </div>
      <div className="max-h-[600px] overflow-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-border last:border-0">
            <div className="p-3 text-xs text-muted-foreground text-right pr-4">{hour}</div>
            {days.map((day) => {
              const apt = mockAppointments.find((a) => a.time === hour && day === 'Seg');
              return (
                <div key={day} className="p-1 border-l border-border min-h-[60px]">
                  {apt && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-2 text-xs cursor-pointer hover:bg-primary/20 transition-colors">
                      <p className="font-medium text-primary">{apt.client}</p>
                      <p className="text-muted-foreground">{apt.service}</p>
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

export default AppAgenda;
