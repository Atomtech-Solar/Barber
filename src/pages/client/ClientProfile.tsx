import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const ClientProfile = () => {
  const { profile, user, signOut, refreshProfile } = useAuth();
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
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>
      <div className="space-y-4">
        <div>
          <Label>Nome</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled className="mt-1" />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="mt-1"
          />
        </div>
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
        <Button variant="ghost" className="w-full text-destructive" onClick={() => signOut()}>
          Sair da Conta
        </Button>
      </div>
    </div>
  );
};

export default ClientProfile;
