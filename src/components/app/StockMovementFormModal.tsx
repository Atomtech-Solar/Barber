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
  const [costAtEntry, setCostAtEntry] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [quantityPerPackage, setQuantityPerPackage] = useState("");
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
      setCostAtEntry("");
      setSaleAmount("");
      setQuantityPerPackage("");
    }
  }, [open]);

  useEffect(() => {
    if (selectedProduct && movementType === "entry") {
      const qpp = selectedProduct.package_quantity;
      setQuantityPerPackage(Number(qpp) > 0 ? String(qpp) : "");
    }
  }, [selectedProduct?.id, movementType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = parseFloat(quantity.replace(",", "."));
    if (isNaN(qty) || qty <= 0) return;
    if (movementType === "entry") {
      const cost = parseFloat(costAtEntry.replace(",", "."));
      if (isNaN(cost) || cost < 0) {
        toast.error("Informe o custo do produto na entrada.");
        return;
      }
      const qpp = parseFloat(quantityPerPackage.replace(",", "."));
      if (isNaN(qpp) || qpp <= 0) {
        toast.error("Informe a quantidade por pacote.");
        return;
      }
    }
    if (movementType === "sale") {
      const amount = parseFloat(saleAmount.replace(",", "."));
      if (isNaN(amount) || amount < 0) {
        toast.error("Informe o valor da venda.");
        return;
      }
    }
    try {
      await stockService.createMovement(companyId, {
        product_id: selectedProduct.id,
        movement_type: movementType,
        quantity: qty,
        reason: reason.trim() || undefined,
        created_by: createdBy,
        cost_at_entry: movementType === "entry" ? parseFloat(costAtEntry.replace(",", ".")) : undefined,
        sale_amount: movementType === "sale" ? parseFloat(saleAmount.replace(",", ".")) : undefined,
        quantity_per_package:
          movementType === "entry" && quantityPerPackage.trim()
            ? parseFloat(quantityPerPackage.replace(",", "."))
            : undefined,
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
            {movementType === "usage" && (
              <p className="text-xs text-muted-foreground mt-1">Consumo não altera o financeiro.</p>
            )}
            {movementType === "adjustment" && (
              <p className="text-xs text-muted-foreground mt-1">Ajuste não altera o financeiro.</p>
            )}
          </div>
          {movementType === "entry" && (
            <div>
              <Label htmlFor="cost_at_entry">Custo do produto na entrada (R$) *</Label>
              <Input
                id="cost_at_entry"
                type="number"
                step="0.01"
                min={0}
                value={costAtEntry}
                onChange={(e) => setCostAtEntry(e.target.value)}
                placeholder="Ex: 20,00"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valor pago por unidade. Será registrado como despesa no financeiro.
              </p>
            </div>
          )}
          {movementType === "sale" && (
            <div>
              <Label htmlFor="sale_amount">Valor da venda (R$) *</Label>
              <Input
                id="sale_amount"
                type="number"
                step="0.01"
                min={0}
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                placeholder="Valor total recebido"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Será registrado como receita no financeiro.
              </p>
            </div>
          )}
          {movementType === "entry" && selectedProduct && (
            <div>
              <Label htmlFor="qty_per_package">Quantidade por pacote *</Label>
              <Input
                id="qty_per_package"
                type="number"
                step="0.01"
                min={0.01}
                value={quantityPerPackage}
                onChange={(e) => setQuantityPerPackage(e.target.value)}
                placeholder="Ex: 200"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quanto vem em cada pacote/embalagem ({getUnitLabel(selectedProduct.unit_type)}). Ex.: 200 ml por frasco.
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="qty">
              {movementType === "entry" ? "Quantidade de pacotes *" : "Quantidade *"}
            </Label>
            <Input
              id="qty"
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={
                movementType === "entry"
                  ? `Ex.: 4 frascos`
                  : selectedProduct
                  ? `Quantidade em ${getUnitLabel(selectedProduct.unit_type)}`
                  : "Quantidade"
              }
              required
              className="mt-1"
            />
            {movementType === "entry" ? (
              <p className="text-xs text-muted-foreground mt-1">
                Número de pacotes/embalagens. Estoque será: pacotes × quantidade por pacote ({getUnitLabel(selectedProduct?.unit_type ?? "unit")}).
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
            <Button
              type="submit"
              disabled={
                isLoading ||
                !selectedProduct ||
                !quantity ||
                (movementType === "entry" && (!costAtEntry.trim() || !quantityPerPackage.trim())) ||
                (movementType === "sale" && !saleAmount.trim())
              }
            >
              {isLoading ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
