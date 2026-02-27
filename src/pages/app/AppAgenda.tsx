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
import type { Appointment, Professional, Service } from "@/types/database.types";
import { AppointmentFormModal, type FormValues } from "@/components/app/AppointmentFormModal";

const SLOT_MINUTES = 30;
const DEFAULT_OPENING_TIME = "09:00";
const DEFAULT_CLOSING_TIME = "19:00";

function parseTime(t: string): Date {
  const [h, m] = (typeof t === "string" ? t.slice(0, 5) : "00:00").split(":").map(Number);
  return setMinutes(setHours(new Date(2000, 0, 1), h), m);
}

function timeToMinutes(t: string): number {
  const [h, m] = (typeof t === "string" ? t.slice(0, 5) : "00:00").split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function timeInRange(slotTime: string, start: string, durationMin: number): boolean {
  const slot = parseTime(slotTime).getTime();
  const startT = parseTime(start).getTime();
  const endT = startT + durationMin * 60 * 1000;
  return slot >= startT && slot < endT;
}

function slotEquals(slotTime: string, start: string): boolean {
  return parseTime(slotTime).getTime() === parseTime(start).getTime();
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
  const openingMinutes = timeToMinutes(openingTime);
  const closingMinutes = timeToMinutes(closingTime);
  const SLOTS =
    closingMinutes > openingMinutes
      ? Array.from(
          { length: Math.floor((closingMinutes - openingMinutes) / SLOT_MINUTES) },
          (_, idx) => minutesToTime(openingMinutes + idx * SLOT_MINUTES)
        )
      : [];
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [newSlot, setNewSlot] = useState<{ date: string; startTime: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(addWeeks(weekStart, 1), "yyyy-MM-dd");

  const { data: professionalsData } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: () => professionalService.listByCompany(companyId),
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

  const professionals = professionalsData?.data ?? [];
  const services = servicesData?.data ?? [];
  const clients = clientsData?.data ?? [];
  const appointments = appointmentsData?.data ?? [];
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

  /** Agendamentos que COBREM este slot (inclui os que estão em andamento) */
  const getAppointmentsCoveringCell = (dateStr: string, slotTime: string): Appointment[] => {
    return appointments.filter(
      (a) =>
        a.date === dateStr &&
        timeInRange(slotTime, String(a.start_time).slice(0, 5), a.duration_minutes) &&
        a.status !== "cancelled" &&
        a.status !== "no_show"
    );
  };

  /** Agendamentos que INICIAM neste slot (para exibir bloco completo) */
  const getAppointmentsStartingInCell = (dateStr: string, slotTime: string): Appointment[] => {
    return getAppointmentsCoveringCell(dateStr, slotTime).filter((a) =>
      slotEquals(slotTime, String(a.start_time).slice(0, 5))
    );
  };

  /** IDs de agendamentos que estão em conflito (mesmo profissional, horários sobrepostos) */
  const getConflictingIds = (): Set<string> => {
    const active = appointments.filter(
      (a) => a.status !== "cancelled" && a.status !== "no_show"
    );
    const ids = new Set<string>();
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      const aStart = parseTime(String(a.start_time).slice(0, 5)).getTime();
      const aEnd = aStart + a.duration_minutes * 60 * 1000;
      for (let j = 0; j < active.length; j++) {
        if (i === j) continue;
        const b = active[j];
        if (a.professional_id !== b.professional_id || a.date !== b.date) continue;
        const bStart = parseTime(String(b.start_time).slice(0, 5)).getTime();
        const bEnd = bStart + b.duration_minutes * 60 * 1000;
        if (aStart < bEnd && aEnd > bStart) {
          ids.add(a.id);
          ids.add(b.id);
        }
      }
    }
    return ids;
  };

  const conflictingIds = getConflictingIds();

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const minutes = now.getHours() * 60 + now.getMinutes();
  const slotIndex = Math.floor((minutes - openingMinutes) / SLOT_MINUTES);
  const currentSlot =
    slotIndex >= 0 && slotIndex < SLOTS.length ? SLOTS[slotIndex] : "";

  const handleCellClick = (dateStr: string, slotTime: string) => {
    const cellApts = getAppointmentsCoveringCell(dateStr, slotTime);
    const startingApts = getAppointmentsStartingInCell(dateStr, slotTime);
    if (startingApts.length > 0) {
      setEditingId(startingApts[0].id);
    } else {
      const slotDt = new Date(`${dateStr}T${slotTime}`);
      if (slotDt < now) {
        toast.error("Não é possível agendar em horário passado.");
        return;
      }
      setNewSlot({ date: dateStr, startTime: slotTime });
    }
  };

  const getStatusVariant = (status: string) => {
    const found = STATUS_LEGEND.find((s) => s.status === status);
    if (found) return found.className;
    return "bg-muted border-muted-foreground/30 text-muted-foreground";
  };

  const getProfessionalName = (profId: string) =>
    professionals.find((p) => p.id === profId)?.name ?? "—";

  return (
    <PageContainer
      title="Agenda"
      description={
        <span className="block">
          Gerencie os agendamentos da equipe
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs">
            {STATUS_LEGEND.map((item) => (
              <span
                key={item.status}
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 ${item.className}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-current opacity-70" />
                {item.label}
              </span>
            ))}
          </div>
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-xs md:text-sm font-medium px-2 md:px-3 min-w-0 md:min-w-[220px] text-center">
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
      }
    >
      <div className="md:hidden mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weekDays.map((d) => {
            const isSelected = d.offset === selectedDayOffset;
            const isToday = d.dateStr === todayStr;
            return (
              <Button
                key={d.dateStr}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => setSelectedDayOffset(d.offset)}
              >
                {d.label} {format(d.dateObj, "d")}
                {isToday ? " · Hoje" : ""}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
              <tr className="border-b border-border bg-muted/30">
                <th className="p-3 text-left text-xs font-medium text-muted-foreground w-[60px]">
                  Horário
                </th>
                {weekDays.map((d) => {
                  const dateStr = d.dateStr;
                  const isToday = dateStr === todayStr;
                  return (
                    <th
                      key={dateStr}
                      className={`p-3 text-center text-sm font-medium border-l border-border min-w-[100px] ${
                        isToday ? "bg-primary/10 text-primary" : ""
                      }`}
                    >
                      <div>{d.label}</div>
                      <div className="text-xs text-muted-foreground">{format(d.dateObj, "d")}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slotTime) => {
                const isNow = todayStr >= startDate && todayStr <= endDate && currentSlot === slotTime;
                return (
                  <tr
                    key={slotTime}
                    className={`border-b border-border last:border-0 ${
                      isNow ? "bg-primary/5" : ""
                    }`}
                  >
                    <td
                      className={`p-2 text-xs text-muted-foreground text-right pr-2 align-top ${
                        isNow ? "font-semibold text-primary" : ""
                      }`}
                    >
                      {slotTime}
                    </td>
                    {weekDays.map((d, dayOffset) => {
                      const dateStr = d.dateStr;
                      const cellApts = getAppointmentsStartingInCell(dateStr, slotTime);
                      const isToday = dateStr === todayStr;

                      return (
                        <td
                          key={dayOffset}
                          className={`p-1 border-l border-border align-top min-h-[48px] ${
                            isToday ? "bg-primary/5" : ""
                          }`}
                        >
                          <div
                            className={`min-h-[44px] rounded-lg border flex flex-col gap-1 p-1 transition-colors ${
                              cellApts.length === 0
                                ? "border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/50 hover:border-muted-foreground/50"
                                : "border-muted-foreground/20 cursor-pointer"
                            }`}
                            onClick={() => handleCellClick(dateStr, slotTime)}
                          >
                            {cellApts.length === 0 ? (
                              <span className="text-[10px] text-muted-foreground self-center m-auto">
                                +
                              </span>
                            ) : (
                              cellApts.map((apt) => {
                                const profName = getProfessionalName(apt.professional_id);
                                const clientName = apt.client_name ?? "Cliente";
                                const isConflict = conflictingIds.has(apt.id);
                                const variant = isConflict
                                  ? "bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-300"
                                  : getStatusVariant(apt.status);
                                return (
                                  <div
                                    key={`${apt.id}-${slotTime}`}
                                    className={`rounded px-2 py-1 text-[10px] cursor-pointer transition-opacity hover:opacity-90 border truncate ${variant}`}
                                    title={isConflict ? "Conflito de horário" : undefined}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingId(apt.id);
                                    }}
                                  >
                                    <p className="font-medium truncate" title={clientName}>
                                      {clientName}
                                    </p>
                                    <p className="opacity-80 truncate" title={profName}>
                                      {profName} · {apt.duration_minutes}min
                                    </p>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden p-3 space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
          {SLOTS.map((slotTime) => {
            const dateStr = mobileDay.dateStr;
            const startingApts = getAppointmentsStartingInCell(dateStr, slotTime);
            const isNow = dateStr === todayStr && currentSlot === slotTime;

            return (
              <div
                key={`${dateStr}-${slotTime}`}
                className={`rounded-lg border p-2 ${isNow ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-medium ${isNow ? "text-primary" : ""}`}>{slotTime}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCellClick(dateStr, slotTime)}
                  >
                    {startingApts.length === 0 ? "Agendar" : "Abrir"}
                  </Button>
                </div>
                {startingApts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Horário livre</p>
                ) : (
                  <div className="space-y-1">
                    {startingApts.map((apt) => {
                      const profName = getProfessionalName(apt.professional_id);
                      const clientName = apt.client_name ?? "Cliente";
                      const isConflict = conflictingIds.has(apt.id);
                      const variant = isConflict
                        ? "bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-300"
                        : getStatusVariant(apt.status);
                      return (
                        <button
                          key={`${apt.id}-${slotTime}-mobile`}
                          className={`w-full text-left rounded px-2 py-1 text-xs border transition-opacity hover:opacity-90 ${variant}`}
                          title={isConflict ? "Conflito de horário" : undefined}
                          onClick={() => setEditingId(apt.id)}
                        >
                          <p className="font-medium truncate">{clientName}</p>
                          <p className="opacity-80 truncate">
                            {profName} · {apt.duration_minutes}min
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AppointmentFormModal
        open={!!newSlot}
        onOpenChange={(o) => !o && setNewSlot(null)}
        mode="create"
        initialSlot={
          newSlot
            ? {
                professionalId: "",
                professionalName: "",
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
        isLoading={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
    </PageContainer>
  );
};

export default AppAgenda;
