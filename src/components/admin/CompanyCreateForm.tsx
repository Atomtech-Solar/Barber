import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCnpj, maskPhone, isValidCnpj } from "@/lib/masks";
import { supabase } from "@/lib/supabase";
import { ImagePlus, Link2, Loader2 } from "lucide-react";

const schema = z
  .object({
    name: z.string().min(1, "Nome da empresa é obrigatório"),
    cnpj: z.string().optional(),
    email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
    owner_name: z.string().min(1, "Nome do responsável é obrigatório"),
    owner_phone: z.string().min(14, "Telefone inválido"),
    slogan: z.string().max(120, "Máximo 120 caracteres").optional(),
    logo_url: z
      .string()
      .optional()
      .refine((v) => !v || /^https?:\/\/.+/.test(v), { message: "URL inválida" }),
  })
  .refine(
    (data) => !data.cnpj || isValidCnpj(data.cnpj),
    { message: "CNPJ inválido", path: ["cnpj"] }
  );

export type CompanyCreateFormValues = z.infer<typeof schema>;

interface CompanyCreateFormProps {
  onSubmit: (values: CompanyCreateFormValues & { logo_url?: string }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function CompanyCreateForm({ onSubmit, onCancel, isLoading }: CompanyCreateFormProps) {
  const [logoSource, setLogoSource] = useState<"url" | "upload">("url");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<CompanyCreateFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      cnpj: "",
      email: "",
      owner_name: "",
      owner_phone: "",
      slogan: "",
      logo_url: "",
    },
  });

  const watchedLogoUrl = watch("logo_url");
  const watchedCnpj = watch("cnpj");
  const watchedOwnerPhone = watch("owner_phone");

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("cnpj", maskCnpj(e.target.value), { shouldValidate: true });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("owner_phone", maskPhone(e.target.value), { shouldValidate: true });
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setValue("logo_url", url, { shouldValidate: true });
    setLogoPreview(url || null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Formato inválido. Use JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Imagem deve ter no máximo 2MB.");
      return;
    }

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(data.path);

      setValue("logo_url", urlData.publicUrl, { shouldValidate: true });
      setLogoPreview(urlData.publicUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Erro ao enviar imagem. Use URL como alternativa."
      );
    }
    e.target.value = "";
  };

  const effectivePreview = logoPreview ?? (watchedLogoUrl || null);

  const onFormSubmit = handleSubmit(async (values) => {
    await onSubmit({
      ...values,
      logo_url: values.logo_url || undefined,
    });
  });

  return (
    <form onSubmit={onFormSubmit} className="space-y-5">
      {/* Logo */}
      <div className="space-y-2">
        <Label>Foto da empresa</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={logoSource === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => setLogoSource("url")}
          >
            <Link2 size={14} className="mr-1" />
            URL
          </Button>
          <Button
            type="button"
            variant={logoSource === "upload" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setLogoSource("upload");
              fileInputRef.current?.click();
            }}
          >
            <ImagePlus size={14} className="mr-1" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        {logoSource === "url" && (
          <Input
            placeholder="https://exemplo.com/logo.png"
            {...register("logo_url")}
            onChange={(e) => {
              register("logo_url").onChange(e);
              handleLogoUrlChange(e);
            }}
          />
        )}
        {errors.logo_url && (
          <p className="text-sm text-destructive">{errors.logo_url.message}</p>
        )}
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        {effectivePreview && (
          <div className="mt-2 w-20 h-20 rounded-lg border border-border overflow-hidden bg-muted">
            <img
              src={effectivePreview}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setLogoPreview(null)}
            />
          </div>
        )}
      </div>

      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome da empresa *</Label>
        <Input
          id="name"
          placeholder="Barbearia Premium"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* CNPJ */}
      <div className="space-y-2">
        <Label htmlFor="cnpj">CNPJ (opcional)</Label>
        <Input
          id="cnpj"
          placeholder="00.000.000/0000-00"
          value={watchedCnpj ?? ""}
          onChange={handleCnpjChange}
        />
        {errors.cnpj && (
          <p className="text-sm text-destructive">{errors.cnpj.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email da empresa *</Label>
        <Input
          id="email"
          type="email"
          placeholder="contato@empresa.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Responsável */}
      <div className="space-y-2">
        <Label htmlFor="owner_name">Responsável pela empresa *</Label>
        <Input
          id="owner_name"
          placeholder="João Silva"
          {...register("owner_name")}
        />
        {errors.owner_name && (
          <p className="text-sm text-destructive">{errors.owner_name.message}</p>
        )}
      </div>

      {/* Telefone do responsável */}
      <div className="space-y-2">
        <Label htmlFor="owner_phone">Telefone do responsável *</Label>
        <Input
          id="owner_phone"
          placeholder="(11) 99999-0000"
          value={watchedOwnerPhone ?? ""}
          onChange={handlePhoneChange}
        />
        {errors.owner_phone && (
          <p className="text-sm text-destructive">{errors.owner_phone.message}</p>
        )}
      </div>

      {/* Slogan */}
      <div className="space-y-2">
        <Label htmlFor="slogan">Slogan (opcional, máx. 120 caracteres)</Label>
        <Input
          id="slogan"
          placeholder="Seu estilo, nossa arte"
          maxLength={120}
          {...register("slogan")}
        />
        {errors.slogan && (
          <p className="text-sm text-destructive">{errors.slogan.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={!isValid || isLoading}>
          {isLoading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar empresa"
          )}
        </Button>
      </div>
    </form>
  );
}
