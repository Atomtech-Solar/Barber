import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { mockServices, mockProducts } from "@/data/mockData";
import { ShoppingCart } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const AppSales = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  return (
    <PageContainer>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold">Serviços</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mockServices.map((s) => (
              <button key={s.id} onClick={() => addToCart(s)} className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-primary font-bold mt-1">R$ {s.price}</p>
              </button>
            ))}
          </div>
          <h3 className="font-semibold">Produtos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mockProducts.map((p) => (
              <button key={p.id} onClick={() => addToCart(p)} className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-primary font-bold mt-1">R$ {p.price}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart size={18} /> Carrinho
          </h3>
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum item</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">x{item.qty}</p>
                  </div>
                  <span className="font-medium">R$ {item.price * item.qty}</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-lg text-primary">R$ {total}</span>
              </div>
              <Button className="w-full">Finalizar Venda</Button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default AppSales;
