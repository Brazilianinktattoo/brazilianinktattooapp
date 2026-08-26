"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrChefePiercing } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ServiceCategory, ServiceSubcategory } from "@/lib/types/database";

export type ServiceFormState = {
  error?: string;
};

const PIERCING_SUBCATEGORIES: ServiceSubcategory[] = [
  "so_perfuracao",
  "perfuracao_joia",
  "joia_titanio",
  "joia_aco",
];

export async function createService(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const { profile } = await requireAdminOrChefePiercing();
  const isChefePiercing = profile.role === "chefe_piercing";

  const name = String(formData.get("name") ?? "").trim();
  const price_raw = String(formData.get("price") ?? "0").replace(",", ".");
  const category: ServiceCategory = isChefePiercing
    ? "piercing"
    : String(formData.get("category") ?? "tatuagem") === "piercing"
      ? "piercing"
      : "tatuagem";
  const subcategory_raw = String(formData.get("subcategory") ?? "") as ServiceSubcategory;
  const subcategory: ServiceSubcategory =
    category === "piercing" && PIERCING_SUBCATEGORIES.includes(subcategory_raw)
      ? subcategory_raw
      : "";

  if (!name) return { error: "Informe o nome do serviço." };

  const price = Number(price_raw);
  if (Number.isNaN(price) || price < 0) return { error: "Valor inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .insert({ name, category, subcategory, price });

  if (error) {
    return {
      error: error.message.includes("services_name_category_subcategory_key")
        ? "Já existe um serviço com esse nome nessa categoria."
        : "Não foi possível criar o serviço.",
    };
  }

  revalidatePath("/servicos");
  return {};
}

export async function updateServicePrice(id: string, price: number) {
  await requireAdminOrChefePiercing();
  if (Number.isNaN(price) || price < 0) return;
  const supabase = await createClient();
  // RLS trava chefe_piercing em serviços categoria='piercing'.
  await supabase.from("services").update({ price }).eq("id", id);
  revalidatePath("/servicos");
}

export async function setServiceActive(id: string, active: boolean) {
  await requireAdminOrChefePiercing();
  const supabase = await createClient();
  await supabase.from("services").update({ active }).eq("id", id);
  revalidatePath("/servicos");
}

export type DeleteServiceResult = { error?: string };

// Só apaga de verdade serviços sem histórico — se já foi usado em alguma
// comanda, o banco bloqueia (foreign key) e orientamos a desativar em vez
// de excluir, pra não perder registro financeiro.
export async function deleteService(id: string): Promise<DeleteServiceResult> {
  await requireAdminOrChefePiercing();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("services")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        error: "Esse serviço já foi usado em comandas — desative em vez de excluir.",
      };
    }
    return { error: "Não foi possível excluir o serviço." };
  }
  if (!count) {
    return { error: "Sem permissão pra excluir esse serviço." };
  }

  revalidatePath("/servicos");
  return {};
}
