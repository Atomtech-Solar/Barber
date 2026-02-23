import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { serviceService } from "@/services/service.service";
import { professionalService } from "@/services/professional.service";
import { bookingService } from "@/services/booking.service";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

const ClientBookingInner = () => {
  const [searchParams] = useSearchParams();
  const companySlug = searchParams.get("company");
  const { user } = useAuth();
  const { currentCompany, setCurrentCompanyBySlug, isLoading: tenantLoading } = useTenant();
  const queryClient = useQueryClient();

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPro, setSelectedPro] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (companySlug) {
      setCurrentCompanyBySlug(companySlug);
    }
  }, [companySlug, setCurrentCompanyBySlug]);

  const companyId = currentCompany?.id ?? "";

  const { data: servicesData } = useQuery({
    queryKey: ["services-booking", companyId],
    queryFn: () => serviceService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const services = servicesData?.data ?? [];

  const { data: professionalsData, isLoading: prosLoading } = useQuery({
    queryKey: ["professionals-booking", companyId, selectedServices],
    queryFn: () =>
      professionalService.getProfessionalsByServiceIds(companyId, selectedServices),
    enabled: !!companyId && selectedServices.length > 0,
  });

  const professionals = professionalsData?.data ?? [];

  const totalDuration = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalPrice = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((acc, s) => acc + Number(s.price), 0);

  const serviceDurations = services.reduce(
    (acc, s) => ({ ...acc, [s.id]: s.duration_minutes }),
    {} as Record<string, number>
  );

  const { data: slotsData } = useQuery({
    queryKey: ["slots", companyId, selectedPro, selectedDate, selectedServices],
    queryFn: () =>
      selectedPro && selectedDate
        ? bookingService.getAvailableSlots(
            companyId,
            selectedPro,
            selectedDate,
            selectedServices,
            serviceDurations
          )
        : Promise.resolve({ data: [] }),
    enabled: !!companyId && !!selectedPro && !!selectedDate && selectedServices.length > 0,
  });

  const slots = slotsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      bookingService.create({
        company_id: companyId,
        client_id: user!.id,
        professional_id: selectedPro!,
        date: selectedDate,
        start_time: selectedTime!,
        duration_minutes: totalDuration,
        service_ids: selectedServices,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setStep(4);
    },
  });

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { value: format(d, "yyyy-MM-dd"), label: format(d, "EEE, d MMM") };
  });

  if (tenantLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!currentCompany) {
    return (
      <div className="min-h-[200px] flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-center">
          Selecione uma empresa para agendar. Acesse a página da empresa pelo link de agendamento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Agendar</h1>
        <p className="text-muted-foreground text-sm">
          {step === 0 && "Escolha seus serviços"}
          {step === 1 && "Escolha o profissional"}
          {step === 2 && "Escolha data e horário"}
          {step === 3 && "Confirme seu agendamento"}
          {step === 4 && "Agendamento confirmado!"}
        </p>
      </div>

      {step < 4 && (
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-border"
              )}
            />
          ))}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-3">
          {services.map((service) => {
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
                    <Clock size={12} /> {service.duration_minutes}min
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary">
                    R$ {Number(service.price).toFixed(2)}
                  </span>
                  {selected && <Check size={18} className="text-primary" />}
                </div>
              </button>
            );
          })}
          {selectedServices.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total: {totalDuration}min</p>
                <p className="font-bold text-lg">R$ {totalPrice.toFixed(2)}</p>
              </div>
              <Button onClick={() => setStep(1)}>Continuar</Button>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {prosLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : professionals.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhum profissional disponível para os serviços selecionados.
            </p>
          ) : (
            professionals.map((pro) => (
              <button
                key={pro.id}
                onClick={() => {
                  setSelectedPro(pro.id);
                  setSelectedDate(dateOptions[0]?.value ?? "");
                  setStep(2);
                }}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-colors text-left",
                  selectedPro === pro.id ? "border-primary bg-primary/5" : "border-border bg-card"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {pro.photo_url ? (
                    <img src={pro.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">{pro.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{pro.name}</p>
                  <p className="text-sm text-muted-foreground">{pro.specialty || "Profissional"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Data</p>
            <div className="grid grid-cols-2 gap-2">
              {dateOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedDate(opt.value)}
                  className={cn(
                    "py-3 rounded-lg border text-sm font-medium transition-colors",
                    selectedDate === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {selectedDate && (
            <div>
              <p className="text-sm font-medium mb-2">Horário</p>
              <div className="grid grid-cols-3 gap-2">
                {slots.length === 0 ? (
                  <p className="text-muted-foreground col-span-3">
                    Nenhum horário disponível nesta data
                  </p>
                ) : (
                  slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      onClick={() => {
                        setSelectedTime(slot.startTime);
                        setStep(3);
                      }}
                      className={cn(
                        "py-3 rounded-lg border text-sm font-medium transition-colors",
                        selectedTime === slot.startTime
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card"
                      )}
                    >
                      {slot.startTime}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Resumo</h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>
                Serviços:{" "}
                {services
                  .filter((s) => selectedServices.includes(s.id))
                  .map((s) => s.name)
                  .join(", ")}
              </p>
              <p>
                Profissional: {professionals.find((p) => p.id === selectedPro)?.name}
              </p>
              <p>
                Horário: {selectedDate} às {selectedTime} · {totalDuration}min
              </p>
              <p>Empresa: {currentCompany.name}</p>
            </div>
            <p className="font-bold text-lg text-primary">Total: R$ {totalPrice.toFixed(2)}</p>
            <Button
              className="w-full py-5 text-lg"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Confirmando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <Check size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold">Agendamento confirmado!</h3>
          <p className="text-muted-foreground">
            Seu horário foi reservado com sucesso.
          </p>
        </div>
      )}

      {step > 0 && step < 4 && (
        <Button variant="ghost" onClick={() => setStep(step - 1)}>
          ← Voltar
        </Button>
      )}
    </div>
  );
};

const ClientBooking = () => (
  <ProtectedRoute>
    <ClientBookingInner />
  </ProtectedRoute>
);

export default ClientBooking;
