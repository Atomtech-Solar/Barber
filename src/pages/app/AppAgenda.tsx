import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { bookingService } from "@/services/booking.service";
import { clientService } from "@/services/client.service";
import { professionalService } from "@/services/professional.service";
import { serviceService } from "@/services/service.service";
import { format, addWeeks, subWeeks, startOfWeek, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { Appointment, ProfessionalWithServices, Service } from "@/types/database.types";
import { AppointmentFormModal, type FormValues } from "@/components/app/AppointmentFormModal";
import { CalendarView } from "@/components/app/calendar/CalendarView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const DEFAULT_OPENING_TIME = "09:00";
const DEFAULT_CLOSING_TIME = "19:00";

function parseTime(t: string): Date {
  const [h, m] = (typeof t === "string" ? t.slice(0, 5) : "00:00").split(":").map(Number);
  return setMinutes(setHours(new Date(2000, 0, 1), h), m);
}

const STATUS_LEGEND = [
  { status: "confirmed", label: "Confirmado", className: "bg-blue-600 border-blue-600 text-white" },
  { status: "pending", label: "Pendente", className: "bg-yellow-600 border-yellow-600 text-white" },
  { status: "completed", label: "Concluído", className: "bg-green-600 border-green-600 text-white" },
  { status: "cancelled", label: "Cancelado", className: "bg-red-600 border-red-600 text-white" },
  { status: "blocked", label: "Bloqueado", className: "bg-orange-600 border-orange-600 text-white" },
  { status: "no_show", label: "Não compareceu", className: "bg-amber-800 border-amber-800 text-white" },
] as const;

const AppAgenda = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useTenant();
  const { user } = useAuth();
  const companyId = currentCompany?.id ?? "";
  const openingTime = (currentCompany?.opening_time ?? DEFAULT_OPENING_TIME).slice(0, 5);
  const closingTime = (currentCompany?.closing_time ?? DEFAULT_CLOSING_TIME).slice(0, 5);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [newSlot, setNewSlot] = useState<{
    date: string;
    startTime: string;
    professionalId: string;
    professionalName: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [completeConfirmId, setCompleteConfirmId] = useState<string | null>(null);

  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(addWeeks(weekStart, 1), "yyyy-MM-dd");

  const { data: professionalsData } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: () => professionalService.listByCompanyWithServices(companyId),
    enabled: !!companyId,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services", companyId],
    queryFn: () => serviceService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients", companyId],
    queryFn: () => clientService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["appointments", companyId, startDate, endDate],
    queryFn: () => bookingService.listByCompany(companyId, startDate, endDate),
    enabled: !!companyId,
  });

  const { data: editingAppointment } = useQuery({
    queryKey: ["appointment", editingId],
    queryFn: () => (editingId ? bookingService.getById(editingId) : Promise.resolve({ data: null })),
    enabled: !!editingId,
  });

  const { data: completeConfirmAppointmentData } = useQuery({
    queryKey: ["appointment", completeConfirmId],
    queryFn: () =>
      completeConfirmId ? bookingService.getById(completeConfirmId) : Promise.resolve({ data: null }),
    enabled: !!completeConfirmId,
  });

  const professionals: ProfessionalWithServices[] = professionalsData?.data ?? [];
  const services = servicesData?.data ?? [];
  const clients = clientsData?.data ?? [];
  const appointments = appointmentsData?.data ?? [];

  const recurringClientIds = new Set(
    clients.filter((c) => c.visit_count >= 2).map((c) => c.id)
  );
  const recurringPhones = new Set(
    clients
      .filter((c) => c.visit_count >= 2 && c.phone)
      .map((c) => (c.phone ?? "").replace(/\D/g, ""))
  );
  const isRecurringClient = (apt: Appointment) =>
    (apt.company_client_id && recurringClientIds.has(apt.company_client_id)) ||
    (apt.client_phone &&
      recurringPhones.has((apt.client_phone ?? "").replace(/\D/g, "")));
  const appointment = editingAppointment?.data ?? null;

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const existing = appointments.filter(
        (a) =>
          a.professional_id === values.professional_id &&
          a.date === values.date &&
          a.status !== "cancelled" &&
          a.status !== "no_show"
      );
      const start = parseTime(values.start_time).getTime();
      const end = start + values.duration_minutes * 60 * 1000;
      const overlaps = existing.some((a) => {
        const aStart = parseTime(String(a.start_time).slice(0, 5)).getTime();
        const aEnd = aStart + a.duration_minutes * 60 * 1000;
        return start < aEnd && end > aStart;
      });
      if (overlaps) {
        throw new Error("Este horário conflita com outro agendamento.");
      }
      return bookingService.createAdmin({
        company_id: companyId,
        client_name: values.client_name,
        client_phone: values.client_phone,
        professional_id: values.professional_id,
        date: values.date,
        start_time: values.start_time,
        duration_minutes: values.duration_minutes,
        service_ids: values.service_ids ?? [],
        status: values.status,
        notes: values.notes || null,
        created_by: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      setNewSlot(null);
      toast.success("Agendamento criado!");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao criar agendamento.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!editingId) return Promise.reject(new Error("Nenhum agendamento selecionado"));
      const others = appointments.filter(
        (a) =>
          a.id !== editingId &&
          a.professional_id === values.professional_id &&
          a.date === values.date &&
          a.status !== "cancelled" &&
          a.status !== "no_show"
      );
      const start = parseTime(values.start_time).getTime();
      const end = start + values.duration_minutes * 60 * 1000;
      const overlaps = others.some((a) => {
        const aStart = parseTime(String(a.start_time).slice(0, 5)).getTime();
        const aEnd = aStart + a.duration_minutes * 60 * 1000;
        return start < aEnd && end > aStart;
      });
      if (overlaps) {
        throw new Error("Este horário conflita com outro agendamento.");
      }
      return bookingService.update(editingId, {
        client_name: values.client_name,
        client_phone: values.client_phone,
        professional_id: values.professional_id,
        date: values.date,
        start_time: values.start_time,
        duration_minutes: values.duration_minutes,
        status: values.status,
        notes: values.notes || null,
        service_ids: values.service_ids ?? [],
        updated_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      setEditingId(null);
      toast.success("Agendamento atualizado!");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao atualizar.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bookingService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      setEditingId(null);
      toast.success("Agendamento removido.");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao remover agendamento.");
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      bookingService.update(id, { status: "completed", updated_by: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-performance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-services"] });
      setEditingId(null);
      setCompleteConfirmId(null);
      toast.success("Atendimento concluído! Registro financeiro atualizado.");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao concluir atendimento.");
    },
  });

  const WEEK_DAYS = 7;
  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const weekDays = Array.from({ length: WEEK_DAYS }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return {
      offset: i,
      dateObj: d,
      dateStr: format(d, "yyyy-MM-dd"),
      label: dayLabels[i],
    };
  });
  const mobileDay = weekDays[Math.min(Math.max(selectedDayOffset, 0), WEEK_DAYS - 1)];
  const selectedDate = mobileDay.dateObj;

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const handleEmptySlotClick = (payload: {
    professionalId: string;
    date: string;
    startTime: string;
  }) => {
    const slotDt = new Date(`${payload.date}T${payload.startTime}:00`);
    if (slotDt < new Date()) {
      toast.error("Não é possível agendar em horário passado.");
      return;
    }
    const professional = professionals.find((p) => p.id === payload.professionalId);
    setNewSlot({
      date: payload.date,
      startTime: payload.startTime,
      professionalId: payload.professionalId,
      professionalName: professional?.name ?? "",
    });
  };

  return (
    <PageContainer>
      {/* Legenda + navegação: no desktop ficam na mesma linha (lateral); no mobile a navegação fica embaixo */}
      <div className="w-full flex flex-col gap-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-2 items-center min-w-0">
            {STATUS_LEGEND.map((item) => (
              <span
                key={item.status}
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${item.className}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-current opacity-70 shrink-0" />
                {item.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded border border-amber-400/50 px-2 py-1 text-xs bg-amber-500/20 text-amber-800 dark:text-amber-200">
              <span>★</span>
              Cliente recorrente
            </span>
          </div>
          <div className="flex items-center justify-center md:justify-end gap-2 shrink-0">
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
        </div>
      </div>

      {/* Dias em quadrados (mobile/tablet) */}
      <div className="md:hidden mb-4">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {weekDays.map((d) => {
            const isSelected = d.offset === selectedDayOffset;
            const isToday = d.dateStr === todayStr;
            return (
              <Button
                key={d.dateStr}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="aspect-square flex flex-col gap-0.5 p-1 h-auto"
                onClick={() => setSelectedDayOffset(d.offset)}
              >
                <span className="text-[10px] font-normal opacity-90">{d.label}</span>
                <span className="text-base font-semibold">{format(d.dateObj, "d")}</span>
                {isToday && <span className="text-[10px]">Hoje</span>}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 text-sm text-muted-foreground">
        Visualizando agenda de <span className="font-medium">{mobileDay.label}</span>,{" "}
        {format(selectedDate, "dd/MM/yyyy")} {mobileDay.dateStr === todayStr ? "(hoje)" : ""}
      </div>

      <CalendarView
        date={selectedDate}
        professionals={professionals}
        appointments={appointments as (Appointment & { starts_at?: string | null; ends_at?: string | null })[]}
        openingTime={openingTime}
        closingTime={closingTime}
        onEmptySlotClick={handleEmptySlotClick}
        onEventClick={(appointmentId) => setEditingId(appointmentId)}
      />

      <AppointmentFormModal
        open={!!newSlot}
        onOpenChange={(o) => !o && setNewSlot(null)}
        mode="create"
        initialSlot={
          newSlot
            ? {
                professionalId: newSlot.professionalId,
                professionalName: newSlot.professionalName,
                date: newSlot.date,
                startTime: newSlot.startTime,
              }
            : undefined
        }
        services={services}
        professionals={professionals}
        clients={clients}
        appointments={appointments}
        companyId={companyId}
        createdBy={user?.id ?? ""}
        onSubmit={(v) => createMutation.mutateAsync(v)}
        isLoading={createMutation.isPending}
      />

      <AppointmentFormModal
        open={!!editingId && !!appointment}
        onOpenChange={(o) => !o && setEditingId(null)}
        mode="edit"
        appointment={appointment}
        services={services}
        professionals={professionals}
        clients={clients}
        appointments={appointments}
        companyId={companyId}
        createdBy={user?.id ?? ""}
        onSubmit={(v) => updateMutation.mutateAsync(v)}
        onDelete={(id) => deleteMutation.mutateAsync(id)}
        onComplete={(id) => completeMutation.mutateAsync(id)}
        isLoading={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        isCompleting={completeMutation.isPending}
      />

      <Dialog open={!!completeConfirmId} onOpenChange={(o) => !o && setCompleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Concluir atendimento?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
          {completeConfirmAppointmentData?.data && (() => {
            const apt = completeConfirmAppointmentData.data as Appointment & { service_ids?: string[] };
            const serviceIds = apt.service_ids ?? [];
            const completedServicesList = serviceIds
              .map((id) => services.find((s) => s.id === id))
              .filter((s): s is Service => !!s);
            const totalValue = completedServicesList.reduce(
              (sum, s) => sum + (Number(s.price) ?? 0),
              0
            );
            return (
              <>
                <p className="text-sm text-muted-foreground">Serviços realizados:</p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  {completedServicesList.length > 0 ? (
                    completedServicesList.map((s) => (
                      <li key={s.id}>
                        {s.name} — R$ {Number(s.price).toFixed(2).replace(".", ",")}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">Atendimento</li>
                  )}
                </ul>
                <p className="text-sm font-medium pt-2 border-t">
                  Valor total: R$ {totalValue.toFixed(2).replace(".", ",")}
                </p>
              </>
            );
          })()}
          </div>
          {completeConfirmId && !completeConfirmAppointmentData?.data && (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCompleteConfirmId(null)}
              disabled={completeMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (completeConfirmId) {
                  completeMutation.mutate(completeConfirmId);
                }
              }}
              disabled={completeMutation.isPending || !completeConfirmAppointmentData?.data}
            >
              {completeMutation.isPending ? "Concluindo..." : "Confirmar conclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default AppAgenda;
