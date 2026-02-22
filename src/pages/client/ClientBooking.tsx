import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mockServices, mockProfessionals } from "@/data/mockData";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

const ClientBooking = () => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPro, setSelectedPro] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const totalDuration = mockServices.filter((s) => selectedServices.includes(s.id)).reduce((acc, s) => acc + s.duration, 0);
  const totalPrice = mockServices.filter((s) => selectedServices.includes(s.id)).reduce((acc, s) => acc + s.price, 0);

  const toggleService = (id: string) => {
    setSelectedServices((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Agendar</h1>
        <p className="text-muted-foreground text-sm">
          {step === 0 && "Escolha seus serviços"}
          {step === 1 && "Escolha o profissional"}
          {step === 2 && "Escolha o horário"}
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-2">
        {[0, 1, 2].map((s) => (
          <div key={s} className={cn("h-1 flex-1 rounded-full transition-colors", s <= step ? "bg-primary" : "bg-border")} />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          {mockServices.map((service) => {
            const selected = selectedServices.includes(service.id);
            return (
              <button
                key={service.id}
                onClick={() => toggleService(service.id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border transition-colors text-left",
                  selected ? "border-primary bg-primary/5" : "border-border bg-card"
                )}
              >
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock size={12} /> {service.duration}min
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary">R$ {service.price}</span>
                  {selected && <Check size={18} className="text-primary" />}
                </div>
              </button>
            );
          })}
          {selectedServices.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total: {totalDuration}min</p>
                <p className="font-bold text-lg">R$ {totalPrice}</p>
              </div>
              <Button onClick={() => setStep(1)}>Continuar</Button>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {mockProfessionals.map((pro) => (
            <button
              key={pro.id}
              onClick={() => { setSelectedPro(pro.id); setStep(2); }}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border transition-colors text-left",
                selectedPro === pro.id ? "border-primary bg-primary/5" : "border-border bg-card"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                {pro.avatar}
              </div>
              <div>
                <p className="font-medium">{pro.name}</p>
                <p className="text-sm text-muted-foreground">{pro.role}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={cn(
                  "py-3 rounded-lg border text-sm font-medium transition-colors",
                  selectedTime === time
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                {time}
              </button>
            ))}
          </div>
          {selectedTime && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">Resumo</h3>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>Serviços: {mockServices.filter((s) => selectedServices.includes(s.id)).map((s) => s.name).join(', ')}</p>
                <p>Profissional: {mockProfessionals.find((p) => p.id === selectedPro)?.name}</p>
                <p>Horário: {selectedTime} · {totalDuration}min</p>
              </div>
              <p className="font-bold text-lg text-primary">Total: R$ {totalPrice}</p>
              <Button className="w-full py-5 text-lg">Confirmar Agendamento</Button>
            </div>
          )}
        </div>
      )}

      {step > 0 && (
        <Button variant="ghost" onClick={() => setStep(step - 1)}>← Voltar</Button>
      )}
    </div>
  );
};

export default ClientBooking;
