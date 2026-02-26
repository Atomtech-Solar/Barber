import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { stockService, getMovementLabel, getUnitLabel } from "@/services/stock.service";
import type { StockProductWithQuantity } from "@/types/database.types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle, Minus, Package } from "lucide-react";

interface StockProductHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  product: StockProductWithQuantity | null;
}

function MovementIcon({ type, qty }: { type: string; qty: number }) {
  if (type === "entry" || (type === "adjustment" && qty > 0))
    return <ArrowDownCircle className="h-4 w-4 text-green-600 shrink-0" />;
  if (type === "usage" || type === "sale" || (type === "adjustment" && qty < 0))
    return <ArrowUpCircle className="h-4 w-4 text-red-600 shrink-0" />;
  return <Minus className="h-4 w-4 text-muted-foreground shrink-0" />;
}

export function StockProductHistoryModal({
  open,
  onOpenChange,
  companyId,
  product,
}: StockProductHistoryModalProps) {
  const { data: movements, isLoading } = useQuery({
    queryKey: ["stock-movements", product?.id],
    queryFn: () =>
      product ? stockService.listMovementsByProduct(companyId, product.id) : Promise.resolve({ data: [] }),
    enabled: !!open && !!product,
  });

  const list = movements?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {product?.image_url ? (
              <img
                src={product.image_url}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p>{product?.name}</p>
              <p className="text-sm font-normal text-muted-foreground">
                Estoque atual: {product?.current_quantity ?? 0}{" "}
                {product ? getUnitLabel(product.unit) : ""} · Mín: {product?.minimum_stock ?? 0}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto border-t pt-4 mt-2">
          <h4 className="text-sm font-medium mb-3">Histórico de movimentações</h4>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm"
                >
                  <MovementIcon type={m.movement_type} qty={m.quantity} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {getMovementLabel(m.movement_type)}{" "}
                      <span className={m.quantity > 0 ? "text-green-600" : "text-red-600"}>
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </span>
                    </p>
                    {m.reason && (
                      <p className="text-muted-foreground truncate">{m.reason}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(m.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
