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
import { maskPhone, maskCpf } from "@/lib/masks";
import type { CompanyClient } from "@/types/database.types";

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  client?: CompanyClient | null;
  onSubmit: (values: { full_name: string; phone: string; email: string; cpf: string; notes: string }) => Promise<void>;
  isLoading?: boolean;
}

export function ClientFormModal({
  open,
  onOpenChange,
  mode,
  client,
  onSubmit,
  isLoading,
}: ClientFormModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && client) {
        setFullName(client.full_name ?? "");
        setPhone(client.phone ?? "");
        setEmail(client.email ?? "");
        setCpf(client.cpf ?? "");
        setNotes(client.notes ?? "");
      } else {
        setFullName("");
        setPhone("");
        setEmail("");
        setCpf("");
        setNotes("");
      }
    }
  }, [open, mode, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    await onSubmit({ full_name: fullName.trim(), phone, email, cpf, notes });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Cliente" : "Editar Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Nome *</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome completo"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cpf">CPF (opcional)</Label>
            <Input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              placeholder="000.000.000-00"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: preferências, alergias..."
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
