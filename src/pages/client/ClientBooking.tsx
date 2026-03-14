import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { serviceService } from "@/services/service.service";
import { professionalService } from "@/services/professional.service";
import { bookingService } from "@/services/booking.service";
import { authService } from "@/services/auth.service";
import {
  BookingSteps,
  BookingServiceSelect,
  BookingProfessionalSelect,
  BookingCalendar,
  BookingTimeSlots,
  BookingClientForm,
  BookingSummary,
  type ClientFormData,
} from "@/components/booking";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const INITIAL_CLIENT_FORM: ClientFormData = {
  name: "",
  phone: "",
  email: "",
  wantsAccount: false,
  password: "",
};

const ClientBookingInner = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companySlug = searchParams.get("company");
  const { user, initialized } = useAuth();
  const { currentCompany, setCurrentCompanyBySlug, isLoading: tenantLoading } =
    useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPro, setSelectedPro] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState<ClientFormData>(INITIAL_CLIENT_FORM);

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
      professionalService.getProfessionalsByServiceIds(
        companyId,
        selectedServices.length > 0 ? selectedServices : []
      ),
    enabled: !!companyId && step >= 1,
  });

  // Sem serviço selecionado: lista todos os profissionais da empresa
  const { data: allProsData } = useQuery({
    queryKey: ["professionals-all", companyId],
    queryFn: () => professionalService.listByCompany(companyId),
    enabled: !!companyId && selectedServices.length === 0 && step === 1,
  });

  const professionals =
    selectedServices.length > 0
      ? (professionalsData?.data ?? [])
      : (allProsData?.data ?? []);

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

  const selectedDateStr = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : "";

  const { data: slotsData } = useQuery({
    queryKey: [
      "slots",
      companyId,
      selectedPro,
      selectedDateStr,
      selectedServices,
    ],
    queryFn: () =>
      selectedPro && selectedDateStr && selectedServices.length > 0
        ? bookingService.getAvailableSlots(
            companyId,
            selectedPro,
            selectedDateStr,
            selectedServices,
            serviceDurations
          )
        : Promise.resolve({ data: [] }),
    enabled:
      !!companyId &&
      !!selectedPro &&
      !!selectedDateStr &&
      selectedServices.length > 0,
  });

  const slots = slotsData?.data ?? [];
  const selectedServiceNames = services
    .filter((s) => selectedServices.includes(s.id))
    .map((s) => s.name)
    .join(", ");
  const selectedProName = professionals.find((p) => p.id === selectedPro)?.name;

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company_id: companyId,
        professional_id: selectedPro!,
        date: selectedDateStr,
        start_time: selectedTime!,
        duration_minutes: totalDuration,
        service_ids: selectedServices,
        client_name: clientForm.name,
        client_phone: clientForm.phone,
        client_email: clientForm.email || undefined,
      };
      if (import.meta.env.DEV) {
        console.log("[ClientBooking] company_id:", companyId);
        console.log("[ClientBooking] appointment payload:", payload);
      }

      const wantsAccount =
        !user && clientForm.wantsAccount && clientForm.password.length >= 6;

      if (wantsAccount) {
        const email = clientForm.email?.trim();
        if (!email) throw new Error("Email é obrigatório para criar conta.");
        const { data: signUpData, error: signUpError } =
          await authService.signUp({
            email,
            password: clientForm.password,
            fullName: clientForm.name,
            phone: clientForm.phone,
            role: "client",
            company_name: currentCompany?.name,
            company_slug: currentCompany?.slug,
          });
        if (signUpError || !signUpData?.user) {
          throw new Error(
            signUpError?.message ?? "Falha ao criar conta. Tente novamente."
          );
        }

        const session = signUpData.session;
        if (session) {
          const { supabase } = await import("@/lib/supabase");
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        }

        if (session && companyId) {
          try {
            const { clientService } = await import("@/services/client.service");
            await clientService.linkUserToCompany(companyId, {
              full_name: clientForm.name,
              phone: clientForm.phone,
              email: clientForm.email || undefined,
            });
          } catch (linkErr) {
            if (import.meta.env.DEV) {
              console.warn("[ClientBooking] linkUserToCompany:", linkErr);
            }
          }
        }

        if (session) {
          return bookingService.createClientBooking(payload, signUpData.user.id);
        }
        return bookingService.createClientBooking(payload, null);
      }

      if (user && companyId) {
        const { clientService } = await import("@/services/client.service");
        await clientService.linkUserToCompany(companyId, {
          full_name: clientForm.name,
          phone: clientForm.phone,
          email: clientForm.email || undefined,
        });
      }
      return bookingService.createClientBooking(payload, user?.id ?? null);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.error.message,
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      queryClient.invalidateQueries({ queryKey: ["clients", companyId] });
      setStep(6);
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: err.message,
      });
    },
  });

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (!clientForm.name.trim()) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Informe seu nome para continuar.",
      });
      return;
    }
    if (!clientForm.phone.trim()) {
      toast({
        variant: "destructive",
        title: "Telefone obrigatório",
        description: "Informe seu telefone para continuar.",
      });
      return;
    }
    if (clientForm.wantsAccount && !user) {
      if (!clientForm.email?.trim()) {
        toast({
          variant: "destructive",
          title: "Email obrigatório",
          description: "Informe seu email para criar a conta.",
        });
        return;
      }
      if (clientForm.password.length < 6) {
        toast({
          variant: "destructive",
          title: "Senha inválida",
          description: "A senha deve ter no mínimo 6 caracteres.",
        });
        return;
      }
    }
    createMutation.mutate();
  };

  if (!initialized || tenantLoading) {
    return (
      <div className="flex min-h-[200px] md:min-h-[280px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (!currentCompany) {
    return (
      <div className="flex min-h-[200px] md:min-h-[280px] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground max-w-md">
          Selecione uma empresa para agendar. Acesse pelo link de agendamento da
          empresa.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Voltar ao início
        </Button>
      </div>
    );
  }

  // Sucesso
  if (step === 6) {
    return (
      <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center max-w-md mx-auto">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
          <Check size={40} className="text-green-600" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold">Agendamento confirmado!</h2>
        <p className="mt-2 text-muted-foreground">
          Seu horário foi reservado com sucesso.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          {user && (
            <Button onClick={() => navigate("/client/appointments")}>
              Ver meus agendamentos
            </Button>
          )}
          <Button
            variant={user ? "outline" : "default"}
            onClick={() => {
              setStep(0);
              setSelectedServices([]);
              setSelectedPro(null);
              setSelectedDate(undefined);
              setSelectedTime(null);
              setClientForm(INITIAL_CLIENT_FORM);
            }}
          >
            Fazer outro agendamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr,minmax(280px,360px)] lg:gap-8 xl:gap-10 gap-6 pb-24 md:pb-8">
      <div className="w-full space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Agendar</h1>
          <p className="mt-1 text-muted-foreground">
            {currentCompany.name}
          </p>
        </div>

        <BookingSteps currentStep={step} />

        {/* Passo 0: Serviço */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <BookingServiceSelect
              services={services}
              selectedIds={selectedServices}
              onToggle={toggleService}
            />
            {selectedServices.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border bg-card p-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total: {totalDuration} min
                  </p>
                  <p className="text-lg font-bold text-primary">
                    R$ {totalPrice.toFixed(2)}
                  </p>
                </div>
                <Button size="lg" onClick={() => setStep(1)}>
                  Continuar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Passo 1: Profissional */}
        {step === 1 && (
          <div className="w-full space-y-4 animate-fade-in">
            {prosLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : professionals.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhum profissional disponível. Selecione outro serviço.
              </p>
            ) : (
              <BookingProfessionalSelect
                professionals={professionals}
                selectedId={selectedPro}
                onSelect={(id) => {
                  setSelectedPro(id);
                  setStep(2);
                }}
              />
            )}
            <Button variant="ghost" onClick={() => setStep(0)}>
              ← Voltar
            </Button>
          </div>
        )}

        {/* Passo 2: Data */}
        {step === 2 && (
          <div className="w-full space-y-4 animate-fade-in">
            <div className="w-full">
                <BookingCalendar
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setSelectedTime(null);
                }}
              />
            </div>
            {selectedDate && (
              <Button
                className="w-full"
                onClick={() => setStep(3)}
              >
                Continuar
              </Button>
            )}
            <Button variant="ghost" onClick={() => setStep(1)}>
              ← Voltar
            </Button>
          </div>
        )}

        {/* Passo 3: Horário */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <p className="mb-2 text-sm font-medium">Horário disponível</p>
              <BookingTimeSlots
                slots={slots}
                selected={selectedTime}
                onSelect={(time) => {
                  setSelectedTime(time);
                  setStep(4);
                }}
              />
            </div>
            <Button variant="ghost" onClick={() => setStep(2)}>
              ← Voltar
            </Button>
          </div>
        )}

        {/* Passo 4: Dados do cliente */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <BookingClientForm
              value={clientForm}
              onChange={setClientForm}
              isLoggedIn={!!user}
            />
            <Button className="w-full" size="lg" onClick={() => setStep(5)}>
              Continuar
            </Button>
            <Button variant="ghost" onClick={() => setStep(3)}>
              ← Voltar
            </Button>
          </div>
        )}

        {/* Passo 5: Confirmação */}
        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <BookingSummary
              companyName={currentCompany.name}
              serviceName={selectedServiceNames}
              professionalName={selectedProName}
              clientName={clientForm.name?.trim() || undefined}
              clientPhone={clientForm.phone?.trim() || undefined}
              date={selectedDateStr}
              time={selectedTime ?? undefined}
              duration={totalDuration}
              totalPrice={totalPrice}
            />
            <Button
              className="w-full py-6 text-lg"
              size="lg"
              onClick={handleConfirm}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? "Confirmando..."
                : "Confirmar agendamento"}
            </Button>
            <Button variant="ghost" onClick={() => setStep(4)}>
              ← Voltar
            </Button>
          </div>
        )}
      </div>

      {/* Resumo: mobile abaixo do conteúdo | desktop sticky à direita */}
      {step > 0 && step < 6 && (
        <div className="w-full shrink-0 lg:sticky lg:top-6 lg:self-start lg:order-2">
          <BookingSummary
            companyName={currentCompany.name}
            serviceName={step >= 1 ? selectedServiceNames || undefined : undefined}
            professionalName={step >= 2 ? selectedProName : undefined}
            clientName={step >= 5 ? clientForm.name?.trim() || undefined : undefined}
            clientPhone={step >= 5 ? clientForm.phone?.trim() || undefined : undefined}
            date={step >= 3 ? selectedDateStr || undefined : undefined}
            time={step >= 4 ? selectedTime ?? undefined : undefined}
            duration={step >= 4 ? totalDuration : undefined}
            totalPrice={step >= 4 ? totalPrice : undefined}
            compact
          />
        </div>
      )}
    </div>
  );
};

/** Página de agendamento: acessível sem login (walk-in) ou com conta */
const ClientBooking = () => <ClientBookingInner />;

export default ClientBooking;
