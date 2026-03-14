import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";

const ClientProfile = () => {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { currentCompany } = useTenant();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ full_name: form.full_name, phone: form.phone })
      .eq("id", user.id);
    await refreshProfile();
    setSaving(false);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold">Meu Perfil</h1>
      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            className="mt-1"
            placeholder="Seu nome completo"
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled className="mt-1" />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="mt-1"
            placeholder="(11) 99999-0000"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button className="w-full sm:w-auto sm:min-w-[160px]" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        <div className="border-t border-border pt-4 mt-6 space-y-3">
          <Link
            to={currentCompany?.slug ? `/site/${currentCompany.slug}` : "/"}
            className="block"
          >
            <Button variant="outline" className="w-full justify-center gap-2">
              <ArrowLeft size={18} />
              {currentCompany?.slug ? "Voltar para landing" : "Voltar ao início"}
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full text-destructive"
            onClick={async () => {
              const landingPath = currentCompany?.slug ? `/site/${currentCompany.slug}` : "/";
              await signOut();
              navigate(landingPath);
            }}
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;
