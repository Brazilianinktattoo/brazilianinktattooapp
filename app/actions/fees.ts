"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AddFeeRateState = {
  error?: string;
  success?: boolean;
};

export async function addFeeRate(
  _prevState: AddFeeRateState,
  formData: FormData
): Promise<AddFeeRateState> {
  const { user } = await requireAdmin();

  const method = String(formData.get("method") ?? "");
  const installmentsRaw = String(formData.get("installments") ?? "1");
  const rateRaw = String(formData.get("rate_percent") ?? "").replace(",", ".");

  if (method !== "debito" && method !== "credito") {
    return { error: "Selecione a modalidade." };
  }

  const installments = method === "debito" ? 1 : Number(installmentsRaw);
  if (!Number.isInteger(installments) || installments < 1 || installments > 18) {
    return { error: "Parcelamento inválido (1 a 18x)." };
  }

  const rate_percent = Number(rateRaw);
  if (Number.isNaN(rate_percent) || rate_percent < 0) {
    return { error: "Taxa inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("card_fee_rates").insert({
    method,
    installments,
    rate_percent,
    created_by: user.id,
  });

  if (error) return { error: "Não foi possível salvar a taxa." };

  revalidatePath("/taxas");
  return { success: true };
}
