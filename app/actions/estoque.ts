"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ProductFormState = {
  error?: string;
};

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const min_stock_raw = String(formData.get("min_stock") ?? "0").replace(",", ".");

  if (!name || !code) return { error: "Preencha nome e código." };

  const min_stock = Number(min_stock_raw);
  if (Number.isNaN(min_stock) || min_stock < 0) {
    return { error: "Estoque mínimo inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    name,
    code,
    min_stock,
  });

  if (error) {
    return {
      error: error.message.includes("products_code_key")
        ? "Já existe um produto com esse código."
        : "Não foi possível criar o produto.",
    };
  }

  revalidatePath("/estoque");
  return {};
}

export async function updateProductMinStock(id: string, minStock: number) {
  await requireAdmin();
  if (Number.isNaN(minStock) || minStock < 0) return;
  const supabase = await createClient();
  await supabase.from("products").update({ min_stock: minStock }).eq("id", id);
  revalidatePath("/estoque");
}

export async function setProductActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("products").update({ active }).eq("id", id);
  revalidatePath("/estoque");
}

export type StockEntryFormState = {
  error?: string;
  success?: boolean;
};

export async function createStockEntry(
  _prevState: StockEntryFormState,
  formData: FormData
): Promise<StockEntryFormState> {
  const { user } = await requireAdmin();

  const product_id = String(formData.get("product_id") ?? "");
  const quantity_raw = String(formData.get("quantity") ?? "").replace(",", ".");
  const note = String(formData.get("note") ?? "").trim();

  if (!product_id) return { error: "Selecione o produto." };

  const quantity = Number(quantity_raw);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return { error: "Informe uma quantidade válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stock_entries").insert({
    product_id,
    quantity,
    note,
    created_by: user.id,
  });

  if (error) return { error: "Não foi possível registrar a entrada." };

  revalidatePath("/estoque");
  return { success: true };
}
