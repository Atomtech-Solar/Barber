import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Lock, Unlock, Pencil, Trash2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { companyService } from "@/services/company.service";
import type { Company } from "@/types/database.types";
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { setCurrentCompany } = useTenant();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo: "",
    slogan: "",
    phone: "",
    email: "",
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companyService.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      companyService.create({
        name: form.name,
        slug: form.slug || form.name,
        logo: form.logo || undefined,
        slogan: form.slogan || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setCreating(false);
      setForm({ name: "", slug: "", logo: "", slogan: "", phone: "", email: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      companyService.update(editing!.id, {
        name: form.name,
        slug: form.slug,
        logo: form.logo || undefined,
        slogan: form.slogan || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setEditing(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (company: Company) =>
      companyService.update(company.id, {
        status: company.status === "active" ? "blocked" : "active",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setDeleting(null);
    },
  });

  const handleAcessar = (company: Company) => {
    setCurrentCompany(company);
    navigate("/app");
  };

  const companies = companiesData?.data ?? [];

  return (
    <PageContainer
      title="Empresas"
      description="Gerencie as empresas da plataforma"
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} className="mr-2" />
          Nova Empresa
        </Button>
      }
    >
      <div className="grid gap-4">
        {companies.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            Nenhuma empresa cadastrada. Crie a primeira!
          </p>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="bg-card border border-border rounded-xl p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                  {company.logo || "🏢"}
                </div>
                <div>
                  <h3 className="font-semibold">{company.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {[company.email, company.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={company.status === "active" ? "default" : "destructive"}>
                  {company.status === "active" ? "Ativo" : "Bloqueado"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAcessar(company)}
                >
                  <Eye size={14} className="mr-1" /> Acessar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title={company.status === "active" ? "Bloquear" : "Ativar"}
                  onClick={() => toggleStatusMutation.mutate(company)}
                >
                  {company.status === "active" ? (
                    <Lock size={14} />
                  ) : (
                    <Unlock size={14} />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(company);
                    setForm({
                      name: company.name,
                      slug: company.slug,
                      logo: company.logo ?? "",
                      slogan: company.slogan ?? "",
                      phone: company.phone ?? "",
                      email: company.email ?? "",
                    });
                  }}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setDeleting(company)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  }))
                }
                placeholder="Nome da empresa"
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="empresa-nome"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="contato@empresa.com"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(11) 99999-0000"
              />
            </div>
            <div>
              <Label>Slogan (opcional)</Label>
              <Input
                value={form.slogan}
                onChange={(e) => setForm((f) => ({ ...f, slogan: e.target.value }))}
                placeholder="Seu estilo, nossa arte"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || !form.slug}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
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
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Slogan</Label>
              <Input
                value={form.slogan}
                onChange={(e) => setForm((f) => ({ ...f, slogan: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!form.name || !form.slug}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados da empresa serão perdidos.
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

export default AdminDashboard;
