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
  const [adjustmentIncrease, setAdjustmentIncrease] = useState(true);
  const [searching, setSearching] = useState(false);

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
      setAdjustmentIncrease(true);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return;
    await stockService.createMovement(companyId, {
      product_id: selectedProduct.id,
      movement_type: movementType,
      quantity: qty,
      reason: reason.trim() || undefined,
      created_by: createdBy,
      adjustment_increase: movementType === "adjustment" ? adjustmentIncrease : undefined,
    });
    await onSubmit();
    onOpenChange(false);
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
              <p className="mt-1 text-xs text-muted-foreground">
                Selecionado: {selectedProduct.name} (min: {selectedProduct.minimum_stock}{" "}
                {getUnitLabel(selectedProduct.unit)})
              </p>
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
          {movementType === "adjustment" && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adj-direction"
                  checked={adjustmentIncrease}
                  onChange={() => setAdjustmentIncrease(true)}
                />
                <span className="text-sm">Adicionar ao estoque</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adj-direction"
                  checked={!adjustmentIncrease}
                  onChange={() => setAdjustmentIncrease(false)}
                />
                <span className="text-sm">Remover do estoque</span>
              </label>
            </div>
          )}
          <div>
            <Label htmlFor="qty">Quantidade *</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              required
              className="mt-1"
            />
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
