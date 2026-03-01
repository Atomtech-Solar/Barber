import { supabase } from "@/lib/supabase";
import type {
  StockProduct,
  StockMovement,
  StockProductWithQuantity,
  StockUnit,
  StockMovementType,
} from "@/types/database.types";

const UNIT_LABELS: Record<StockUnit, string> = {
  unit: "un",
  ml: "ml",
  g: "g",
};

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  entry: "Entrada",
  usage: "Consumo",
  sale: "Venda",
  adjustment: "Ajuste",
};

export const UNIT_OPTIONS: { value: StockUnit; label: string }[] = [
  { value: "unit", label: "Unidade (un)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "g", label: "Gramas (g)" },
];

export const MOVEMENT_OPTIONS: { value: StockMovementType; label: string }[] = [
  { value: "entry", label: "Entrada" },
  { value: "usage", label: "Consumo" },
  { value: "sale", label: "Venda" },
  { value: "adjustment", label: "Ajuste" },
];

export function getUnitLabel(unit: StockUnit): string {
  return UNIT_LABELS[unit] ?? unit;
}

export function getMovementLabel(type: StockMovementType): string {
  return MOVEMENT_LABELS[type] ?? type;
}

export interface CreateProductParams {
  name: string;
  category?: string;
  brand?: string;
  description?: string;
  unit_type: StockUnit;
  package_quantity: number;
  package_type?: string;
  initial_packages?: number;
  minimum_stock: number;
  image_url?: string;
  cost_price?: number;
  sale_price?: number;
}

export interface CreateMovementParams {
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  reason?: string;
  created_by: string;
}

export const stockService = {
  async listProducts(companyId: string, includeInactive = false) {
    let query = supabase
      .from("stock_products")
      .select("*")
      .eq("company_id", companyId)
      .order("name");
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }
    const { data: products, error } = await query;
    if (error) return { data: [] as StockProductWithQuantity[], error };
    return { data: (products ?? []) as StockProductWithQuantity[], error: null };
  },

  async getProductById(companyId: string, id: string) {
    const { data, error } = await supabase
      .from("stock_products")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .single();
    if (error || !data) return { data: null, error };
    return { data: data as StockProduct, error: null };
  },

  async getProductWithQuantity(companyId: string, id: string) {
    const { data: product, error } = await this.getProductById(companyId, id);
    if (error || !product) return { data: null, error };
    return { data: product as StockProductWithQuantity, error: null };
  },

  async createProduct(companyId: string, params: CreateProductParams) {
    const packageQuantity = Number(params.package_quantity);
    const initialPackages = Number(params.initial_packages ?? 0);
    if (!Number.isFinite(packageQuantity) || packageQuantity <= 0) {
      throw new Error("Quantidade por embalagem deve ser maior que zero.");
    }
    if (!Number.isFinite(initialPackages) || initialPackages < 0) {
      throw new Error("Quantidade inicial comprada inválida.");
    }
    const initialQuantity = initialPackages * packageQuantity;

    const { data, error } = await supabase
      .from("stock_products")
      .insert({
        company_id: companyId,
        name: params.name,
        category: params.category || null,
        brand: params.brand || null,
        description: params.description || null,
        unit_type: params.unit_type,
        package_quantity: packageQuantity,
        package_type: params.package_type || null,
        current_quantity: initialQuantity,
        minimum_stock: params.minimum_stock,
        image_url: params.image_url || null,
        cost_price: params.cost_price ?? null,
        sale_price: params.sale_price ?? null,
      })
      .select()
      .single();
    return { data: data as StockProduct, error };
  },

  async updateProduct(
    companyId: string,
    id: string,
    params: Partial<CreateProductParams> & { is_active?: boolean }
  ) {
    const { data, error } = await supabase
      .from("stock_products")
      .update({
        ...params,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();
    return { data: data as StockProduct, error };
  },

  async deleteProduct(companyId: string, id: string) {
    const { error } = await supabase
      .from("stock_products")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);
    return { error };
  },

  async createMovement(companyId: string, params: CreateMovementParams) {
    const quantity = Number(params.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("A quantidade deve ser maior que zero.");
    }

    const { data: product, error: productError } = await supabase
      .from("stock_products")
      .select("id, current_quantity, unit_type, package_quantity")
      .eq("company_id", companyId)
      .eq("id", params.product_id)
      .single();

    if (productError || !product) {
      throw new Error(productError?.message ?? "Produto não encontrado.");
    }

    if (!["unit", "ml", "g"].includes(String(product.unit_type))) {
      throw new Error("Unidade de medida inválida para o produto selecionado.");
    }

    const current = Number(product.current_quantity ?? 0);
    const packageQuantity = Number((product as { package_quantity?: number }).package_quantity ?? 1);
    let nextQuantity = current;
    const entryQuantity = quantity * packageQuantity;
    if (params.movement_type === "entry") nextQuantity = current + entryQuantity;
    if (params.movement_type === "usage" || params.movement_type === "sale") nextQuantity = current - quantity;
    if (params.movement_type === "adjustment") nextQuantity = quantity;

    if (nextQuantity < 0) {
      throw new Error("Movimentação inválida: estoque não pode ficar negativo.");
    }

    const { error: updateError } = await supabase
      .from("stock_products")
      .update({
        current_quantity: nextQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", params.product_id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { data, error } = await supabase
      .from("stock_movements")
      .insert({
        company_id: companyId,
        product_id: params.product_id,
        movement_type: params.movement_type,
        quantity: params.movement_type === "entry" ? entryQuantity : quantity,
        reason: params.reason || null,
        created_by: params.created_by,
      })
      .select()
      .single();
    return { data: data as StockMovement, error };
  },

  async listMovementsByProduct(
    companyId: string,
    productId: string,
    opts?: { limit?: number; offset?: number }
  ) {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;
    const { data, error } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("company_id", companyId)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    return { data: (data ?? []) as StockMovement[], error };
  },

  async searchProducts(companyId: string, search: string) {
    const { data: products, error } = await supabase
      .from("stock_products")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .ilike("name", `%${search}%`)
      .order("name")
      .limit(20);
    if (error) return { data: [] as StockProduct[], error };
    return { data: (products ?? []) as StockProduct[], error };
  },
};
