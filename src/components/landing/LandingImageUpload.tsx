import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Image as ImageIcon } from "lucide-react";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface LandingImageUploadProps {
  companyId: string;
  path:
    | "hero"
    | "about"
    | "about_1"
    | "about_2"
    | "about_3"
    | "about_4"
    | "gallery_1"
    | "gallery_2"
    | "gallery_3"
    | "gallery_4"
    | "gallery_5"
    | "gallery_6"
    | "gallery_7"
    | "gallery_8";
  value: string | null;
  onChange: (url: string) => void;
  /** Quando omitido, não renderiza Label (use FormLabel no Form) */
  label?: string;
}

export function LandingImageUpload({
  companyId,
  path,
  value,
  onChange,
  label = "Imagem",
}: LandingImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Use JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Imagem deve ter no máximo 2MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `${companyId}/${path}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(storagePath);

      onChange(urlData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {label ? <Label>{label}</Label> : null}
      <div className="flex items-start gap-4">
        <div className="w-32 h-24 rounded-lg border border-border bg-muted overflow-hidden shrink-0">
          {value ? (
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon size={24} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={16} className="mr-2" />
            {uploading ? "Enviando..." : "Enviar imagem"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              className="text-destructive hover:text-destructive"
            >
              Remover
            </Button>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
