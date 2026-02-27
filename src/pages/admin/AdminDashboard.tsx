import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Users, Lock, Unlock, Pencil, Trash2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { companyService } from "@/services/company.service";
import type { Company } from "@/types/database.types";
import { CompanyCreateForm } from "@/components/admin/CompanyCreateForm";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo: "",
    logo_url: "",
    slogan: "",
    phone: "",
    email: "",
    active_from: "",
    active_days: "",
    admin_obs: "",
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await companyService.list();
      if (error) throw new Error((error as { message?: string })?.message ?? "Erro ao carregar empresas");
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      slug: string;
      logo_url?: string;
      cnpj?: string;
      email: string;
      owner_name: string;
      owner_phone: string;
      slogan?: string;
    }) => {
      if (!user?.id) {
        throw new Error("Usuário não autenticado. Faça login novamente.");
      }
      const result = await companyService.create({
        owner_id: user.id,
        ...values,
        slug: values.slug || values.name,
      });
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      setCreating(false);
      toast.success("Empresa cadastrada com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao cadastrar empresa.");
      if (import.meta.env.DEV) console.error("[AdminDashboard] create error:", err);
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
        active_from: form.active_from || null,
        active_days: form.active_days ? parseInt(form.active_days, 10) : null,
        admin_obs: form.admin_obs || null,
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

  const companies = companiesData ?? [];

  return (
    <PageContainer
      title="Empresas"
      description="Gerencie as empresas da plataforma"
      actions={
        <Button className="w-full sm:w-auto" onClick={() => setCreating(true)}>
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
              className="bg-card border border-border rounded-xl p-4 md:p-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between"
            >
              <div className="flex items-start sm:items-center gap-3 md:gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl overflow-hidden">
                  {(company.logo_url ?? company.logo) ? (
                    <img
                      src={(company.logo_url ?? company.logo)!}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "🏢"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{company.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {[company.email, company.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span title="Dia iniciado">
                      Início: {company.active_from ? new Date(company.active_from).toLocaleDateString("pt-BR") : "—"}
                    </span>
                    <span title="Dias ativo">
                      Ativo por: {company.active_days != null ? `${company.active_days} dias` : "—"}
                    </span>
                    {company.admin_obs && (
                      <span className="max-w-[200px] truncate" title={company.admin_obs}>
                        OBS: {company.admin_obs}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-auto flex flex-wrap items-center gap-2 md:gap-3">
                <Badge variant={company.status === "active" ? "default" : "destructive"}>
                  {company.status === "active" ? "Ativo" : "Bloqueado"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial"
                  onClick={() => handleAcessar(company)}
                >
                  <Eye size={14} className="mr-1" /> Acessar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial"
                  onClick={() => navigate(`/owner/companies/${company.id}/team`)}
                >
                  <Users size={14} className="mr-1" /> Equipe
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
                      logo_url: company.logo_url ?? company.logo ?? "",
                      slogan: company.slogan ?? "",
                      phone: company.phone ?? "",
                      email: company.email ?? "",
                      active_from: company.active_from ?? "",
                      active_days: company.active_days != null ? String(company.active_days) : "",
                      admin_obs: company.admin_obs ?? "",
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <CompanyCreateForm
            onSubmit={async (values) => {
              const slug = values.name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "");
              await createMutation.mutateAsync({
                name: values.name,
                slug: slug || values.name,
                email: values.email,
                owner_name: values.owner_name,
                owner_phone: values.owner_phone,
                cnpj: values.cnpj || undefined,
                slogan: values.slogan || undefined,
                logo_url: values.logo_url,
              });
            }}
            onCancel={() => setCreating(false)}
            isLoading={createMutation.isPending}
          />
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
            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium text-muted-foreground">Controle do admin</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="active_from">Dia iniciado</Label>
                  <Input
                    id="active_from"
                    type="date"
                    value={form.active_from}
                    onChange={(e) => setForm((f) => ({ ...f, active_from: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="active_days">Ativo por (dias)</Label>
                  <Input
                    id="active_days"
                    type="number"
                    min={1}
                    placeholder="Ex: 30"
                    value={form.active_days}
                    onChange={(e) => setForm((f) => ({ ...f, active_days: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="admin_obs">OBS</Label>
                  <Textarea
                    id="admin_obs"
                    placeholder="Observações sobre a empresa..."
                    value={form.admin_obs}
                    onChange={(e) => setForm((f) => ({ ...f, admin_obs: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
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
