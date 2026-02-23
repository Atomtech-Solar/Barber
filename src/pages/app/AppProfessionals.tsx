import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { professionalService } from "@/services/professional.service";
import { serviceService } from "@/services/service.service";
import type { Professional } from "@/types/database.types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

const AppProfessionals = () => {
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Professional | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Professional | null>(null);
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    photo_url: "",
    serviceIds: [] as string[],
    workingHours: DAYS.map((d) => ({
      day_of_week: d.value,
      start_time: "09:00",
      end_time: "18:00",
    })),
  });

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

  const professionals = (professionalsData?.data ?? []) as (Professional & {
    professional_services?: { service_id: string }[];
  })[];
  const services = servicesData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      professionalService.create(
        {
          company_id: companyId,
          name: form.name,
          specialty: form.specialty || undefined,
          photo_url: form.photo_url || undefined,
        },
        form.serviceIds,
        form.workingHours
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals", companyId] });
      setCreating(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      professionalService.update(
        editing!.id,
        {
          name: form.name,
          specialty: form.specialty || undefined,
          photo_url: form.photo_url || undefined,
        },
        form.serviceIds,
        form.workingHours
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals", companyId] });
      setEditing(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      professionalService.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals", companyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => professionalService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals", companyId] });
      setDeleting(null);
    },
  });

  const resetForm = () =>
    setForm({
      name: "",
      specialty: "",
      photo_url: "",
      serviceIds: [],
      workingHours: DAYS.map((d) => ({
        day_of_week: d.value,
        start_time: "09:00",
        end_time: "18:00",
      })),
    });

  return (
    <PageContainer
      title="Profissionais"
      description="Cadastre e gerencie sua equipe"
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} className="mr-2" />
          Novo Profissional
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {professionals.map((p) => (
          <div
            key={p.id}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              <Avatar>
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} />
                ) : (
                  <AvatarFallback>{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.specialty || "—"}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: p.id, is_active: !!checked })
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {p.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(p);
                  setForm({
                    name: p.name,
                    specialty: p.specialty ?? "",
                    photo_url: p.photo_url ?? "",
                    serviceIds:
                      p.professional_services?.map((s) => s.service_id) ?? [],
                    workingHours: DAYS.map((d) => ({
                      day_of_week: d.value,
                      start_time: "09:00",
                      end_time: "18:00",
                    })),
                  });
                }}
              >
                <Pencil size={14} className="mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setDeleting(p)}
              >
                <Trash2 size={14} className="mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Profissional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Especialidade</Label>
              <Input
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                placeholder="Ex: Barbeiro"
              />
            </div>
            <div>
              <Label>Foto (URL)</Label>
              <Input
                value={form.photo_url}
                onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Serviços que realiza</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={form.serviceIds.includes(s.id)}
                      onCheckedChange={(c) =>
                        setForm((f) => ({
                          ...f,
                          serviceIds: c
                            ? [...f.serviceIds, s.id]
                            : f.serviceIds.filter((id) => id !== s.id),
                        }))
                      }
                    />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Especialidade</Label>
              <Input
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
              />
            </div>
            <div>
              <Label>Foto (URL)</Label>
              <Input
                value={form.photo_url}
                onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
              />
            </div>
            <div>
              <Label>Serviços que realiza</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={form.serviceIds.includes(s.id)}
                      onCheckedChange={(c) =>
                        setForm((f) => ({
                          ...f,
                          serviceIds: c
                            ? [...f.serviceIds, s.id]
                            : f.serviceIds.filter((id) => id !== s.id),
                        }))
                      }
                    />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!form.name}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir profissional?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
};

export default AppProfessionals;
