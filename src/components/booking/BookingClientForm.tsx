import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { maskPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";

export interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  wantsAccount: boolean;
  password: string;
}

interface BookingClientFormProps {
  value: ClientFormData;
  onChange: (data: ClientFormData) => void;
  isLoggedIn?: boolean;
  className?: string;
}

export function BookingClientForm({
  value,
  onChange,
  isLoggedIn = false,
  className,
}: BookingClientFormProps) {
  const update = (partial: Partial<ClientFormData>) =>
    onChange({ ...value, ...partial });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor="client-name">Nome *</Label>
        <Input
          id="client-name"
          placeholder="Seu nome completo"
          value={value.name}
          onChange={(e) => update({ name: e.target.value })}
          className="h-12 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client-phone">Telefone *</Label>
        <Input
          id="client-phone"
          type="tel"
          placeholder="(11) 99999-9999"
          value={value.phone}
          onChange={(e) => update({ phone: maskPhone(e.target.value) })}
          className="h-12 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client-email">Email</Label>
        <Input
          id="client-email"
          type="email"
          placeholder="seu@email.com"
          value={value.email}
          onChange={(e) => update({ email: e.target.value })}
          className="h-12 text-base"
        />
      </div>

      {!isLoggedIn && (
        <>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="wants-account"
              checked={value.wantsAccount}
              onCheckedChange={(checked) =>
                update({ wantsAccount: !!checked, password: "" })
              }
            />
            <Label
              htmlFor="wants-account"
              className="text-sm font-normal cursor-pointer"
            >
              Quero criar uma conta para gerenciar meus agendamentos
            </Label>
          </div>
          {value.wantsAccount && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="client-password">Senha *</Label>
              <Input
                id="client-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={value.password}
                onChange={(e) => update({ password: e.target.value })}
                className="h-12 text-base"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
