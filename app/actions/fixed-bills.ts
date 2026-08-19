"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FixedBillFormState = {
  error?: string;
};

export async function createFixedBill(
  _prevState: FixedBillFormState,
  formData: FormData
): Promise<FixedBillFormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const amount_raw = String(formData.get("amount") ?? "0").replace(",", ".");
  const due_date = String(formData.get("due_date") ?? "").trim() || null;
  const paid_date = String(formData.get("paid_date") ?? "").trim() || null;

  if (!name) return { error: "Informe o tipo de conta." };

  const amount = Number(amount_raw);
  if (Number.isNaN(amount) || amount < 0) return { error: "Valor inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("fixed_bills")
    .insert({ name, amount, due_date, paid_date });

  if (error) return { error: "Não foi possível criar a conta." };

  revalidatePath("/contas-fixas");
  return {};
}

export async function updateFixedBill(
  id: string,
  patch: { name?: string; amount?: number; due_date?: string | null; paid_date?: string | null }
) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("fixed_bills").update(patch).eq("id", id);
  revalidatePath("/contas-fixas");
}

export async function deleteFixedBill(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("fixed_bills").delete().eq("id", id);
  revalidatePath("/contas-fixas");
}
