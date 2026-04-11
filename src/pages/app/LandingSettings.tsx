import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import PageContainer from "@/components/shared/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenant } from "@/contexts/TenantContext";
import { companyLandingService } from "@/services/companyLanding.service";
import { LandingImageUpload } from "@/components/landing/LandingImageUpload";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";

/** Textos e imagens padrão ao criar landing (cores neutras + placeholders) */
const LOREM_HALF =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
const LOREM_SHORT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
const PLACEHOLDER_TITLE = "Aqui você escreve um título";
const NEUTRAL_HERO = "https://placehold.co/1920x1080/e5e7eb/9ca3af?text=Imagem+de+destaque";
const NEUTRAL_IMG = (n: number) =>
  `https://placehold.co/600x600/e5e7eb/9ca3af?text=${n}`;

const ABOUT_ACCENT_OPTIONS = [
  { value: "first_word", label: "Primeira palavra" },
  { value: "last_word", label: "Última palavra" },
  { value: "all", label: "Todas as palavras" },
  { value: "none", label: "Nenhuma" },
] as const;

const schema = z.object({
  hero_title: z.string().optional(),
  hero_subtitle: z.string().optional(),
  hero_image_url: z.string().nullable().optional(),
  about_text: z.string().optional(),
  about_image_url: z.string().nullable().optional(),
  about_title: z.string().optional(),
  about_title_accent: z.enum(["first_word", "last_word", "all", "none"]).optional().nullable(),
  about_image_1_url: z.string().nullable().optional(),
  about_image_2_url: z.string().nullable().optional(),
  about_image_3_url: z.string().nullable().optional(),
  about_image_4_url: z.string().nullable().optional(),
  gallery_image_1_url: z.string().nullable().optional(),
  gallery_image_2_url: z.string().nullable().optional(),
  gallery_image_3_url: z.string().nullable().optional(),
  gallery_image_4_url: z.string().nullable().optional(),
  gallery_image_5_url: z.string().nullable().optional(),
  gallery_image_6_url: z.string().nullable().optional(),
  gallery_image_7_url: z.string().nullable().optional(),
  gallery_image_8_url: z.string().nullable().optional(),
  cta_text: z.string().optional(),
  cta_button_text: z.string().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LandingSettings() {
  const { currentCompany } = useTenant();
  const queryClient = useQueryClient();
  const companyId = currentCompany?.id ?? "";
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    mainRef.current = document.querySelector("main");
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
    return () => {
      mainRef.current = null;
    };
  }, []);

  const { data: settingsData } = useQuery({
    queryKey: ["company-landing-settings", companyId],
    queryFn: () => companyLandingService.getByCompanyId(companyId),
    enabled: !!companyId,
  });

  const settings = settingsData?.data ?? null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      hero_title: "",
      hero_subtitle: "",
      hero_image_url: null,
      about_text: "",
      about_image_url: null,
      about_title: "",
      about_title_accent: "last_word",
      about_image_1_url: null,
      about_image_2_url: null,
      about_image_3_url: null,
      about_image_4_url: null,
      gallery_image_1_url: null,
      gallery_image_2_url: null,
      gallery_image_3_url: null,
      gallery_image_4_url: null,
      gallery_image_5_url: null,
      gallery_image_6_url: null,
      gallery_image_7_url: null,
      gallery_image_8_url: null,
      cta_text: "",
      cta_button_text: "",
      primary_color: "",
      secondary_color: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        hero_title: settings.hero_title ?? "",
        hero_subtitle: settings.hero_subtitle ?? "",
        hero_image_url: settings.hero_image_url,
        about_text: settings.about_text ?? "",
        about_image_url: settings.about_image_url,
        about_title: settings.about_title ?? "",
        about_title_accent: settings.about_title_accent ?? "last_word",
        about_image_1_url: settings.about_image_1_url ?? null,
        about_image_2_url: settings.about_image_2_url ?? null,
        about_image_3_url: settings.about_image_3_url ?? null,
        about_image_4_url: settings.about_image_4_url ?? null,
        gallery_image_1_url: settings.gallery_image_1_url ?? null,
        gallery_image_2_url: settings.gallery_image_2_url ?? null,
        gallery_image_3_url: settings.gallery_image_3_url ?? null,
        gallery_image_4_url: settings.gallery_image_4_url ?? null,
        gallery_image_5_url: settings.gallery_image_5_url ?? null,
        gallery_image_6_url: settings.gallery_image_6_url ?? null,
        gallery_image_7_url: settings.gallery_image_7_url ?? null,
        gallery_image_8_url: settings.gallery_image_8_url ?? null,
        cta_text: settings.cta_text ?? "",
        cta_button_text: settings.cta_button_text ?? "",
        primary_color: settings.primary_color ?? "",
        secondary_color: settings.secondary_color ?? "",
      });
    } else if (currentCompany) {
      form.reset({
        hero_title: PLACEHOLDER_TITLE,
        hero_subtitle: LOREM_HALF,
        hero_image_url: NEUTRAL_HERO,
        about_text: LOREM_HALF,
        about_image_url: NEUTRAL_IMG(0),
        about_title: PLACEHOLDER_TITLE,
        about_title_accent: "last_word",
        about_image_1_url: NEUTRAL_IMG(1),
        about_image_2_url: NEUTRAL_IMG(2),
        about_image_3_url: NEUTRAL_IMG(3),
        about_image_4_url: NEUTRAL_IMG(4),
        gallery_image_1_url: NEUTRAL_IMG(1),
        gallery_image_2_url: NEUTRAL_IMG(2),
        gallery_image_3_url: NEUTRAL_IMG(3),
        gallery_image_4_url: NEUTRAL_IMG(4),
        gallery_image_5_url: NEUTRAL_IMG(5),
        gallery_image_6_url: NEUTRAL_IMG(6),
        gallery_image_7_url: NEUTRAL_IMG(7),
        gallery_image_8_url: NEUTRAL_IMG(8),
        cta_text: LOREM_SHORT,
        cta_button_text: "Agendar agora",
        primary_color: "",
        secondary_color: "",
      });
    }
  }, [settings, currentCompany, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await companyLandingService.upsertLandingSettings(
        companyId,
        {
          hero_title: values.hero_title || null,
          hero_subtitle: values.hero_subtitle || null,
          hero_image_url: values.hero_image_url || null,
          about_text: values.about_text || null,
          about_image_url: values.about_image_url || null,
          about_title: values.about_title || null,
          about_title_accent: values.about_title_accent || null,
          about_image_1_url: values.about_image_1_url || null,
          about_image_2_url: values.about_image_2_url || null,
          about_image_3_url: values.about_image_3_url || null,
          about_image_4_url: values.about_image_4_url || null,
          gallery_image_1_url: values.gallery_image_1_url || null,
          gallery_image_2_url: values.gallery_image_2_url || null,
          gallery_image_3_url: values.gallery_image_3_url || null,
          gallery_image_4_url: values.gallery_image_4_url || null,
          gallery_image_5_url: values.gallery_image_5_url || null,
          gallery_image_6_url: values.gallery_image_6_url || null,
          gallery_image_7_url: values.gallery_image_7_url || null,
          gallery_image_8_url: values.gallery_image_8_url || null,
          cta_text: values.cta_text || null,
          cta_button_text: values.cta_button_text || null,
          primary_color: values.primary_color || null,
          secondary_color: values.secondary_color || null,
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-landing-settings", companyId] });
      toast.success("Configurações da landing salvas.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    },
  });

  const landingUrl =
    typeof window !== "undefined" && currentCompany?.slug
      ? `${window.location.origin}/site/${currentCompany.slug}`
      : null;

  const copyLandingUrl = () => {
    if (!landingUrl) return;
    void navigator.clipboard.writeText(landingUrl);
    toast.success("Link copiado para a área de transferência.");
  };

  const openLanding = () => {
    if (landingUrl) window.open(landingUrl, "_blank", "noopener,noreferrer");
  };

  if (!currentCompany) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Selecione uma empresa para continuar.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      actions={
        <Link to="/app/settings">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Voltar
          </Button>
        </Link>
      }
    >
      <div className="space-y-8 min-w-0 max-w-full">
        {/* URL da landing */}
        <Card>
          <CardHeader>
            <CardTitle>URL da sua landing</CardTitle>
            <CardDescription>
              Compartilhe este link com seus clientes: /site/{currentCompany.slug}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                readOnly
                value={landingUrl ?? ""}
                className="font-mono text-sm bg-muted/50"
              />
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={copyLandingUrl} title="Copiar link">
                  <Copy size={18} />
                </Button>
                <Button onClick={openLanding} className="gap-2">
                  <ExternalLink size={18} />
                  Abrir landing
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
            className="space-y-8"
          >
            {/* Hero */}
            <Card>
              <CardHeader>
                <CardTitle>Hero</CardTitle>
                <CardDescription>
                  Título, subtítulo e imagem de destaque da seção principal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="hero_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder={PLACEHOLDER_TITLE} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hero_subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtítulo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={LOREM_SHORT}
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hero_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem de fundo</FormLabel>
                      <FormControl>
                        <LandingImageUpload
                          companyId={companyId}
                          path="hero"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Separator />

            {/* Sobre */}
            <Card>
              <CardHeader>
                <CardTitle>Sobre</CardTitle>
                <CardDescription>
                  Título, texto e imagens da seção sobre a empresa (4 imagens em grid 2x2)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="about_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da seção</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={PLACEHOLDER_TITLE}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="about_title_accent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destaque no título (cor primária)</FormLabel>
                      <Select
                        value={field.value ?? "last_word"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha onde aplicar a cor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ABOUT_ACCENT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="about_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto descritivo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={LOREM_HALF}
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-3">
                  <FormLabel>Imagens da galeria (posições 1 a 4)</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(
                      [
                        { name: "about_image_1_url" as const, path: "about_1" as const, label: "Imagem 1 (superior esquerda)" },
                        { name: "about_image_2_url" as const, path: "about_2" as const, label: "Imagem 2 (superior direita)" },
                        { name: "about_image_3_url" as const, path: "about_3" as const, label: "Imagem 3 (inferior esquerda)" },
                        { name: "about_image_4_url" as const, path: "about_4" as const, label: "Imagem 4 (inferior direita)" },
                      ] as const
                    ).map(({ name, path, label }) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground font-normal">
                              {label}
                            </FormLabel>
                            <FormControl>
                              <LandingImageUpload
                                companyId={companyId}
                                path={path}
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Galeria - Nossos Trabalhos */}
            <Card>
              <CardHeader>
                <CardTitle>Nossos Trabalhos (Galeria)</CardTitle>
                <CardDescription>
                  Fotos exibidas na seção "Nossos Trabalhos" da landing (8 posições em grid)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(
                    [
                      { name: "gallery_image_1_url" as const, path: "gallery_1" as const },
                      { name: "gallery_image_2_url" as const, path: "gallery_2" as const },
                      { name: "gallery_image_3_url" as const, path: "gallery_3" as const },
                      { name: "gallery_image_4_url" as const, path: "gallery_4" as const },
                      { name: "gallery_image_5_url" as const, path: "gallery_5" as const },
                      { name: "gallery_image_6_url" as const, path: "gallery_6" as const },
                      { name: "gallery_image_7_url" as const, path: "gallery_7" as const },
                      { name: "gallery_image_8_url" as const, path: "gallery_8" as const },
                    ] as const
                  ).map(({ name, path }, i) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground font-normal">
                            Trabalho {i + 1}
                          </FormLabel>
                          <FormControl>
                            <LandingImageUpload
                              companyId={companyId}
                              path={path}
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* CTA */}
            <Card>
              <CardHeader>
                <CardTitle>CTA (Call to Action)</CardTitle>
                <CardDescription>Texto e botão da seção final</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="cta_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto</FormLabel>
                      <FormControl>
                        <Input placeholder={LOREM_SHORT} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cta_button_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto do botão</FormLabel>
                      <FormControl>
                        <Input placeholder="Agendar agora" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Separator />

            {/* Tema */}
            <Card>
              <CardHeader>
                <CardTitle>Tema</CardTitle>
                <CardDescription>Cores primária e secundária da landing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor primária</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={field.value || "#6fcf97"}
                              onChange={field.onChange}
                              className="w-14 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              placeholder="#6fcf97"
                              className="flex-1 font-mono"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secondary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor secundária</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={field.value || "#4ade80"}
                              onChange={field.onChange}
                              className="w-14 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              placeholder="#4ade80"
                              className="flex-1 font-mono"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </Form>
      </div>
    </PageContainer>
  );
}
