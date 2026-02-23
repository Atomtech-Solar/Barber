import { supabase } from "@/lib/supabase";
import type { Company } from "@/types/database.types";

export interface CreateCompanyParams {
  name: string;
  slug: string;
  logo?: string;
  slogan?: string;
  phone?: string;
  email?: string;
}

export interface UpdateCompanyParams {
  name?: string;
  slug?: string;
  logo?: string;
  slogan?: string;
  phone?: string;
  email?: string;
  status?: "active" | "blocked";
}

export const companyService = {
  async list() {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");
    return { data: (data ?? []) as Company[], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();
    return { data: data as Company | null, error };
  },

  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .single();
    return { data: data as Company | null, error };
  },

  async create(params: CreateCompanyParams) {
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: params.name,
        slug: params.slug.toLowerCase().replace(/\s+/g, "-"),
        logo: params.logo ?? null,
        slogan: params.slogan ?? null,
        phone: params.phone ?? null,
        email: params.email ?? null,
      })
      .select()
      .single();
    return { data: data as Company | null, error };
  },

  async update(id: string, params: UpdateCompanyParams) {
    const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() };
    if (params.slug) updates.slug = params.slug.toLowerCase().replace(/\s+/g, "-");
    const { data, error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    return { data: data as Company | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    return { error };
  },
};
