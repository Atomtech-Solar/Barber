import { supabase } from "@/lib/supabase";
import type {
  StockProduct,
  StockMovement,
  StockProductWithQuantity,
  StockUnit,
  StockMovementType,
} from "@/types/database.types";

const UNIT_LABELS: Record<StockUnit, string> = {
  unidade: "un",
  ml: "ml",
  g: "g",
  frasco: "frasco",
  caixa: "caixa",
};

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  entry: "Entrada",
  usage: "Consumo",
  sale: "Venda",
  adjustment: "Ajuste",
};

export const UNIT_OPTIONS: { value: StockUnit; label: string }[] = [
  { value: "unidade", label: "Unidade" },
  { value: "ml", label: "ml" },
  { value: "g", label: "g" },
  { value: "frasco", label: "Frasco" },
  { value: "caixa", label: "Caixa" },
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

/** Retorna o delta da movimentação (já armazenado com sinal no DB) */
function getQuantityDelta(m: StockMovement): number {
  return m.quantity;
}

export interface CreateProductParams {
  name: string;
  category?: string;
  brand?: string;
  description?: string;
  unit: StockUnit;
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
  /** Para adjustment: true = adicionar, false = remover */
  adjustment_increase?: boolean;
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

    const productIds = (products ?? []).map((p) => p.id);
    if (productIds.length === 0) {
      return {
        data: (products ?? []).map((p) => ({ ...p, current_quantity: 0 })),
        error: null,
      };
    }

    const { data: movements } = await supabase
      .from("stock_movements")
      .select("*")
      .in("product_id", productIds);

    const qtyByProduct: Record<string, number> = {};
    (movements ?? []).forEach((m) => {
      const delta = getQuantityDelta(m as StockMovement);
      qtyByProduct[m.product_id] = (qtyByProduct[m.product_id] ?? 0) + delta;
    });

    const result = (products ?? []).map((p) => ({
      ...p,
      current_quantity: qtyByProduct[p.id] ?? 0,
    })) as StockProductWithQuantity[];

    return { data: result, error: null };
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
    const { data: product, error: prodErr } = await this.getProductById(companyId, id);
    if (prodErr || !product) return { data: null, error: prodErr };

    const { data: movements } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("product_id", id);

    const current_quantity = (movements ?? []).reduce(
      (acc, m) => acc + getQuantityDelta(m as StockMovement),
      0
    );

    return { data: { ...product, current_quantity } as StockProductWithQuantity, error: null };
  },

  async createProduct(companyId: string, params: CreateProductParams) {
    const { data, error } = await supabase
      .from("stock_products")
      .insert({
        company_id: companyId,
        name: params.name,
        category: params.category || null,
        brand: params.brand || null,
        description: params.description || null,
        unit: params.unit,
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

  async createMovement(companyId: string, params: CreateMovementParams) {
    let quantity = Math.abs(params.quantity);
    if (params.movement_type === "usage" || params.movement_type === "sale") {
      quantity = -quantity;
    } else if (params.movement_type === "adjustment") {
      quantity = params.adjustment_increase ? quantity : -quantity;
    }
    const { data, error } = await supabase
      .from("stock_movements")
      .insert({
        company_id: companyId,
        product_id: params.product_id,
        movement_type: params.movement_type,
        quantity,
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
