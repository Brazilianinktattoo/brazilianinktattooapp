"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrChefePiercing } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type JewelryFormState = {
  error?: string;
};

function parseMoney(raw: FormDataEntryValue | null): number {
  return Number(String(raw ?? "0").replace(",", "."));
}

export async function createJewelryCatalogItem(
  _prevState: JewelryFormState,
  formData: FormData
): Promise<JewelryFormState> {
  await requireAdminOrChefePiercing();

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const material = String(formData.get("material") ?? "").trim();
  const price_aplicacao = parseMoney(formData.get("price_aplicacao"));
  const price_troca = parseMoney(formData.get("price_troca"));
  const price_venda = parseMoney(formData.get("price_venda"));
  const cost_value = parseMoney(formData.get("cost_value"));

  if (!name) return { error: "Informe o tipo da jóia." };
  for (const v of [price_aplicacao, price_troca, price_venda, cost_value]) {
    if (Number.isNaN(v) || v < 0) return { error: "Valores inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jewelry_catalog").insert({
    name,
    code,
    category,
    material,
    price_aplicacao,
    price_troca,
    price_venda,
    cost_value,
  });

  if (error) return { error: "Não foi possível cadastrar a jóia." };

  revalidatePath("/joias");
  return {};
}

export async function updateJewelryFields(
  id: string,
  fields: Partial<{
    code: string;
    barcode: string;
    category: string;
    material: string;
    cost_value: number;
    stock_quantity: number;
    price_aplicacao: number;
    price_troca: number;
    price_venda: number;
  }>
) {
  await requireAdminOrChefePiercing();
  for (const [key, v] of Object.entries(fields)) {
    if (typeof v === "number" && (Number.isNaN(v) || v < 0)) return;
    void key;
  }
  const supabase = await createClient();
  await supabase.from("jewelry_catalog").update(fields).eq("id", id);
  revalidatePath("/joias");
}

export async function setJewelryActive(id: string, active: boolean) {
  await requireAdminOrChefePiercing();
  const supabase = await createClient();
  await supabase.from("jewelry_catalog").update({ active }).eq("id", id);
  revalidatePath("/joias");
}
