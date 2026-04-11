import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Clock, Plus, Pencil, Trash2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { serviceService } from "@/services/service.service";
import type { Service } from "@/types/database.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const AppServices = () => {
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: "", duration_minutes: 30, price: 0, category: "" });

  const { data: servicesData } = useQuery({
    queryKey: ["services", companyId],
    queryFn: () => serviceService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      serviceService.create({
        company_id: companyId,
        name: form.name,
        duration_minutes: form.duration_minutes,
        price: form.price,
        category: form.category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", companyId] });
      setCreating(false);
      setForm({ name: "", duration_minutes: 30, price: 0, category: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      serviceService.update(editing!.id, {
        name: form.name,
        duration_minutes: form.duration_minutes,
        price: form.price,
        category: form.category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", companyId] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serviceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", companyId] });
      setDeleting(null);
    },
  });

  const services = servicesData?.data ?? [];

  return (
    <PageContainer
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} className="mr-2" />
          Novo Serviço
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div
            key={s.id}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
          >
            <h3 className="font-semibold mb-2">{s.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
              <Clock size={14} /> {s.duration_minutes}min
            </div>
            <p className="text-xl font-bold text-primary mb-3">R$ {Number(s.price).toFixed(2)}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(s);
                  setForm({
                    name: s.name,
                    duration_minutes: s.duration_minutes,
                    price: Number(s.price),
                    category: s.category ?? "",
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
                onClick={() => setDeleting(s)}
              >
                <Trash2 size={14} className="mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Corte Masculino"
              />
            </div>
            <div>
              <Label>Duração (minutos)</Label>
              <Input
                type="number"
                min={1}
                value={form.duration_minutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <Label>Categoria (opcional)</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Ex: Corte"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || form.duration_minutes <= 0 || form.price < 0}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
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
              <Label>Duração (minutos)</Label>
              <Input
                type="number"
                min={1}
                value={form.duration_minutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <Label>Categoria (opcional)</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!form.name || form.duration_minutes <= 0 || form.price < 0}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
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

export default AppServices;
