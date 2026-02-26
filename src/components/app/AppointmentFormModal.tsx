import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { maskPhone } from "@/lib/masks";
import { setHours, setMinutes, addMinutes, format } from "date-fns";
import type { Appointment, Professional, Service } from "@/types/database.types";
import type { CompanyClientWithVisitCount } from "@/services/client.service";
import type { AppointmentStatus } from "@/types/database.types";

function parseTimeToDate(t: string): Date {
  const [h, m] = (typeof t === "string" ? t.slice(0, 5) : "00:00").split(":").map(Number);
  return setMinutes(setHours(new Date(2000, 0, 1), h), m);
}

function getProfessionalBusyUntil(
  profId: string,
  date: string,
  startTime: string,
  durationMin: number,
  appointments: Appointment[],
  excludeId?: string
): string | null {
  const start = parseTimeToDate(startTime).getTime();
  const end = start + durationMin * 60 * 1000;
  const active = appointments.filter(
    (a) =>
      a.professional_id === profId &&
      a.date === date &&
      a.status !== "cancelled" &&
      a.status !== "no_show" &&
      a.id !== excludeId
  );
  for (const a of active) {
    const aStart = parseTimeToDate(String(a.start_time).slice(0, 5)).getTime();
    const aEnd = aStart + a.duration_minutes * 60 * 1000;
    if (start < aEnd && end > aStart) {
      const endDate = addMinutes(parseTimeToDate(String(a.start_time).slice(0, 5)), a.duration_minutes);
      return format(endDate, "HH:mm");
    }
  }
  return null;
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "confirmed", label: "Confirmado" },
  { value: "pending", label: "Pendente" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
  { value: "blocked", label: "Bloqueado" },
  { value: "no_show", label: "Não compareceu" },
];

interface AppointmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Para create: slot clicado (professionalId opcional - usuário escolhe no form) */
  initialSlot?: { professionalId?: string; professionalName?: string; date: string; startTime: string };
  /** Para edit */
  appointment?: Appointment & { service_ids?: string[] } | null;
  services: Service[];
  professionals: Professional[];
  clients?: CompanyClientWithVisitCount[];
  appointments?: Appointment[];
  companyId: string;
  createdBy: string;
  onSubmit: (values: FormValues) => Promise<void>;
  onDelete?: (appointmentId: string) => Promise<void>;
  isLoading?: boolean;
  isDeleting?: boolean;
}

export interface FormValues {
  client_name: string;
  client_phone: string;
  service_ids: string[];
  professional_id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string;
}

export function AppointmentFormModal({
  open,
  onOpenChange,
  mode,
  initialSlot,
  appointment,
  services,
  professionals,
  clients = [],
  appointments = [],
  companyId,
  createdBy,
  onSubmit,
  onDelete,
  isLoading,
  isDeleting,
}: AppointmentFormModalProps) {
  const isCreate = mode === "create";

  const defaultService = services[0];
  const defaultDuration = defaultService?.duration_minutes ?? 30;

  const getDefaultValues = (): FormValues => {
    if (isCreate && initialSlot) {
      const svcIds = defaultService?.id ? [defaultService.id] : [];
      return {
        client_name: "",
        client_phone: "",
        service_ids: svcIds,
        professional_id: initialSlot.professionalId ?? professionals[0]?.id ?? "",
        date: initialSlot.date,
        start_time: initialSlot.startTime,
        duration_minutes: defaultDuration,
        status: "confirmed",
        notes: "",
      };
    }
    if (appointment) {
      const displayName = appointment.client_name ?? "—";
      const displayPhone = appointment.client_phone ?? "";
      const svcIds = (appointment as { service_ids?: string[] }).service_ids ?? (defaultService?.id ? [defaultService.id] : []);
      return {
        client_name: displayName,
        client_phone: displayPhone,
        service_ids: svcIds,
        professional_id: appointment.professional_id,
        date: appointment.date,
        start_time: String(appointment.start_time).slice(0, 5),
        duration_minutes: appointment.duration_minutes,
        status: appointment.status as AppointmentStatus,
        notes: appointment.notes ?? "",
      };
    }
    return {
      client_name: "",
      client_phone: "",
      service_ids: defaultService?.id ? [defaultService.id] : [],
      professional_id: professionals[0]?.id ?? "",
      date: "",
      start_time: "",
      duration_minutes: defaultDuration,
      status: "confirmed",
      notes: "",
    };
  };

  const [values, setValues] = useState<FormValues>(getDefaultValues);

  const getInitialClientSelectValue = (): string => {
    const v = getDefaultValues();
    if (!v.client_name && !v.client_phone) return "";
    const match = clients.find(
      (c) =>
        (c.full_name || "").trim() === (v.client_name || "").trim() &&
        (c.phone || "").replace(/\D/g, "") === (v.client_phone || "").replace(/\D/g, "")
    );
    return match?.id ?? "__other__";
  };

  const [clientSelectValue, setClientSelectValue] = useState(getInitialClientSelectValue);

  useEffect(() => {
    if (open) {
      setValues(getDefaultValues());
      setClientSelectValue(getInitialClientSelectValue());
    }
  }, [open, isCreate, initialSlot?.date, initialSlot?.startTime, appointment?.id]);

  const duration = values.service_ids.reduce(
    (acc, sid) => acc + (services.find((s) => s.id === sid)?.duration_minutes ?? 0),
    0
  );

  const handleClientSelect = (value: string) => {
    setClientSelectValue(value);
    if (value === "__other__") {
      setValues((v) => ({ ...v, client_name: "", client_phone: "" }));
      return;
    }
    const c = clients.find((x) => x.id === value);
    if (c) {
      setValues((v) => ({
        ...v,
        client_name: c.full_name,
        client_phone: c.phone ?? "",
      }));
    }
  };

  const toggleService = (serviceId: string) => {
    setValues((v) => {
      const has = v.service_ids.includes(serviceId);
      const next = has
        ? v.service_ids.filter((id) => id !== serviceId)
        : [...v.service_ids, serviceId];
      const dur = next.reduce(
        (acc, sid) => acc + (services.find((s) => s.id === sid)?.duration_minutes ?? 0),
        0
      );
      return { ...v, service_ids: next, duration_minutes: dur || 30 };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (values.service_ids.length === 0) return;
    if (!values.client_name?.trim()) return;
    await onSubmit({ ...values, duration_minutes: duration });
    onOpenChange(false);
  };

  const isPast = () => {
    const d = values.date;
    const t = values.start_time;
    if (!d || !t) return false;
    const slot = new Date(`${d}T${t}`);
    return slot < new Date();
  };

  const isSelectedProfessionalBusy = () => {
    if (!values.professional_id || !values.date || !values.start_time) return false;
    return !!getProfessionalBusyUntil(
      values.professional_id,
      values.date,
      values.start_time,
      duration,
      appointments,
      appointment?.id
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Novo Agendamento" : "Editar Agendamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Qual cliente será atendido? *</Label>
            <Select
              value={clientSelectValue}
              onValueChange={handleClientSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </SelectItem>
                ))}
                <SelectItem value="__other__">Outro (informar manualmente)</SelectItem>
              </SelectContent>
            </Select>
            {clientSelectValue === "__other__" && (
              <div className="grid grid-cols-[1fr_180px] gap-3 mt-2">
                <Input
                  id="client_name"
                  value={values.client_name}
                  onChange={(e) => setValues((v) => ({ ...v, client_name: e.target.value }))}
                  placeholder="Nome do cliente"
                  required={clientSelectValue === "__other__"}
                />
                <Input
                  id="client_phone"
                  value={values.client_phone}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, client_phone: maskPhone(e.target.value) }))
                  }
                  placeholder="(00) 00000-0000"
                  required={clientSelectValue === "__other__"}
                />
              </div>
            )}
            {clients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum cliente cadastrado. Cadastre na aba Clientes ou use &quot;Outro&quot; para informar manualmente.
              </p>
            )}
          </div>

          {/* Funcionário */}
          <div>
            <Label>Qual funcionário vai atender? *</Label>
            <Select
              value={values.professional_id}
              onValueChange={(id) => setValues((v) => ({ ...v, professional_id: id }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((p) => {
                  const busyUntil = getProfessionalBusyUntil(
                    p.id,
                    values.date,
                    values.start_time,
                    duration,
                    appointments,
                    appointment?.id
                  );
                  const isDisabled = !!busyUntil;
                  return (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      disabled={isDisabled}
                      className={isDisabled ? "opacity-60" : ""}
                    >
                      {isDisabled
                        ? `${p.name} — indisponível até ${busyUntil}`
                        : p.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {values.professional_id && (() => {
              const busyUntil = getProfessionalBusyUntil(
                values.professional_id,
                values.date,
                values.start_time,
                duration,
                appointments,
                appointment?.id
              );
              return busyUntil ? (
                <p className="mt-1.5 text-sm text-destructive">
                  Este funcionário está em atendimento até {busyUntil}. Selecione outro ou altere o horário.
                </p>
              ) : null;
            })()}
          </div>

          {/* Serviços (pode escolher mais de um) */}
          <div>
            <Label>Serviços * (ex: Corte + Barba)</Label>
            <div className="mt-2 flex flex-wrap gap-4 rounded-lg border border-input p-4">
              {services.map((s) => {
                const checked = values.service_ids.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleService(s.id)}
                    />
                    <span>
                      {s.name} · {s.duration_minutes}min · R$ {Number(s.price).toFixed(2)}
                    </span>
                  </label>
                );
              })}
            </div>
            {values.service_ids.length === 0 && (
              <p className="mt-1 text-xs text-destructive">
                Selecione ao menos um serviço
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
              <Select
                value={values.status}
                onValueChange={(v) =>
                  setValues((prev) => ({ ...prev, status: v as AppointmentStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={values.date}
                onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="start_time">Horário</Label>
              <Input
                id="start_time"
                type="time"
                value={values.start_time}
                onChange={(e) =>
                  setValues((v) => ({ ...v, start_time: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label>Duração</Label>
              <Input value={`${duration} min`} readOnly className="bg-muted" />
            </div>
          </div>

          {/* Observação - em baixo */}
          <div className="border-t pt-4">
            <Label htmlFor="notes">Observação</Label>
            <Textarea
              id="notes"
              value={values.notes}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
              placeholder="Ex: cliente prefere tesoura, alergia a produto, atraso permitido..."
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div>
              {mode === "edit" && appointment && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(appointment.id)}
                  disabled={isLoading || isDeleting}
                >
                  <Trash2 size={16} className="mr-2" />
                  {isDeleting ? "Removendo..." : "Remover"}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || isPast() || isSelectedProfessionalBusy() || values.service_ids.length === 0 || !values.client_name?.trim()}>
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
