import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import { useTenant } from "@/contexts/TenantContext";
import { clientService } from "@/services/client.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, MoreHorizontal, Pencil, Trash2, History } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { CompanyClientWithVisitCount } from "@/services/client.service";
import { ClientFormModal } from "@/components/app/ClientFormModal";
import { ClientHistorySheet } from "@/components/app/ClientHistorySheet";

const AppClients = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CompanyClientWithVisitCount | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyClientId, setHistoryClientId] = useState<string | null>(null);

  const { data: clientsData, error: listError, isLoading: listLoading } = useQuery({
    queryKey: ["clients", companyId],
    queryFn: () => clientService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const clients = clientsData?.data ?? [];
  const hasListError = !!listError || !!clientsData?.error;

  const createMutation = useMutation({
    mutationFn: (v: { full_name: string; phone: string; email: string; cpf: string; notes: string }) =>
      clientService.create(companyId, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setModalOpen(false);
      toast.success("Cliente adicionado!");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao adicionar cliente.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: { full_name: string; phone: string; email: string; cpf: string; notes: string };
    }) => clientService.update(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditingClient(null);
      toast.success("Cliente atualizado!");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao atualizar.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDeletingId(null);
      toast.success("Cliente removido.");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao remover.");
    },
  });

  return (
    <>
      <PageContainer
        title="Clientes"
        description="Clique em um cliente para ver o histórico. Cadastre e gerencie os clientes da empresa."
        actions={
          <Button onClick={() => setModalOpen(true)} disabled={!companyId}>
            <Plus size={16} className="mr-2" />
            Adicionar cliente
          </Button>
        }
      >
        {!companyId && (
          <p className="text-sm text-muted-foreground mb-4">
            Selecione uma empresa para ver os clientes.
          </p>
        )}
        {hasListError && (
          <p className="text-sm text-destructive mb-4">
            Erro ao carregar clientes: {(listError as Error)?.message ?? clientsData?.error?.message}
          </p>
        )}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Visitas</TableHead>
                <TableHead>Último atendimento</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    Carregando clientes...
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    {companyId
                      ? "Nenhum cliente cadastrado. Clique em \"Adicionar cliente\" para começar."
                      : "Selecione uma empresa acima para ver os clientes."}
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((c) => (
                  <TableRow
                    key={c.id}
                    className="hover:bg-secondary/50 cursor-pointer"
                    onClick={() => setHistoryClientId(c.id)}
                  >
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                    <TableCell>{c.visit_count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.last_visit
                        ? format(parseISO(c.last_visit), "d MMM yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.cpf ?? "—"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setHistoryClientId(c.id)}>
                            <History size={14} className="mr-2" />
                            Ver histórico
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingClient(c)}>
                            <Pencil size={14} className="mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletingId(c.id)}
                          >
                            <Trash2 size={14} className="mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PageContainer>

      <ClientFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode="create"
        onSubmit={(v) => createMutation.mutateAsync(v)}
        isLoading={createMutation.isPending}
      />

      <ClientFormModal
        open={!!editingClient}
        onOpenChange={(o) => !o && setEditingClient(null)}
        mode="edit"
        client={editingClient}
        onSubmit={(v) =>
          editingClient && updateMutation.mutateAsync({ id: editingClient.id, values: v })
        }
        isLoading={updateMutation.isPending}
      />

      <ClientHistorySheet
        open={!!historyClientId}
        onOpenChange={(o) => !o && setHistoryClientId(null)}
        companyId={companyId}
        companyClientId={historyClientId}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente será removido do cadastro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppClients;
