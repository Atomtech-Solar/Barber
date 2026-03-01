import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, History, Package, Trash2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { stockService, getUnitLabel } from "@/services/stock.service";
import type { StockProductWithQuantity } from "@/types/database.types";
import { StockProductFormModal } from "@/components/app/StockProductFormModal";
import { StockMovementFormModal } from "@/components/app/StockMovementFormModal";
import { StockProductHistoryModal } from "@/components/app/StockProductHistoryModal";
import { toast } from "sonner";
import type { StockUnit } from "@/types/database.types";

function getStockStatus(
  current: number,
  minimum: number
): "normal" | "low" | "critical" {
  if (current <= 0) return "critical";
  if (current <= minimum) return "low";
  return "normal";
}

function StockStatusBadge({ current, minimum }: { current: number; minimum: number }) {
  const status = getStockStatus(current, minimum);
  if (status === "normal")
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        Normal
      </span>
    );
  if (status === "low")
    return (
      <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />
        Baixo
      </Badge>
    );
  return (
    <Badge variant="destructive" className="bg-red-500/20 text-red-700 dark:text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1" />
      Crítico
    </Badge>
  );
}

const AppStock = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useTenant();
  const { user } = useAuth();
  const companyId = currentCompany?.id ?? "";
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StockProductWithQuantity | null>(null);
  const [historyProduct, setHistoryProduct] = useState<StockProductWithQuantity | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["stock-products", companyId, showInactive],
    queryFn: () => stockService.listProducts(companyId, showInactive),
    enabled: !!companyId,
  });

  const products = productsData?.data ?? [];
  const lowStockCount = products.filter(
    (p) => getStockStatus(p.current_quantity, p.minimum_stock) !== "normal"
  ).length;

  const createProductMutation = useMutation({
    mutationFn: (values: {
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
    }) =>
      stockService.createProduct(companyId, {
        name: values.name,
        category: values.category || undefined,
        brand: values.brand || undefined,
        description: values.description || undefined,
        unit_type: values.unit_type,
        package_quantity: parseFloat(values.package_quantity),
        package_type: values.package_type || undefined,
        initial_packages: parseFloat(values.initial_packages),
        minimum_stock: parseFloat(values.minimum_stock),
        image_url: values.image_url || undefined,
        cost_price: values.cost_price ? parseFloat(values.cost_price) : undefined,
        sale_price: values.sale_price ? parseFloat(values.sale_price) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      setProductModalOpen(false);
      toast.success("Produto cadastrado!");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao cadastrar."),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: {
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
      };
    }) =>
      stockService.updateProduct(companyId, id, {
        name: values.name,
        category: values.category || undefined,
        brand: values.brand || undefined,
        description: values.description || undefined,
        unit_type: values.unit_type,
        package_quantity: parseFloat(values.package_quantity),
        package_type: values.package_type || undefined,
        minimum_stock: parseFloat(values.minimum_stock),
        image_url: values.image_url || undefined,
        cost_price: values.cost_price ? parseFloat(values.cost_price) : undefined,
        sale_price: values.sale_price ? parseFloat(values.sale_price) : undefined,
        is_active: values.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      setEditingProduct(null);
      toast.success("Produto atualizado!");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao atualizar."),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => stockService.deleteProduct(companyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      setHistoryProduct(null);
      setEditingProduct(null);
      toast.success("Produto excluído!");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir."),
  });

  const requestDeleteProduct = (product: StockProductWithQuantity) => {
    const confirmed = window.confirm(
      `Deseja excluir o produto "${product.name}"? Essa ação remove também o histórico de movimentações.`
    );
    if (!confirmed) return;
    deleteProductMutation.mutate(product.id);
  };

  const handleMovementSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["stock-products"] });
    toast.success("Movimentação registrada!");
  };

  return (
    <>
      <PageContainer
        title="Estoque"
        description={
          <span className="block">
            Controle de produtos e movimentações
            {lowStockCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-700">
                {lowStockCount} com estoque baixo
              </Badge>
            )}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMovementModalOpen(true)}>
              <Plus size={16} className="mr-2" />
              Nova Movimentação
            </Button>
            <Button onClick={() => setProductModalOpen(true)}>
              <Plus size={16} className="mr-2" />
              Novo Produto
            </Button>
          </div>
        }
      >
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Mostrar inativos
            </label>
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Imagem</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estoque atual</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preços</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      Nenhum produto cadastrado. Clique em &quot;Novo Produto&quot; para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow
                      key={p.id}
                      className={`hover:bg-secondary/50 cursor-pointer ${
                        !p.is_active ? "opacity-60" : ""
                      }`}
                      onClick={() => p.is_active && setHistoryProduct(p)}
                    >
                      <TableCell>
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                        {p.brand && (
                          <p className="text-xs text-muted-foreground">{p.brand}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.category ?? "—"}
                      </TableCell>
                      <TableCell>
                        {p.current_quantity} {getUnitLabel(p.unit_type)}
                      </TableCell>
                      <TableCell>
                        {p.minimum_stock} {getUnitLabel(p.unit_type)}
                      </TableCell>
                      <TableCell>
                        <StockStatusBadge
                          current={p.current_quantity}
                          minimum={p.minimum_stock}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.cost_price != null && (
                          <span className="text-muted-foreground">
                            C: R$ {Number(p.cost_price).toFixed(2)}
                          </span>
                        )}
                        {p.cost_price != null && p.sale_price != null && " · "}
                        {p.sale_price != null && (
                          <span>V: R$ {Number(p.sale_price).toFixed(2)}</span>
                        )}
                        {p.cost_price == null && p.sale_price == null && "—"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setHistoryProduct(p)}>
                              <History size={14} className="mr-2" />
                              Histórico
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingProduct(p)}>
                              <Pencil size={14} className="mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => requestDeleteProduct(p)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 size={14} className="mr-2" />
                              Excluir
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

          <div className="md:hidden p-3 space-y-3">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : products.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum produto cadastrado. Clique em &quot;Novo Produto&quot; para começar.
              </p>
            ) : (
              products.map((p) => (
                <div
                  key={`${p.id}-mobile`}
                  className={`rounded-xl border border-border p-3 space-y-3 ${!p.is_active ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-12 w-12 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[p.brand, p.category].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setHistoryProduct(p)}>
                          <History size={14} className="mr-2" />
                          Histórico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingProduct(p)}>
                          <Pencil size={14} className="mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => requestDeleteProduct(p)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Estoque</p>
                      <p className="font-medium">
                        {p.current_quantity} {getUnitLabel(p.unit_type)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Mínimo</p>
                      <p className="font-medium">
                        {p.minimum_stock} {getUnitLabel(p.unit_type)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <StockStatusBadge current={p.current_quantity} minimum={p.minimum_stock} />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!p.is_active}
                      onClick={() => setHistoryProduct(p)}
                    >
                      Histórico
                    </Button>
                  </div>

                  <div className="text-sm">
                    {p.cost_price != null && (
                      <span className="text-muted-foreground">
                        C: R$ {Number(p.cost_price).toFixed(2)}
                      </span>
                    )}
                    {p.cost_price != null && p.sale_price != null && " · "}
                    {p.sale_price != null && (
                      <span>V: R$ {Number(p.sale_price).toFixed(2)}</span>
                    )}
                    {p.cost_price == null && p.sale_price == null && "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PageContainer>

      <StockProductFormModal
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        mode="create"
        onSubmit={(v) => createProductMutation.mutateAsync(v)}
        isLoading={createProductMutation.isPending}
      />

      <StockProductFormModal
        open={!!editingProduct}
        onOpenChange={(o) => !o && setEditingProduct(null)}
        mode="edit"
        product={editingProduct}
        onSubmit={(v) =>
          editingProduct &&
          updateProductMutation.mutateAsync({ id: editingProduct.id, values: v })
        }
        isLoading={updateProductMutation.isPending}
      />

      <StockMovementFormModal
        open={movementModalOpen}
        onOpenChange={setMovementModalOpen}
        companyId={companyId}
        createdBy={user?.id ?? ""}
        onSubmit={handleMovementSaved}
      />

      <StockProductHistoryModal
        open={!!historyProduct}
        onOpenChange={(o) => !o && setHistoryProduct(null)}
        companyId={companyId}
        product={historyProduct}
      />
    </>
  );
};

export default AppStock;
