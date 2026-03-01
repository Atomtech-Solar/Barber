import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { stockService, MOVEMENT_OPTIONS, getUnitLabel } from "@/services/stock.service";
import type { StockProduct, StockMovementType } from "@/types/database.types";
import { toast } from "sonner";

interface StockMovementFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  createdBy: string;
  initialProductId?: string;
  onSubmit: () => Promise<void>;
  isLoading?: boolean;
}

export function StockMovementFormModal({
  open,
  onOpenChange,
  companyId,
  createdBy,
  initialProductId,
  onSubmit,
  isLoading,
}: StockMovementFormModalProps) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);
  const [movementType, setMovementType] = useState<StockMovementType>("entry");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [searching, setSearching] = useState(false);

  const packageQuantity = Number(selectedProduct?.package_quantity ?? 0);
  const currentQuantity = Number(selectedProduct?.current_quantity ?? 0);
  const equivalentPackages = packageQuantity > 0 ? currentQuantity / packageQuantity : 0;

  const doSearch = useCallback(async () => {
    if (!search.trim()) {
      setProducts([]);
      return;
    }
    setSearching(true);
    const { data } = await stockService.searchProducts(companyId, search.trim());
    setProducts(data);
    setSearching(false);
  }, [companyId, search]);

  useEffect(() => {
    const t = setTimeout(doSearch, 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  useEffect(() => {
    if (open && initialProductId && products.length > 0) {
      const p = products.find((x) => x.id === initialProductId);
      if (p) setSelectedProduct(p);
    }
  }, [open, initialProductId, products]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setProducts([]);
      setSelectedProduct(null);
      setMovementType("entry");
      setQuantity("");
      setReason("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = parseFloat(quantity.replace(",", "."));
    if (isNaN(qty) || qty <= 0) return;
    try {
      await stockService.createMovement(companyId, {
        product_id: selectedProduct.id,
        movement_type: movementType,
        quantity: qty,
        reason: reason.trim() || undefined,
        created_by: createdBy,
      });
      await onSubmit();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível registrar a movimentação.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Movimentação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Produto *</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="mt-1"
              autoComplete="off"
            />
            {search && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded border border-input bg-popover">
                {searching ? (
                  <p className="p-3 text-sm text-muted-foreground">Buscando...</p>
                ) : products.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Nenhum produto encontrado</p>
                ) : (
                  products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p);
                        setSearch(p.name);
                        setProducts([]);
                      }}
                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                        selectedProduct?.id === p.id ? "bg-accent" : ""
                      }`}
                    >
                      {p.name}
                      {p.category && (
                        <span className="ml-2 text-muted-foreground">· {p.category}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedProduct && (
              <div className="mt-1 text-xs text-muted-foreground space-y-1">
                <p>
                  Selecionado: {selectedProduct.name} (min: {selectedProduct.minimum_stock}{" "}
                  {getUnitLabel(selectedProduct.unit_type)})
                </p>
                <p>
                  Estoque atual: {selectedProduct.current_quantity} {getUnitLabel(selectedProduct.unit_type)}
                </p>
                {packageQuantity > 0 ? (
                  <p>
                    Equivalente: {equivalentPackages.toFixed(2)}{" "}
                    {selectedProduct.package_type?.trim() || "embalagens"}
                  </p>
                ) : null}
              </div>
            )}
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={movementType} onValueChange={(v) => setMovementType(v as StockMovementType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="qty">Quantidade *</Label>
            <Input
              id="qty"
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={
                movementType === "entry"
                  ? `Embalagens (${selectedProduct?.package_type?.trim() || "unidades"})`
                  : selectedProduct
                  ? `Quantidade em ${getUnitLabel(selectedProduct.unit_type)}`
                  : "Quantidade"
              }
              required
              className="mt-1"
            />
            {movementType === "entry" ? (
              <p className="text-xs text-muted-foreground mt-1">
                Entrada converte automaticamente embalagem para {getUnitLabel(selectedProduct?.unit_type ?? "unit")}.
              </p>
            ) : null}
            {movementType === "adjustment" ? (
              <p className="text-xs text-muted-foreground mt-1">
                Ajuste redefine o estoque atual para o valor informado.
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="reason">Motivo</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Compra, ajuste de inventário"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !selectedProduct || !quantity}>
              {isLoading ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
