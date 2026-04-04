import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Recado, RecadoPrioridade } from "@/types/database.types";
import { MentionTextarea } from "@/components/mural/MentionTextarea";
import type { MentionCandidate } from "@/lib/mural-mentions";

const PRIORIDADE_OPTIONS: { value: RecadoPrioridade; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "importante", label: "Importante" },
  { value: "urgente", label: "Urgente" },
];

export type RecadoModalMode = "create" | "edit";

interface RecadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: RecadoModalMode;
  recado?: Recado | null;
  defaultAutor: string;
  isSubmitting: boolean;
  /** Membros da empresa para @menções (create e edit da mensagem) */
  mentionCandidates: MentionCandidate[];
  onSubmit: (values: {
    titulo: string;
    mensagem: string;
    prioridade: RecadoPrioridade;
    fixado: boolean;
  }) => void;
}

export function RecadoModal({
  open,
  onOpenChange,
  mode,
  recado,
  defaultAutor,
  isSubmitting,
  mentionCandidates,
  onSubmit,
}: RecadoModalProps) {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [prioridade, setPrioridade] = useState<RecadoPrioridade>("normal");
  const [fixado, setFixado] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && recado) {
      setTitulo(recado.titulo);
      setMensagem(recado.mensagem);
      setPrioridade(recado.prioridade);
      setFixado(recado.fixado);
    } else {
      setTitulo("");
      setMensagem("");
      setPrioridade("normal");
      setFixado(false);
    }
  }, [open, mode, recado]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim()) return;
    onSubmit({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      prioridade,
      fixado,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-theme">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo recado" : "Editar recado"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "create" && (
            <div>
              <Label htmlFor="recado-autor">Autor</Label>
              <Input
                id="recado-autor"
                value={defaultAutor}
                readOnly
                className="mt-1 bg-muted/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nome exibido no mural (seu perfil).
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="recado-titulo">Título *</Label>
            <Input
              id="recado-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Lembrete da reunião"
              className="mt-1"
              maxLength={200}
              required
            />
          </div>
          <div>
            <Label htmlFor="recado-mensagem">Mensagem *</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">
              Digite @ para mencionar alguém ou avisar toda a equipe (opção &quot;Toda a equipe&quot; → @todos).
            </p>
            {mentionCandidates.length > 0 ? (
              <MentionTextarea
                id="recado-mensagem"
                value={mensagem}
                onChange={setMensagem}
                candidates={mentionCandidates}
                placeholder="Escreva o recado para a equipe..."
                className="mt-1"
                maxLength={5000}
                disabled={isSubmitting}
              />
            ) : (
              <Textarea
                id="recado-mensagem"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Escreva o recado para a equipe..."
                className="mt-1 min-h-[120px]"
                maxLength={5000}
                required
                disabled={isSubmitting}
              />
            )}
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as RecadoPrioridade)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORIDADE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="recado-fixado"
              checked={fixado}
              onCheckedChange={(c) => setFixado(!!c)}
            />
            <Label htmlFor="recado-fixado" className="font-normal cursor-pointer">
              Fixar no topo do mural
            </Label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : mode === "create" ? "Publicar" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
