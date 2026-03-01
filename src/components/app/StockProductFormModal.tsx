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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UNIT_OPTIONS } from "@/services/stock.service";
import type { StockProduct, StockUnit } from "@/types/database.types";

interface ProductFormValues {
  name: string;
  category: string;
  brand: string;
  description: string;
  unit_type: StockUnit;
  package_quantity: string;
  package_type: string;
  initial_packages: string;
  minimum_stock: string;
  image_url: string;
  cost_price: string;
  sale_price: string;
  is_active: boolean;
}

interface StockProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  product?: StockProduct | null;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  isLoading?: boolean;
}

const defaultValues: ProductFormValues = {
  name: "",
  category: "",
  brand: "",
  description: "",
  unit_type: "unit",
  package_quantity: "1",
  package_type: "",
  initial_packages: "0",
  minimum_stock: "0",
  image_url: "",
  cost_price: "",
  sale_price: "",
  is_active: true,
};

export function StockProductFormModal({
  open,
  onOpenChange,
  mode,
  product,
  onSubmit,
  isLoading,
}: StockProductFormModalProps) {
  const [values, setValues] = useState<ProductFormValues>(defaultValues);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && product) {
        setValues({
          name: product.name,
          category: product.category ?? "",
          brand: product.brand ?? "",
          description: product.description ?? "",
          unit_type: product.unit_type,
          package_quantity: String(product.package_quantity ?? 1),
          package_type: product.package_type ?? "",
          initial_packages: "0",
          minimum_stock: String(product.minimum_stock),
          image_url: product.image_url ?? "",
          cost_price: product.cost_price != null ? String(product.cost_price) : "",
          sale_price: product.sale_price != null ? String(product.sale_price) : "",
          is_active: product.is_active,
        });
      } else {
        setValues(defaultValues);
      }
    }
  }, [open, mode, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) return;
    const minStock = parseFloat(values.minimum_stock);
    if (isNaN(minStock) || minStock < 0) return;
    const packageQuantity = parseFloat(values.package_quantity);
    if (isNaN(packageQuantity) || packageQuantity <= 0) return;
    const initialPackages = parseFloat(values.initial_packages);
    if (isNaN(initialPackages) || initialPackages < 0) return;
    await onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Produto" : "Editar Produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="Nome do produto"
              required
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={values.category}
                onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
                placeholder="Ex: Cabelo"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={values.brand}
                onChange={(e) => setValues((v) => ({ ...v, brand: e.target.value }))}
                placeholder="Ex: L'Oréal"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="Descrição opcional"
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Unidade de medida *</Label>
              <Select
                value={values.unit_type}
                onValueChange={(v) => setValues((prev) => ({ ...prev, unit_type: v as StockUnit }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="package_quantity">Quantidade por embalagem *</Label>
              <Input
                id="package_quantity"
                type="number"
                step="0.01"
                min={0.01}
                value={values.package_quantity}
                onChange={(e) => setValues((v) => ({ ...v, package_quantity: e.target.value }))}
                required
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="package_type">Tipo de embalagem</Label>
              <Input
                id="package_type"
                value={values.package_type}
                onChange={(e) => setValues((v) => ({ ...v, package_type: e.target.value }))}
                placeholder="Ex: Frasco, Pote, Caixa"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="initial_packages">Quantidade inicial comprada *</Label>
              <Input
                id="initial_packages"
                type="number"
                step="0.01"
                min={0}
                value={values.initial_packages}
                onChange={(e) => setValues((v) => ({ ...v, initial_packages: e.target.value }))}
                required
                disabled={mode === "edit"}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="minimum_stock">Estoque mínimo *</Label>
            <Input
              id="minimum_stock"
              type="number"
              step="0.01"
              min={0}
              value={values.minimum_stock}
              onChange={(e) => setValues((v) => ({ ...v, minimum_stock: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="image_url">URL da imagem</Label>
            <Input
              id="image_url"
              value={values.image_url}
              onChange={(e) => setValues((v) => ({ ...v, image_url: e.target.value }))}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost_price">Preço de custo (R$)</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                min={0}
                value={values.cost_price}
                onChange={(e) => setValues((v) => ({ ...v, cost_price: e.target.value }))}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sale_price">Preço de venda (R$)</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                min={0}
                value={values.sale_price}
                onChange={(e) => setValues((v) => ({ ...v, sale_price: e.target.value }))}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
          </div>
          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <Switch
                checked={values.is_active}
                onCheckedChange={(c) => setValues((v) => ({ ...v, is_active: !!c }))}
              />
              <Label>Produto ativo</Label>
            </div>
          )}
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
