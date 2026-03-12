import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export function SiteNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <Building2 className="text-muted-foreground" size={32} />
        </div>
        <h1 className="text-2xl font-bold">Empresa não encontrada</h1>
        <p className="text-muted-foreground">
          A página que você está procurando não existe ou a empresa pode ter sido
          removida.
        </p>
        <Link to="/">
          <Button variant="outline">Voltar ao início</Button>
        </Link>
      </div>
    </div>
  );
}
